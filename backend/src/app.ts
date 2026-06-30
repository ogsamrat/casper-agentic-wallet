import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loadHubConfig } from './config.js';
import { deriveTreasury, getTreasuryWispAtomic, atomicToDecimal, decimalToAtomic, type Treasury } from './casper.js';
import { signCustodialPayment, fetchAndPay, type PaymentRequired } from './x402.js';
import { HubStore } from './store.js';
import { Bazaar } from './bazaar.js';
import { isAdmin } from './auth.js';

const cfg = loadHubConfig();
const store = new HubStore();
const bazaar = new Bazaar();

let treasury: Treasury | null = null;
try {
  if (cfg.treasuryMnemonic) treasury = deriveTreasury(cfg);
} catch (e) {
  console.error('[wisp-hub] treasury init failed:', e instanceof Error ? e.message : e);
}

let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  seeded = true;
  const n = await bazaar.seedFromApi(cfg.apiUrl);
  const m = await bazaar.seedFromBaseBazaar(cfg.baseFeePct, cfg.cdpDiscoveryUrl);
  console.error(`[wisp-hub] bazaar seeded: ${n} Casper (Wisp API) + ${m} Base (CDP, ${cfg.baseFeePct}% fee)`);
}

const app = new Hono();
app.use(cors({ origin: '*', exposeHeaders: ['PAYMENT-RESPONSE'] }));

app.get('/health', (c) => c.json({ status: 'ok', service: 'wisp-hub', version: '0.1.0', network: cfg.network }));

app.get('/', async (c) => {
  await ensureSeeded();
  return c.json({
    service: 'Wisp Hub',
    version: '0.1.0',
    description: 'Treasury ledger, fiat on-ramp credit, and x402 service registry for the Wisp Casper wallet.',
    network: cfg.network,
    asset: { symbol: cfg.asset.symbol, package: cfg.asset.package, decimals: cfg.asset.decimals },
    treasury: treasury ? treasury.accountAddress : null,
    bazaarSize: bazaar.size,
    endpoints: {
      'GET /bazaar': 'List x402 services (optional ?query=)',
      'POST /bazaar/register': 'Register an x402 service',
      'GET /accounts/:hash': 'Get a user internal WISP balance',
      'POST /api/pay': 'Custodial x402 payment from a user balance',
      'POST /admin/credit': 'Credit a user balance (on-ramp; admin)',
      'GET /admin/ops': 'Treasury / ledger dashboard (admin)',
    },
  });
});

// ── Bazaar ──────────────────────────────────────────────────────────────────
app.get('/bazaar', async (c) => {
  await ensureSeeded();
  const query = c.req.query('query');
  const services = bazaar.list(query);
  return c.json({ count: services.length, network: cfg.network, asset: cfg.asset.symbol, services });
});

app.post('/bazaar/register', async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b?.url || !b?.name) return c.json({ error: 'name and url are required' }, 400);
  const svc = bazaar.register({
    name: b.name, url: b.url, method: b.method ?? 'GET', price: b.price ?? '',
    asset: b.asset ?? cfg.asset.package, network: b.network ?? cfg.network,
    category: b.category ?? 'misc', description: b.description ?? '',
  });
  return c.json({ success: true, service: svc });
});

// ── User balances ─────────────────────────────────────────────────────────────
app.get('/accounts/:hash', (c) => {
  const hash = c.req.param('hash');
  const atomic = store.balanceOf(hash).toString();
  return c.json({ accountHash: hash, balanceAtomic: atomic, balance: atomicToDecimal(atomic, cfg.asset.decimals), asset: cfg.asset.symbol });
});

