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
  canPay: boolean;
};

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
    canPay: mnemonic.length > 0,
  };
}
