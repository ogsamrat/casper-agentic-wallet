// End-to-end hub test: seed bazaar, credit a user, custodially pay a real seller
// 402 through the treasury, then replay the header to confirm settlement.
import { loadHubConfig } from './config.js';

const cfg = loadHubConfig();
const HUB = process.env.HUB_URL ?? `http://localhost:${cfg.port}`;
const SELLER = process.env.SELLER_URL ?? 'https://casper-api.vercel.app/otp/generate';
const ADMIN = cfg.adminSecret;
const USER = 'd196a8556f9194b95d3a712100844c33fbde489e04f2f4278f33b5eed3a1c264';

const j = (r: Response) => r.json() as Promise<any>;

const bazaar = await j(await fetch(`${HUB}/bazaar`));
console.log('bazaar services:', bazaar.count);

const credit = await j(await fetch(`${HUB}/admin/credit`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-wisp-admin-secret': ADMIN },
  body: JSON.stringify({ accountHash: USER, amountWisp: '1', ref: 'hubtest' }),
}));
console.log('credit:', credit);

const r1 = await fetch(SELLER);
const prHeader = r1.headers.get('payment-required');
if (!prHeader) { console.error('seller did not return a 402 challenge'); process.exit(1); }
const pr = JSON.parse(Buffer.from(prHeader, 'base64').toString('utf-8'));

const correlationId = 'hubtest-' + Math.floor(Number(process.env.STAMP ?? '1'));
const pay = await j(await fetch(`${HUB}/api/pay`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ correlationId, paymentRequirements: pr, userContext: { accountHash: USER, maxDebitAtomic: '1000000000' } }),
}));
console.log('pay:', JSON.stringify(pay));

if (pay?.paymentHeader?.value) {
  const r2 = await fetch(SELLER, { headers: { [pay.paymentHeader.name ?? 'PAYMENT-SIGNATURE']: pay.paymentHeader.value } });
  console.log('replay status:', r2.status);
  const set = r2.headers.get('payment-response');
  if (set) console.log('settlement:', Buffer.from(set, 'base64').toString('utf-8'));
  console.log('body:', (await r2.text()).slice(0, 300));
}

const bal = await j(await fetch(`${HUB}/accounts/${USER}`));
console.log('user balance after:', bal.balance, bal.asset);
process.exit(0);
