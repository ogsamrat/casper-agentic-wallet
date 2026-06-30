import { describe, it, expect } from 'vitest';
import { atomicToDecimal, decimalToAtomic } from '../src/casper.js';

describe('hub amount conversion', () => {
  it('atomicToDecimal', () => {
    expect(atomicToDecimal('1000000', 9)).toBe('0.001');
    expect(atomicToDecimal('1000000000', 9)).toBe('1');
  });
  it('decimalToAtomic returns bigint', () => {
    expect(decimalToAtomic('0.001', 9)).toBe(1000000n);
    expect(decimalToAtomic('5', 9)).toBe(5000000000n);
  });
});