// ── Admin: on-ramp credit + ops ────────────────────────────────────────────────
app.post('/admin/credit', async (c) => {
  if (!isAdmin(cfg.adminSecret, c.req.header('x-wisp-admin-secret'))) return c.json({ error: 'unauthorized' }, 401);
  const b = await c.req.json().catch(() => null);
  if (!b?.accountHash || !b?.amountWisp) return c.json({ error: 'accountHash and amountWisp are required' }, 400);
  const amount = decimalToAtomic(String(b.amountWisp), cfg.asset.decimals);
  const newBalance = store.credit(b.accountHash, amount, b.reason ?? 'onramp_credit', b.ref);
  return c.json({
    success: true, accountHash: b.accountHash, credited: String(b.amountWisp), asset: cfg.asset.symbol,
    newBalance: atomicToDecimal(newBalance.toString(), cfg.asset.decimals),
  });
});

app.get('/admin/ops', async (c) => {
  if (!isAdmin(cfg.adminSecret, c.req.header('x-wisp-admin-secret'))) return c.json({ error: 'unauthorized' }, 401);
  const onchain = treasury ? await getTreasuryWispAtomic(cfg, treasury) : '0';
  return c.json({
    treasury: treasury?.accountAddress ?? null,
    treasuryOnchain: atomicToDecimal(onchain, cfg.asset.decimals),
    asset: cfg.asset.symbol,
    ...store.ops(),
  });
});

// ── Custodial x402 payment ──────────────────────────────────────────────────────
app.post('/api/pay', async (c) => {
  if (!treasury) return c.json({ error: 'hub treasury not configured' }, 503);
  const body = await c.req.json().catch(() => null);
  const correlationId: string | undefined = body?.correlationId;
  const pr: PaymentRequired | undefined = body?.paymentRequirements;
  const accountHash: string | undefined = body?.userContext?.accountHash;
  const maxDebitAtomic: string | undefined = body?.userContext?.maxDebitAtomic;
  if (!correlationId || !pr?.accepts?.length || !accountHash) {
    return c.json({ error: 'correlationId, paymentRequirements, and userContext.accountHash are required' }, 400);
  }

  const accept = pr.accepts.find((a) => a.scheme === 'exact' && a.network.startsWith('casper:')) ?? pr.accepts[0];
  const amountAtomic = BigInt(accept.amount);
  if (maxDebitAtomic && amountAtomic > BigInt(maxDebitAtomic)) {
    return c.json({ error: 'amount exceeds userContext.maxDebitAtomic' }, 402);
  }

  const r = store.reserve(correlationId, accountHash, accept.network, accept.payTo, amountAtomic);
  if (r.status === 'insufficient') return c.json({ error: 'insufficient internal balance' }, 402);
  if (r.status === 'duplicate') {
    const a = r.attempt!;
    if (a.status === 'paid') return c.json({ success: true, paymentHeader: { value: a.paymentSig }, settlementNetwork: a.sellerNetwork });
    if (a.status === 'failed') return c.json({ error: a.error ?? 'previous attempt failed' }, 402);
    return c.json({ status: 'in_progress' }, 202);
  }

  try {
    const { headerName, headerValue } = await signCustodialPayment(treasury, pr);
    store.settle(correlationId, headerValue);
    return c.json({ success: true, paymentHeader: { name: headerName, value: headerValue }, settlementNetwork: accept.network });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    store.fail(correlationId, msg);
    return c.json({ error: `payment signing failed: ${msg}` }, 502);
  }
});

// ── Pay & call: settle any x402 URL via the agent's multi-chain keys ───────────
app.post('/call', async (c) => {
  if (!treasury) return c.json({ error: 'hub treasury not configured' }, 503);
  const body = await c.req.json().catch(() => null);
  const url: string | undefined = body?.url;
  if (!url || typeof url !== 'string') return c.json({ error: 'url is required' }, 400);
  try {
    const r = await fetchAndPay(treasury, url, { method: body?.method ?? 'GET' });
    const txt = await r.response.text();
    let resBody: unknown;
    try { resBody = JSON.parse(txt); } catch { resBody = txt.slice(0, 4000); }
    return c.json({ status: r.status, paid: r.paid, network: (r.accept as any)?.network, settlement: r.settlement, body: resBody });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});

export default app;
