import { z } from 'zod';
import type { Ctx } from '../context.js';
import { transferCspr } from '../transfers.js';
import { text } from './_util.js';

export function registerTransferCspr(server: any, ctx: Ctx) {
  server.tool(
    'transfer_cspr',
    'Send native CSPR from this wallet to a recipient public key on Casper. Use this to fund another account for gas. (For paying APIs, use x402_fetch; for token transfers, use transfer_token.)',
    {
      to: z.string().describe('Recipient public key hex (e.g. 0202… or 01…).'),
      amount: z.string().describe('Amount of CSPR, e.g. "10".'),
    },
    async ({ to, amount }: { to: string; amount: string }) => {
      if (!ctx.account) return text({ error: 'No wallet configured. Set WISP_MNEMONIC.' }, true);
      try {
        const txHash = await transferCspr(ctx.config, ctx.account, to, amount);
        return text({
          success: true, txHash, from: ctx.account.publicKeyHex, to, amount, asset: 'CSPR',
          explorer: `https://testnet.cspr.live/deploy/${txHash}`,
        });
      } catch (e) {
        return text({ error: e instanceof Error ? e.message : String(e) }, true);
      }
    },
  );
}
