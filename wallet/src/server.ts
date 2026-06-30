import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from './config.js';
import { deriveAccount, type Account } from './casper.js';
import { SpendingTracker } from './spending.js';
import type { Ctx } from './context.js';
import { registerCheckBalance } from './tools/check-balance.js';
import { registerX402Fetch } from './tools/x402-fetch.js';
import { registerPay } from './tools/pay.js';
import { registerTransferCspr } from './tools/transfer-cspr.js';
import { registerTransferToken } from './tools/transfer-token.js';
import { registerRequestFunding } from './tools/request-funding.js';
import { registerSpendingReport } from './tools/spending-report.js';
import { registerSearchBazaar } from './tools/search-bazaar.js';

export function createServer(): McpServer {
  const config = loadConfig();
  let account: Account | null = null;
  try {
    if (config.canPay) account = deriveAccount(config);
  } catch (e) {
    console.error('[wisp-wallet] wallet init failed:', e instanceof Error ? e.message : e);
  }

  const ctx: Ctx = { config, account, spending: new SpendingTracker(config.budget) };
  const server = new McpServer({ name: 'wisp-wallet', version: '0.1.0' });

  registerCheckBalance(server, ctx);
  registerX402Fetch(server, ctx);
  registerPay(server, ctx);
  registerTransferCspr(server, ctx);
  registerTransferToken(server, ctx);
  registerRequestFunding(server, ctx);
  registerSpendingReport(server, ctx);
  registerSearchBazaar(server, ctx);

  if (account) {
    console.error(`[wisp-wallet] account ${account.accountAddress} on ${config.network}`);
  } else {
    console.error('[wisp-wallet] no wallet configured (WISP_MNEMONIC unset) — read-only.');
  }
  return server;
}
