import casperSdk from 'casper-js-sdk';
import { mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { HDKey } from '@scure/bip32';
import { toClientCasperSigner, type ClientCasperSigner } from '@make-software/casper-x402';
import type { WalletConfig } from './config.js';

// casper-js-sdk ships as CJS; the default import is the real namespace (438 symbols).
const { PrivateKey, KeyAlgorithm } = casperSdk as unknown as {
  PrivateKey: { fromHex(hex: string, algo: number): any };
  KeyAlgorithm: { ED25519: number; SECP256K1: number };
};

export type Account = {
  privateKey: any;
  signer: ClientCasperSigner;
  publicKeyHex: string;   // full Casper public key hex, e.g. 0202...
  accountAddress: string; // 66-char 00-prefixed account-hash address
  accountHash: string;    // raw 64-char account hash (no prefix)
};

/**
 * Derive a Casper account from a BIP39 mnemonic.
 * secp256k1 uses standard BIP32 (Casper Wallet path m/44'/506'/0'/0/<index>).
 */
export function deriveAccount(cfg: WalletConfig): Account {
  if (!cfg.mnemonic) throw new Error('WISP_MNEMONIC is not set');
  if (!validateMnemonic(cfg.mnemonic)) throw new Error('WISP_MNEMONIC is not a valid BIP39 mnemonic');
  if (cfg.keyAlgo !== 'secp256k1') {
    throw new Error('This build derives secp256k1 keys only — set WISP_KEY_ALGO=secp256k1.');
  }
  const seed = mnemonicToSeedSync(cfg.mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(`m/44'/506'/0'/0/${cfg.accountIndex}`);
  if (!child.privateKey) throw new Error('key derivation failed');
  const privHex = Buffer.from(child.privateKey).toString('hex');
  const privateKey = PrivateKey.fromHex(privHex, KeyAlgorithm.SECP256K1);
  const signer = toClientCasperSigner(privateKey);
  const accountAddress = signer.accountAddress();
  return {
    privateKey,
    signer,
    publicKeyHex: signer.publicKey(),
    accountAddress,
    accountHash: accountAddress.replace(/^00/, ''),
  };
}

// ── CSPR.cloud reads ────────────────────────────────────────────────────────

async function cloud<T>(cfg: WalletConfig, path: string): Promise<T> {
  const res = await fetch(`${cfg.csprCloudRest}${path}`, {
    headers: { accept: 'application/json', ...(cfg.csprCloudKey ? { authorization: cfg.csprCloudKey } : {}) },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`CSPR.cloud ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

/** Liquid CSPR balance of the main purse, in motes (1 CSPR = 1e9 motes). */
export async function getCsprBalanceMotes(cfg: WalletConfig, account: Account): Promise<string> {
  try {
    const r = await cloud<{ data: { balance: string } }>(cfg, `/accounts/${account.publicKeyHex}`);
    return r.data?.balance ?? '0';
  } catch {
    return '0';
  }
}

/** WCSPR (CEP-18) balance in atomic units. */
export async function getWcsprBalanceAtomic(cfg: WalletConfig, account: Account): Promise<string> {
  try {
    const r = await cloud<{ data: Array<{ balance: string; contract_package_hash: string }> }>(
      cfg, `/accounts/${account.accountHash}/ft-token-ownership`,
    );
    const row = (r.data ?? []).find(
      (t) => t.contract_package_hash?.toLowerCase() === cfg.asset.package.toLowerCase(),
    );
    return row?.balance ?? '0';
  } catch {
    return '0';
  }
}

// ── amount helpers ──────────────────────────────────────────────────────────

export function atomicToDecimal(atomic: string, decimals: number): string {
  const neg = atomic.startsWith('-');
  const s = (neg ? atomic.slice(1) : atomic).padStart(decimals + 1, '0');
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, '');
  return (neg ? '-' : '') + whole + (frac ? '.' + frac : '');
}

export function decimalToAtomic(amount: string, decimals: number): string {
  const [whole = '0', fracRaw = ''] = amount.split('.');
  const frac = fracRaw.padEnd(decimals, '0').slice(0, decimals);
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac || '0')).toString();
}
