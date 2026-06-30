import type { Ctx } from '../context.js';
import { getCsprBalanceMotes, getWcsprBalanceAtomic, atomicToDecimal } from '../casper.js';
import { text } from './_util.js';

export function registerCheckBalance(server: any, ctx: Ctx) {
  server.tool(
    'check_balance',
    'Check this Casper wallet\'s balances: native CSPR (used for gas on transfers) and the WISP payment token (used to settle x402 micropayments). Also returns the account address and public key.',
    {},
    async () => {
      if (!ctx.account) return text({ error: 'No wallet configured. Set WISP_MNEMONIC.' }, true);
      const [csprMotes, wispAtomic] = await Promise.all([
        getCsprBalanceMotes(ctx.config, ctx.account),
        getWcsprBalanceAtomic(ctx.config, ctx.account),
      ]);
      return text({
        accountAddress: ctx.account.accountAddress,
        publicKey: ctx.account.publicKeyHex,
        network: ctx.config.network,
        cspr: atomicToDecimal(csprMotes, 9),
        token: {
          symbol: ctx.config.asset.symbol,
          balance: atomicToDecimal(wispAtomic, ctx.config.asset.decimals),
          package: ctx.config.asset.package,
        },
        explorer: `https://testnet.cspr.live/account/${ctx.account.publicKeyHex}`,
      });
    },
  );
}
