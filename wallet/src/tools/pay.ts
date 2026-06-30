import { z } from 'zod';
import type { Ctx } from '../context.js';
import { signPayment, type PaymentRequired } from '../x402.js';
import { decimalToAtomic } from '../casper.js';
import { text } from './_util.js';

export function registerPay(server: any, ctx: Ctx) {
  server.tool(
    'pay',
    'Sign an x402 payment authorization (EIP-712 TransferWithAuthorization) for a given WISP amount and recipient, WITHOUT sending an HTTP request. Returns the payment header name + value to attach to a request yourself. Use x402_fetch for the full automatic flow.',
    {
      amount: z.string().describe('Amount in WISP, e.g. "0.01".'),
      payTo: z.string().describe('Recipient account-hash address (00-prefixed, 66 hex).'),
      resource: z.string().optional().describe('Optional resource URL this payment is for.'),
    },
    async ({ amount, payTo, resource }: { amount: string; payTo: string; resource?: string }) => {
      if (!ctx.account) return text({ error: 'No wallet configured. Set WISP_MNEMONIC.' }, true);
      try {
        ctx.spending.check(amount);
        const challenge: PaymentRequired = {
          x402Version: 2,
          accepts: [
            {
              scheme: 'exact',
              network: ctx.config.network,
              asset: ctx.config.asset.package,
              amount: decimalToAtomic(amount, ctx.config.asset.decimals),
              payTo,
              maxTimeoutSeconds: 300,
              extra: {
                name: ctx.config.asset.name,
                symbol: ctx.config.asset.symbol,
                version: ctx.config.asset.version,
                decimals: String(ctx.config.asset.decimals),
              },
            },
          ],
          resource: resource ? { url: resource } : undefined,
        };
        const { headerName, headerValue } = await signPayment(ctx.account, challenge);
        ctx.spending.record(amount, payTo, resource);
        return text({ headerName, headerValue, amount, asset: ctx.config.asset.symbol, payTo });
      } catch (e) {
        return text({ error: e instanceof Error ? e.message : String(e) }, true);
      }
    },
  );
}
