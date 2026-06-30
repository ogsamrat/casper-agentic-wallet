import type { Ctx } from '../context.js';
import { text } from './_util.js';

export function registerRequestFunding(server: any, ctx: Ctx) {
  server.tool(
    'request_funding',
    'Show how to fund this Wisp wallet: the account address to receive funds, plus instructions for buying CSPR via a fiat on-ramp and obtaining the WISP payment token.',
    {},
    async () => {
      if (!ctx.account) return text({ error: 'No wallet configured. Set WISP_MNEMONIC.' }, true);
      return text({
        accountAddress: ctx.account.accountAddress,
        publicKey: ctx.account.publicKeyHex,
        network: ctx.config.network,
        howToFund: {
          cspr: 'Buy CSPR with a card via the CSPR.click fiat on-ramp in the Wisp web app (showBuyCsprUi), or use the Casper testnet faucet at https://testnet.cspr.live/tools/faucet.',
          wisp: `Receive ${ctx.config.asset.symbol} (CEP-18 package ${ctx.config.asset.package}) from another holder via transfer_token, or mint your own with wallet/scripts/deploy-token.ts.`,
        },
        explorer: `https://testnet.cspr.live/account/${ctx.account.publicKeyHex}`,
      });
    },
  );
}
