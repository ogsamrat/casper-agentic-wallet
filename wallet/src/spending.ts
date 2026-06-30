export type BudgetConfig = { maxPerCall: string; maxPerDay: string };

export type SpendRecord = { at: string; amount: string; recipient: string; resource?: string; txHash?: string };

/**
 * In-memory budget tracker. Enforced per-call and per-UTC-day, in WCSPR units.
 * State is process-lifetime only (resets on restart, like the wallet session).
 */
export class SpendingTracker {
  private spentToday = 0;
  private spentSession = 0;
  private day = SpendingTracker.today();
  private history: SpendRecord[] = [];

  constructor(private readonly budget: BudgetConfig) {}

  private static today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private rollover(): void {
    const d = SpendingTracker.today();
    if (d !== this.day) {
      this.day = d;
      this.spentToday = 0;
    }
  }

  /** Throws if `amount` (decimal WCSPR string) would breach per-call or daily caps. */
  check(amount: string): void {
    this.rollover();
    const a = parseFloat(amount);
    const perCall = parseFloat(this.budget.maxPerCall);
    const perDay = parseFloat(this.budget.maxPerDay);
    if (Number.isNaN(a) || a < 0) throw new Error(`invalid amount: ${amount}`);
    if (a > perCall) throw new Error(`Amount ${amount} exceeds per-call limit of ${this.budget.maxPerCall} WCSPR`);
    if (this.spentToday + a > perDay) {
      throw new Error(`Payment would exceed daily limit of ${this.budget.maxPerDay} WCSPR (spent today: ${this.spentToday.toFixed(6)})`);
    }
  }

  record(amount: string, recipient: string, resource?: string, txHash?: string): void {
    this.rollover();
    const a = parseFloat(amount);
    this.spentToday += a;
    this.spentSession += a;
    this.history.push({ at: new Date().toISOString(), amount, recipient, resource, txHash });
  }

  summary() {
    this.rollover();
    const perDay = parseFloat(this.budget.maxPerDay);
    return {
      day: this.day,
      spentToday: this.spentToday.toFixed(6),
      spentSession: this.spentSession.toFixed(6),
      dailyLimit: this.budget.maxPerDay,
      perCallLimit: this.budget.maxPerCall,
      remainingToday: Math.max(0, perDay - this.spentToday).toFixed(6),
      paymentCount: this.history.length,
      recent: this.history.slice(-10),
    };
  }
}
