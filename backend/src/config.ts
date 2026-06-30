import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../.env') });
loadEnv();

export type HubConfig = {
  treasuryMnemonic: string;
  keyAlgo: 'secp256k1';
  accountIndex: number;
  network: string;
  csprCloudRest: string;
  csprCloudKey: string;
  asset: { package: string; name: string; symbol: string; version: string; decimals: number };
  adminSecret: string;
  apiUrl: string;
  port: number;
};

export function loadHubConfig(): HubConfig {
  return {
    treasuryMnemonic: (process.env.WISP_MNEMONIC ?? '').trim(),
    keyAlgo: 'secp256k1',
    accountIndex: Number(process.env.WISP_ACCOUNT_INDEX ?? 0),
    network: process.env.CASPER_NETWORK ?? 'casper:casper-test',
    csprCloudRest: (process.env.CSPR_CLOUD_REST_URL ?? 'https://api.testnet.cspr.cloud').replace(/\/$/, ''),
    csprCloudKey: process.env.CSPR_CLOUD_API_KEY ?? '',
    asset: {
      package: (process.env.WISP_ASSET_PACKAGE ?? '').replace(/^hash-/, ''),
      name: process.env.WISP_ASSET_NAME ?? 'Wisp Dollar',
      symbol: process.env.WISP_ASSET_SYMBOL ?? 'WISP',
      version: process.env.WISP_ASSET_VERSION ?? '1',
      decimals: Number(process.env.WISP_ASSET_DECIMALS ?? 9),
    },
    adminSecret: process.env.WISP_ADMIN_SECRET ?? '',
    apiUrl: process.env.WISP_API_URL ?? 'https://casper-api.vercel.app',
    port: Number(process.env.PORT ?? 4055),
  };
}
