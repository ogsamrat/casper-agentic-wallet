import { describe, it, expect } from 'vitest';
import { atomicToDecimal, decimalToAtomic } from '../src/casper.js';

describe('amount conversion', () => {
  it('atomicToDecimal formats 9-decimal atomic units', () => {
    expect(atomicToDecimal('1000000000', 9)).toBe('1');
    expect(atomicToDecimal('1000000', 9)).toBe('0.001');
    expect(atomicToDecimal('0', 9)).toBe('0');
    expect(atomicToDecimal('1234500000', 9)).toBe('1.2345');
  });

  it('decimalToAtomic parses decimals to atomic units', () => {
    expect(decimalToAtomic('1', 9)).toBe('1000000000');
    expect(decimalToAtomic('0.001', 9)).toBe('1000000');
    expect(decimalToAtomic('0', 9)).toBe('0');
  });

  it('round-trips', () => {
    for (const v of ['12.34', '0.000001', '0.5', '7', '1000']) {
      expect(atomicToDecimal(decimalToAtomic(v, 9), 9)).toBe(v);
    }
  });
});
