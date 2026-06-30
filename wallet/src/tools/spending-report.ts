import type { Ctx } from '../context.js';
import { text } from './_util.js';

export function registerSpendingReport(server: any, ctx: Ctx) {
  server.tool(
    'spending_report',
    'Show this session\'s x402 spending: total spent today and this session, remaining daily budget, the per-call and daily limits, and a history of recent payments. Budget is tracked in WISP and resets per UTC day / process restart.',
    {},
    async () => text({ asset: ctx.config.asset.symbol, ...ctx.spending.summary() }),
  );
}
