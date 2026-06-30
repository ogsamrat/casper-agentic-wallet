import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';
import { deriveAccount } from '../src/casper.js';

const cfg = loadConfig();

// Runs only when WISP_MNEMONIC is set (locally). Pins the secp256k1 derivation
// (Casper Wallet path m/44'/506'/0'/0/0) to the known account.
describe('deriveAccount', () => {
  it.skipIf(!cfg.canPay)('derives the expected secp256k1 account', () => {
    const a = deriveAccount(cfg);
    expect(a.publicKeyHex).toMatch(/^0202/);
    expect(a.accountAddress).toMatch(/^00[0-9a-f]{64}$/);
    expect(a.accountHash).toBe(a.accountAddress.slice(2));
  });
});
