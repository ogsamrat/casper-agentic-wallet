import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Load the repo-root .env (shared) first, then a local wallet/.env override.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../.env') });
loadEnv();

export type WalletConfig = {
  mnemonic: string;
  keyAlgo: 'secp256k1' | 'ed25519';
  accountIndex: number;
  network: string;          // CAIP-2, e.g. casper:casper-test
  chainName: string;        // e.g. casper-test
  nodeUrl: string;
  csprCloudRest: string;
  csprCloudKey: string;
  facilitatorUrl: string;
  facilitatorKey: string;
  asset: { package: string; name: string; symbol: string; version: string; decimals: number };
  budget: { maxPerCall: string; maxPerDay: string };
  base: BaseConfig | null;
  canPay: boolean;
};

export type BaseConfig = {
  privateKey: string;
  network: string;     // CAIP-2, e.g. eip155:84532
  rpcUrl: string;
  usdc: string;
  facilitatorUrl: string;
  feePct: number;      // marketplace fee on Base bazaar APIs
};

/** Decimals + display symbol for a payment network's asset. */
export function networkAsset(network: string, cfg: WalletConfig): { symbol: string; decimals: number } {
  if (network.startsWith('eip155')) return { symbol: 'USDC', decimals: 6 };
  return { symbol: cfg.asset.symbol, decimals: cfg.asset.decimals };
}

export function loadConfig(): WalletConfig {
  const mnemonic = (process.env.WISP_MNEMONIC ?? '').trim();
  return {
    mnemonic,
    keyAlgo: (process.env.WISP_KEY_ALGO as 'secp256k1' | 'ed25519') ?? 'secp256k1',
    accountIndex: Number(process.env.WISP_ACCOUNT_INDEX ?? 0),
    network: process.env.CASPER_NETWORK ?? 'casper:casper-test',
    chainName: process.env.CASPER_CHAIN_NAME ?? 'casper-test',
    nodeUrl: process.env.CASPER_NODE_URL ?? 'https://node.testnet.cspr.cloud/rpc',
    csprCloudRest: (process.env.CSPR_CLOUD_REST_URL ?? 'https://api.testnet.cspr.cloud').replace(/\/$/, ''),
    csprCloudKey: process.env.CSPR_CLOUD_API_KEY ?? '',
    facilitatorUrl: process.env.X402_FACILITATOR_URL ?? 'https://x402-facilitator.cspr.cloud',
    facilitatorKey: process.env.X402_FACILITATOR_API_KEY ?? process.env.CSPR_CLOUD_API_KEY ?? '',
    asset: {
      package: (process.env.WISP_ASSET_PACKAGE ?? '').replace(/^hash-/, ''),
      name: process.env.WISP_ASSET_NAME ?? 'Wrapped CSPR',
      symbol: process.env.WISP_ASSET_SYMBOL ?? 'WCSPR',
      version: process.env.WISP_ASSET_VERSION ?? '1',
      decimals: Number(process.env.WISP_ASSET_DECIMALS ?? 9),
    },
    budget: {
      maxPerCall: process.env.WISP_MAX_PER_CALL ?? '0.10',
      maxPerDay: process.env.WISP_MAX_PER_DAY ?? '20.00',
    },
    base: process.env.BASE_PRIVATE_KEY
      ? {
          privateKey: process.env.BASE_PRIVATE_KEY,
          network: process.env.BASE_NETWORK ?? 'eip155:84532',
          rpcUrl: process.env.BASE_RPC_URL ?? 'https://sepolia.base.org',
          usdc: process.env.BASE_USDC_CONTRACT ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          facilitatorUrl: process.env.BASE_FACILITATOR_URL ?? 'https://x402.org/facilitator',
          feePct: Number(process.env.BASE_BAZAAR_FEE_PCT ?? 5),
        }
      : null,
    canPay: mnemonic.length > 0,
  };
}
