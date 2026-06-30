import casperSdk from 'casper-js-sdk';
import { decimalToAtomic } from './casper.js';
import type { WalletConfig } from './config.js';
import type { Account } from './casper.js';

const { NativeTransferBuilder, ContractCallBuilder, Args, CLValue, PublicKey, Key, RpcClient, HttpHandler } =
  casperSdk as any;

function deployNode(): string {
  return process.env.CASPER_DEPLOY_NODE ?? 'https://node.testnet.casper.network/rpc';
}
function rpc() {
  return new RpcClient(new HttpHandler(deployNode()));
}
function hashOf(tx: any): string {
  return tx.hash?.toHex?.() ?? tx.getTransactionHash?.()?.toHex?.() ?? '';
}

/** Normalize an x402 address ("00"+64hex), raw 64-hex hash, or "account-hash-…" to raw 64 hex. */
export function toRawAccountHash(value: string): string {
  let raw = value.replace(/^account-hash-/i, '');
  if (raw.length === 66 && raw.startsWith('00')) raw = raw.slice(2);
  return raw.toLowerCase();
}

/** Send native CSPR to a recipient public key. */
export async function transferCspr(cfg: WalletConfig, account: Account, toPublicKeyHex: string, amountCspr: string) {
  const tx = new NativeTransferBuilder()
    .from(account.privateKey.publicKey)
    .target(PublicKey.fromHex(toPublicKeyHex))
    .amount(decimalToAtomic(amountCspr, 9))
    .id(Date.now())
    .chainName(cfg.chainName)
    .payment(100_000_000)
    .build();
  tx.sign(account.privateKey);
  await rpc().putTransaction(tx);
  return hashOf(tx);
}

/** Send the WISP CEP-18 token to a recipient account hash. */
export async function transferToken(cfg: WalletConfig, account: Account, toAccountHash: string, amountDecimal: string) {
  const raw = toRawAccountHash(toAccountHash);
  const recipientKey = Key.newKey(`account-hash-${raw}`);
  const args = Args.fromMap({
    recipient: CLValue.newCLKey(recipientKey),
    amount: CLValue.newCLUInt256(decimalToAtomic(amountDecimal, cfg.asset.decimals)),
  });
  const tx = new ContractCallBuilder()
    .from(account.privateKey.publicKey)
    .byPackageHash(cfg.asset.package)
    .entryPoint('transfer')
    .runtimeArgs(args)
    .chainName(cfg.chainName)
    .payment(2_500_000_000)
    .build();
  tx.sign(account.privateKey);
  await rpc().putTransaction(tx);
  return hashOf(tx);
}
