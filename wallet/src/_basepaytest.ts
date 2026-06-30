// Cross-chain pay test: pay a real Base Sepolia x402 service with USDC.
import { loadConfig, networkAsset } from './config.js';
import { deriveAccount } from './casper.js';
import { evmAddress, getUsdcBalanceAtomic } from './evm.js';
import { x402Fetch } from './x402.js';

const cfg = loadConfig();
if (!cfg.base) { console.error('BASE_PRIVATE_KEY not set'); process.exit(1); }
const account = deriveAccount(cfg);

console.log('EVM address :', evmAddress(cfg.base));
console.log('USDC balance:', Number(await getUsdcBalanceAtomic(cfg.base)) / 1e6, 'USDC');

const url = process.env.BASE_URL ?? 'https://sandbox.node4all.com/v1/x402-test';
console.log('\nfetching (x402):', url);

const r = await x402Fetch(account, url, { method: 'GET' }, (a) => {
  const na = networkAsset(a.network, cfg);
  console.log(`  → 402: pay ${Number(a.amount) / 10 ** na.decimals} ${na.symbol} on ${a.network} to ${a.payTo}`);
  console.log('  → signing EIP-3009 transferWithAuthorization…');
});

console.log('\nstatus:', r.status, r.paid ? '(paid)' : '(unpaid)');
if (r.settlement) console.log('settlement:', JSON.stringify(r.settlement));
console.log('body:', (await r.response.text()).slice(0, 500));
console.log('\nUSDC after :', Number(await getUsdcBalanceAtomic(cfg.base)) / 1e6, 'USDC');
