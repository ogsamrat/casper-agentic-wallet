// In-memory custodial ledger: per-user WISP balances, an append-only ledger, and
// idempotent payment attempts. Durable storage (Postgres/KV) can replace this by
// implementing the same surface; state is process-lifetime by default.

export type LedgerEntry = { at: string; accountHash: string; amountAtomic: string; reason: string; ref?: string };
export type Attempt = {
  correlationId: string;
  accountHash: string;
  sellerNetwork: string;
  sellerAddress: string;
  amountAtomic: string;
  status: 'pending' | 'paid' | 'failed';
  paymentSig?: string;
  error?: string;
  at: string;
};

export function normalizeHash(h: string): string {
  let r = h.replace(/^account-hash-/i, '');
  if (r.length === 66 && r.startsWith('00')) r = r.slice(2);
  return r.toLowerCase();
}

export class HubStore {
  private balances = new Map<string, bigint>();
  private ledger: LedgerEntry[] = [];
  private attempts = new Map<string, Attempt>();
  private treasuryOutAtomic = 0n;

  balanceOf(accountHash: string): bigint {
    return this.balances.get(normalizeHash(accountHash)) ?? 0n;
  }

  /** Credit a user's internal balance (on-ramp deposit / admin credit). */
  credit(accountHash: string, amountAtomic: bigint, reason: string, ref?: string): bigint {
    const h = normalizeHash(accountHash);
    this.balances.set(h, this.balanceOf(h) + amountAtomic);
    this.ledger.push({ at: new Date().toISOString(), accountHash: h, amountAtomic: amountAtomic.toString(), reason, ref });
    return this.balanceOf(h);
  }

  getAttempt(correlationId: string): Attempt | undefined {
    return this.attempts.get(correlationId);
  }

  /** Reserve + debit for a payment. Idempotent on correlationId. */
  reserve(
    correlationId: string,
    accountHash: string,
    sellerNetwork: string,
    sellerAddress: string,
    amountAtomic: bigint,
  ): { status: 'ok' | 'duplicate' | 'insufficient'; attempt?: Attempt } {
    const existing = this.attempts.get(correlationId);
    if (existing) return { status: 'duplicate', attempt: existing };
    const h = normalizeHash(accountHash);
    if (this.balanceOf(h) < amountAtomic) return { status: 'insufficient' };
    this.balances.set(h, this.balanceOf(h) - amountAtomic);
    const attempt: Attempt = {
      correlationId, accountHash: h, sellerNetwork, sellerAddress,
      amountAtomic: amountAtomic.toString(), status: 'pending', at: new Date().toISOString(),
    };
    this.attempts.set(correlationId, attempt);
    return { status: 'ok', attempt };
  }

  /** Mark a reserved attempt settled and record the outflow. */
  settle(correlationId: string, paymentSig: string): void {
    const a = this.attempts.get(correlationId);
    if (!a) return;
    a.status = 'paid';
    a.paymentSig = paymentSig;
    this.ledger.push({ at: new Date().toISOString(), accountHash: a.accountHash, amountAtomic: '-' + a.amountAtomic, reason: 'x402_payment', ref: correlationId });
    this.treasuryOutAtomic += BigInt(a.amountAtomic);
  }

  /** Refund a reserved attempt on failure. */
  fail(correlationId: string, error: string): void {
    const a = this.attempts.get(correlationId);
    if (!a || a.status !== 'pending') return;
    this.balances.set(a.accountHash, this.balanceOf(a.accountHash) + BigInt(a.amountAtomic));
    a.status = 'failed';
    a.error = error;
  }

  ops() {
    return {
      users: this.balances.size,
      treasuryOutAtomic: this.treasuryOutAtomic.toString(),
      recentAttempts: [...this.attempts.values()].slice(-20),
      recentLedger: this.ledger.slice(-20),
    };
  }
}
