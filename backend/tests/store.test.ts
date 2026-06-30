import { describe, it, expect } from 'vitest';
import { HubStore } from '../src/store.js';

describe('HubStore', () => {
  it('credits and reads balance', () => {
    const s = new HubStore();
    s.credit('aabb', 1000n, 'onramp_credit');
    expect(s.balanceOf('aabb')).toBe(1000n);
  });

  it('reserve debits the balance', () => {
    const s = new HubStore();
    s.credit('aa', 1000n, 'x');
    const r = s.reserve('c1', 'aa', 'casper:casper-test', 'pay', 300n);
    expect(r.status).toBe('ok');
    expect(s.balanceOf('aa')).toBe(700n);
  });

  it('reserve is idempotent on correlationId', () => {
    const s = new HubStore();
    s.credit('aa', 1000n, 'x');
    s.reserve('c1', 'aa', 'n', 'p', 300n);
    const dup = s.reserve('c1', 'aa', 'n', 'p', 300n);
    expect(dup.status).toBe('duplicate');
    expect(s.balanceOf('aa')).toBe(700n);
  });

  it('reserve rejects insufficient balance', () => {
    const s = new HubStore();
    s.credit('aa', 100n, 'x');
    expect(s.reserve('c1', 'aa', 'n', 'p', 300n).status).toBe('insufficient');
    expect(s.balanceOf('aa')).toBe(100n);
  });

  it('fail refunds a reserved attempt', () => {
    const s = new HubStore();
    s.credit('aa', 1000n, 'x');
    s.reserve('c1', 'aa', 'n', 'p', 300n);
    s.fail('c1', 'boom');
    expect(s.balanceOf('aa')).toBe(1000n);
    expect(s.getAttempt('c1')?.status).toBe('failed');
  });

  it('settle marks paid and records outflow', () => {
    const s = new HubStore();
    s.credit('aa', 1000n, 'x');
    s.reserve('c1', 'aa', 'n', 'p', 300n);
    s.settle('c1', 'sig');
    expect(s.getAttempt('c1')?.status).toBe('paid');
    expect(s.ops().treasuryOutAtomic).toBe('300');
  });
});
