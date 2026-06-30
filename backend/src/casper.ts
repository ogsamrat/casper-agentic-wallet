import casperSdk from 'casper-js-sdk';
import { mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { HDKey } from '@scure/bip32';
import { toClientCasperSigner, type ClientCasperSigner } from '@make-software/casper-x402';
import type { HubConfig } from './config.js';

const { PrivateKey, KeyAlgorithm } = casperSdk as unknown as {
  PrivateKey: { fromHex(hex: string, algo: number): any };
  KeyAlgorithm: { SECP256K1: number };
};

export type Treasury = {
  signer: ClientCasperSigner;
  accountAddress: string; // 00 + 64 hex
  accountHash: string;    // raw 64 hex
  publicKeyHex: string;
};

/** Derive the hub treasury account (secp256k1, m/44'/506'/0'/0/<index>). */
export function deriveTreasury(cfg: HubConfig): Treasury {
  if (!cfg.treasuryMnemonic) throw new Error('WISP_MNEMONIC (treasury) is not set');
  if (!validateMnemonic(cfg.treasuryMnemonic)) throw new Error('WISP_MNEMONIC is not a valid BIP39 mnemonic');
  const seed = mnemonicToSeedSync(cfg.treasuryMnemonic);
  const child = HDKey.fromMasterSeed(seed).derive(`m/44'/506'/0'/0/${cfg.accountIndex}`);
  if (!child.privateKey) throw new Error('treasury key derivation failed');
  const privateKey = PrivateKey.fromHex(Buffer.from(child.privateKey).toString('hex'), KeyAlgorithm.SECP256K1);
  const signer = toClientCasperSigner(privateKey);
  const accountAddress = signer.accountAddress();
  return { signer, accountAddress, accountHash: accountAddress.replace(/^00/, ''), publicKeyHex: signer.publicKey() };
}

/** Read the treasury's on-chain WISP balance (atomic units) via CSPR.cloud. */
export async function getTreasuryWispAtomic(cfg: HubConfig, treasury: Treasury): Promise<string> {
  try {
    const res = await fetch(`${cfg.csprCloudRest}/accounts/${treasury.accountHash}/ft-token-ownership`, {
      headers: { accept: 'application/json', ...(cfg.csprCloudKey ? { authorization: cfg.csprCloudKey } : {}) },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return '0';
    const j = (await res.json()) as { data?: Array<{ balance: string; contract_package_hash: string }> };
    const row = (j.data ?? []).find((t) => t.contract_package_hash?.toLowerCase() === cfg.asset.package.toLowerCase());
    return row?.balance ?? '0';
  } catch {
    return '0';
  }
}

export function atomicToDecimal(atomic: string, decimals: number): string {
  const neg = atomic.startsWith('-');
  const s = (neg ? atomic.slice(1) : atomic).padStart(decimals + 1, '0');
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, '');
  return (neg ? '-' : '') + whole + (frac ? '.' + frac : '');
}

export function decimalToAtomic(amount: string, decimals: number): bigint {
  const [whole = '0', fracRaw = ''] = amount.split('.');
  const frac = fracRaw.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac || '0');
}
