// Deploy the Wisp Dollar (WISP) CEP-18 token — an Odra fungible token exposing the
// EIP-712 `transfer_with_authorization` entry point required by x402. The full
// initial supply is minted to the installing account (this wallet), funding the
// buyer for end-to-end x402 settlement.
//
// Run:  npx tsx scripts/deploy-token.ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import casperSdk from 'casper-js-sdk';
import { loadConfig } from '../src/config.js';
import { deriveAccount, getWcsprBalanceAtomic, atomicToDecimal } from '../src/casper.js';

const { SessionBuilder, Args, CLValue, RpcClient, HttpHandler } = casperSdk as any;

const here = dirname(fileURLToPath(import.meta.url));
const cfg = loadConfig();
const account = deriveAccount(cfg);

const TOKEN = {
  name: process.env.WISP_TOKEN_NAME ?? 'Wisp Dollar',
  symbol: process.env.WISP_TOKEN_SYMBOL ?? 'WISP',
  decimals: 9,
  initialSupply: process.env.WISP_TOKEN_SUPPLY ?? '1000000000000000', // 1,000,000 WISP at 9 dp
  packageKey: 'WISP_package_hash',
};
const NODE_URL = process.env.CASPER_DEPLOY_NODE ?? 'https://node.testnet.casper.network/rpc';

async function csprCloudTokens() {
  const res = await fetch(`${cfg.csprCloudRest}/accounts/${account.accountHash}/ft-token-ownership?includes=contract_package`, {
    headers: { accept: 'application/json', authorization: cfg.csprCloudKey },
  });
  if (!res.ok) return [];
  const j = (await res.json()) as { data?: Array<{ balance: string; contract_package_hash: string; contract_package?: { symbol?: string; name?: string } }> };
  return j.data ?? [];
}

async function main() {
  console.log('Deployer account :', account.accountAddress);
  console.log('Public key       :', account.publicKeyHex);
  console.log('Node             :', NODE_URL);
  console.log('Token            :', `${TOKEN.name} (${TOKEN.symbol}), ${TOKEN.decimals} dp, supply ${TOKEN.initialSupply}`);
  console.log('Chain (EIP-712)  :', cfg.network, '\n');

  // Already deployed? (token present in this account's holdings)
  const existing = (await csprCloudTokens()).find((t) => t.contract_package?.symbol === TOKEN.symbol);
  if (existing) {
    console.log('✅ Token already deployed.');
    console.log('   package hash :', existing.contract_package_hash);
    console.log('   balance      :', atomicToDecimal(existing.balance, TOKEN.decimals), TOKEN.symbol);
    return;
  }

  const wasm = readFileSync(resolve(here, '../assets/Cep18X402.wasm'));
  const args = Args.fromMap({
    name: CLValue.newCLString(TOKEN.name),
    symbol: CLValue.newCLString(TOKEN.symbol),
    decimals: CLValue.newCLUint8(TOKEN.decimals),
    initial_supply: CLValue.newCLUInt256(TOKEN.initialSupply),
    chain_id: CLValue.newCLString(cfg.network), // EIP-712 domain chainId — must equal x402 network
    odra_cfg_is_upgradable: CLValue.newCLValueBool(true),
    odra_cfg_is_upgrade: CLValue.newCLValueBool(false),
    odra_cfg_allow_key_override: CLValue.newCLValueBool(true),
    odra_cfg_package_hash_key_name: CLValue.newCLString(TOKEN.packageKey),
  });

  const tx = new SessionBuilder()
    .from(account.privateKey.publicKey)
    .wasm(new Uint8Array(wasm))
    .installOrUpgrade()
    .runtimeArgs(args)
    .chainName(cfg.chainName)
    .payment(800_000_000_000) // 800 CSPR for contract install
    .build();
  tx.sign(account.privateKey);

  const txHash = tx.hash?.toHex?.() ?? tx.getTransactionHash?.()?.toHex?.() ?? '(unknown)';
  console.log('Submitting install transaction:', txHash);

  const rpc = new RpcClient(new HttpHandler(NODE_URL));
  await rpc.putTransaction(tx);
  console.log('Submitted. Waiting for execution + token to appear…\n');

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 8000));
    const found = (await csprCloudTokens()).find((t) => t.contract_package?.symbol === TOKEN.symbol);
    if (found) {
      console.log('\n✅ Token deployed and minted.');
      console.log('   package hash :', found.contract_package_hash);
      console.log('   balance      :', atomicToDecimal(found.balance, TOKEN.decimals), TOKEN.symbol);
      console.log('\nNext: set in .env →');
      console.log(`   WISP_ASSET_PACKAGE=${found.contract_package_hash}`);
      console.log(`   WISP_ASSET_NAME=${TOKEN.name}`);
      console.log(`   WISP_ASSET_SYMBOL=${TOKEN.symbol}`);
      return;
    }
    process.stdout.write(`   …polling (${(i + 1) * 8}s)\r`);
  }
  console.log('\n⚠️  Token not visible yet via CSPR.cloud — the deploy may still be finalizing. Re-run to check.');
}

main().catch((e) => {
  console.error('\nDEPLOY ERROR:', e instanceof Error ? e.message : e);
  process.exit(1);
});
