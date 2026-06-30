import { z } from 'zod';
import type { Ctx } from '../context.js';
import { x402Fetch } from '../x402.js';
import { atomicToDecimal } from '../casper.js';
import { networkAsset } from '../config.js';
import { text, tryJson } from './_util.js';

export function registerX402Fetch(server: any, ctx: Ctx) {
  server.tool(
    'x402_fetch',
    'Fetch any URL, automatically paying x402 charges in WISP on Casper. On an HTTP 402 Payment Required response it parses the challenge, enforces the wallet budget limits, signs an EIP-712 TransferWithAuthorization, and retries once. Returns the resource body plus on-chain settlement details.',
    {
      url: z.string().describe('The URL to fetch (may be an x402-gated endpoint).'),
      method: z.string().optional().describe('HTTP method (default GET).'),
      body: z.string().optional().describe('Optional request body for POST/PUT.'),
    },
    async ({ url, method, body }: { url: string; method?: string; body?: string }) => {
      if (!ctx.account) return text({ error: 'No wallet configured. Set WISP_MNEMONIC.' }, true);
      try {
        const init: RequestInit = { method: method ?? 'GET', ...(body ? { body } : {}) };
        const r = await x402Fetch(ctx.account, url, init, (accept) => {
          const na = networkAsset(accept.network, ctx.config);
          ctx.spending.check(atomicToDecimal(accept.amount, na.decimals));
        });

        let payment: unknown;
        if (r.paid && r.accept) {
          const na = networkAsset(r.accept.network, ctx.config);
          const dec = atomicToDecimal(r.accept.amount, na.decimals);
          const txHash = (r.settlement as { transaction?: string } | undefined)?.transaction;
          ctx.spending.record(dec, r.accept.payTo, url, txHash);
          const isEvm = r.accept.network.startsWith('eip155');
          payment = {
            amount: dec,
            asset: na.symbol,
            network: r.accept.network,
            payTo: r.accept.payTo,
            settlement: r.settlement,
            explorer: txHash
              ? isEvm
                ? `https://sepolia.basescan.org/tx/${txHash}`
                : `https://testnet.cspr.live/deploy/${txHash}`
              : undefined,
          };
        }
        const bodyText = await r.response.text();
        return text({ status: r.status, paid: r.paid, payment, body: tryJson(bodyText) }, r.status >= 400);
      } catch (e) {
        return text({ error: e instanceof Error ? e.message : String(e), url }, true);
      }
    },
  );
}
