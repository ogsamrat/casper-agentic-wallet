import { describe, it, expect } from 'vitest';
import { normalizeHash } from '../src/store.js';

const raw = 'd196a8556f9194b95d3a712100844c33fbde489e04f2f4278f33b5eed3a1c264';

describe('normalizeHash', () => {
  it('strips the 00 address prefix', () => expect(normalizeHash('00' + raw)).toBe(raw));
  it('keeps a raw 64-hex hash', () => expect(normalizeHash(raw)).toBe(raw));
  it('strips an account-hash- prefix', () => expect(normalizeHash('account-hash-' + raw)).toBe(raw));
  it('lowercases', () => expect(normalizeHash(raw.toUpperCase())).toBe(raw));
});
