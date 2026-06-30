// Standalone end-to-end pay test: derive the account, show balances, and pay an
// x402-gated endpoint. Run: SELLER_URL=http://localhost:4021/weather/current npm run paytest
import { loadConfig } from './config.js';
import { deriveAccount, getCsprBalanceMotes, getWcsprBalanceAtomic, atomicToDecimal } from './casper.js';
import { x402Fetch } from './x402.js';

const cfg = loadConfig();
const account = deriveAccount(cfg);

console.log('account address :', account.accountAddress);
console.log('public key      :', account.publicKeyHex);
console.log('CSPR balance    :', atomicToDecimal(await getCsprBalanceMotes(cfg, account), 9), 'CSPR');
console.log('WCSPR balance   :', atomicToDecimal(await getWcsprBalanceAtomic(cfg, account), cfg.asset.decimals), cfg.asset.symbol);

const url = process.env.SELLER_URL ?? 'http://localhost:4021/weather/current';
console.log('\nfetching (x402):', url);

try {
  const r = await x402Fetch(account, url, { method: 'GET' }, (accept) => {
    console.log('  → 402 challenge: pay', atomicToDecimal(accept.amount, cfg.asset.decimals), cfg.asset.symbol, 'to', accept.payTo);
    console.log('  → signing EIP-712 TransferWithAuthorization…');
  });
  console.log('\nresult status   :', r.status, r.paid ? '(paid)' : '(unpaid)');
  if (r.settlement) console.log('settlement      :', JSON.stringify(r.settlement));
  const body = await r.response.text();
  console.log('body            :', body.slice(0, 600));
} catch (e) {
  console.error('\nERROR:', e instanceof Error ? e.message : e);
}
