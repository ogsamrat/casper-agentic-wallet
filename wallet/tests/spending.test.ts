import { describe, it, expect } from 'vitest';
import { SpendingTracker } from '../src/spending.js';

const budget = { maxPerCall: '0.10', maxPerDay: '1.00' };

describe('SpendingTracker', () => {
  it('allows a payment within limits', () => {
    const s = new SpendingTracker(budget);
    expect(() => s.check('0.05')).not.toThrow();
  });

  it('rejects a payment over the per-call limit', () => {
    const s = new SpendingTracker(budget);
    expect(() => s.check('0.20')).toThrow(/per-call/);
  });

  it('rejects a payment that would exceed the daily limit', () => {
    const s = new SpendingTracker(budget);
    for (let i = 0; i < 10; i++) s.record('0.10', 'recipient'); // 1.00 spent
    expect(() => s.check('0.01')).toThrow(/daily/);
  });

  it('summary reflects recorded spend', () => {
    const s = new SpendingTracker(budget);
    s.record('0.05', 'recipient', 'https://example.com');
    const sum = s.summary();
    expect(sum.paymentCount).toBe(1);
    expect(sum.spentToday).toBe('0.050000');
    expect(sum.remainingToday).toBe('0.950000');
  });
});
