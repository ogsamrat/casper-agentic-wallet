import { z } from 'zod';
import type { Ctx } from '../context.js';
import { transferToken } from '../transfers.js';
import { text } from './_util.js';

export function registerTransferToken(server: any, ctx: Ctx) {
  server.tool(
    'transfer_token',
    'Send the WISP payment token (CEP-18) directly on-chain from this wallet to a recipient account hash. This is a real token transfer, not an x402 payment authorization.',
    {
      to: z.string().describe('Recipient account-hash (00-prefixed 66 hex, raw 64 hex, or account-hash-… form).'),
      amount: z.string().describe('Amount of WISP, e.g. "1.5".'),
    },
    async ({ to, amount }: { to: string; amount: string }) => {
      if (!ctx.account) return text({ error: 'No wallet configured. Set WISP_MNEMONIC.' }, true);
      try {
        const txHash = await transferToken(ctx.config, ctx.account, to, amount);
        return text({
          success: true, txHash, from: ctx.account.accountAddress, to, amount, asset: ctx.config.asset.symbol,
          explorer: `https://testnet.cspr.live/deploy/${txHash}`,
        });
      } catch (e) {
        return text({ error: e instanceof Error ? e.message : String(e) }, true);
      }
    },
  );
}
