import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomInt } from 'node:crypto';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient, type FacilitatorConfig } from '@x402/core/server';
import { ExactCasperScheme } from '@make-software/casper-x402/exact/server';
import type { AssetAmount, Network, Price } from '@x402/core/types';

// Load the shared repo-root .env first, then a local seller/.env override if present.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../.env') });
loadEnv();

// =============================================================================
// Wisp API — x402 resource server
//
// Pay-per-call HTTP APIs gated by the x402 protocol, settled in WCSPR (a CEP-18
// token) on the Casper network. A single CATALOG drives the paid routes plus the
// free GET / (full catalog) and GET /health (compact directory).
//
// Live endpoints (real upstreams, no API keys needed beyond CSPR.cloud):
//   GET /weather/current  — Open-Meteo geocode + current conditions
//   GET /fx/rates         — Frankfurter (ECB reference FX rates)
//   GET /casper/account   — CSPR.cloud account lookup (CSPR balance, purse)
//   GET /casper/deploy    — CSPR.cloud deploy / transaction status
//   GET /otp/generate     — server-side CSPRNG one-time passcode
//   GET /company/lookup   — live homepage metadata fetch
// Simulated demo endpoints (deterministic, marked dataSource: "simulated"):
//   GET /ai/complete, GET /market/quote
// =============================================================================

// ── Config ───────────────────────────────────────────────────────────────────

const NETWORK         = (process.env.CASPER_NETWORK ?? 'casper:casper-test') as Network;
const NETWORK_LABEL   = process.env.WISP_NETWORK_LABEL ?? 'Casper Testnet';
const PAYEE_ADDRESS   = process.env.WISP_PAYEE_ADDRESS ?? '';
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL ?? 'https://x402-facilitator.cspr.cloud';
const FACILITATOR_KEY = process.env.X402_FACILITATOR_API_KEY ?? process.env.CSPR_CLOUD_API_KEY ?? '';
const PORT            = Number(process.env.PORT ?? 4021);

const ASSET_PACKAGE  = (process.env.WISP_ASSET_PACKAGE ?? '').replace(/^hash-/, '');
const ASSET_NAME     = process.env.WISP_ASSET_NAME ?? 'Wrapped CSPR';
const ASSET_SYMBOL   = process.env.WISP_ASSET_SYMBOL ?? 'WCSPR';
const ASSET_VERSION  = process.env.WISP_ASSET_VERSION ?? '1';
const ASSET_DECIMALS = Number(process.env.WISP_ASSET_DECIMALS ?? 9);

const CSPR_CLOUD_REST = (process.env.CSPR_CLOUD_REST_URL ?? 'https://api.testnet.cspr.cloud').replace(/\/$/, '');
const CSPR_CLOUD_KEY  = process.env.CSPR_CLOUD_API_KEY ?? '';

if (!PAYEE_ADDRESS) console.error('[wisp-api] WARNING: WISP_PAYEE_ADDRESS is not set — paid routes will reject.');
if (!ASSET_PACKAGE) console.error('[wisp-api] WARNING: WISP_ASSET_PACKAGE is not set — paid routes will reject.');

// On a serverless platform a transient facilitator-sync rejection must not crash the function.
process.on('unhandledRejection', (reason) => {
  console.warn('[wisp-api] Unhandled rejection (non-fatal):', reason);
});

// ── Price helper: denominate a route directly in WCSPR atomic units ───────────
// extra.name / extra.version are the CEP-18 EIP-712 domain fields the buyer and
// facilitator hash over — they must match the on-chain token's domain.
const tokenExtra = { name: ASSET_NAME, symbol: ASSET_SYMBOL, version: ASSET_VERSION, decimals: String(ASSET_DECIMALS) };
function wcspr(decimalAmount: string): Price {
  const [whole = '0', fracRaw = ''] = decimalAmount.split('.');
  const frac = fracRaw.padEnd(ASSET_DECIMALS, '0').slice(0, ASSET_DECIMALS);
  const atomic = (BigInt(whole) * 10n ** BigInt(ASSET_DECIMALS) + BigInt(frac || '0')).toString();
  return { asset: ASSET_PACKAGE, amount: atomic, extra: tokenExtra } as AssetAmount;
}

// ── Live data fetchers ────────────────────────────────────────────────────────

const HTTP_TIMEOUT_MS = 8_000;

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'wisp-api/0.1', ...headers },
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`upstream ${res.status} from ${new URL(url).host}`);
  return res.json() as Promise<T>;
}

function csprCloud<T>(path: string): Promise<T> {
  return fetchJson<T>(`${CSPR_CLOUD_REST}${path}`, CSPR_CLOUD_KEY ? { authorization: CSPR_CLOUD_KEY } : {});
}

const WMO: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle', 61: 'Slight rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Thunderstorm w/ heavy hail',
};

async function getWeather(city: string) {
  const geo = await fetchJson<{ results?: Array<{ name: string; country?: string; latitude: number; longitude: number }> }>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
  );
  const place = geo.results?.[0];
  if (!place) throw new Error(`city not found: ${city}`);
  const wx = await fetchJson<{ current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number } }>(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh`,
  );
  const c = wx.current;
  return {
    city: place.name, country: place.country ?? null, latitude: place.latitude, longitude: place.longitude,
    tempC: c.temperature_2m, feelsLikeC: c.apparent_temperature, humidityPct: c.relative_humidity_2m,
    windKph: c.wind_speed_10m, conditions: WMO[c.weather_code] ?? `WMO ${c.weather_code}`,
    fetchedAt: new Date().toISOString(), source: 'Open-Meteo (live)', paidVia: `x402 / ${ASSET_SYMBOL} ${NETWORK_LABEL}`,
  };
}

async function getFxRates(base: string, symbols?: string) {
  const qs = new URLSearchParams({ base: base.toUpperCase() });
  if (symbols) qs.set('symbols', symbols.toUpperCase());
  const d = await fetchJson<{ base: string; date: string; rates: Record<string, number> }>(`https://api.frankfurter.dev/v1/latest?${qs}`);
  return { base: d.base, date: d.date, rates: d.rates, rateCount: Object.keys(d.rates).length,
    fetchedAt: new Date().toISOString(), source: 'Frankfurter / ECB (live)', paidVia: `x402 / ${ASSET_SYMBOL} ${NETWORK_LABEL}` };
}

type CloudAccount = { data: { public_key: string; account_hash: string; balance: string; main_purse_uref: string } };
async function getCasperAccount(id: string) {
  const a = await csprCloud<CloudAccount>(`/accounts/${encodeURIComponent(id)}`);
  const motes = BigInt(a.data.balance ?? '0');
  return {
    accountHash: a.data.account_hash, publicKey: a.data.public_key,
    balanceMotes: motes.toString(), balanceCspr: (Number(motes) / 1e9).toString(),
    mainPurse: a.data.main_purse_uref, network: NETWORK_LABEL,
    fetchedAt: new Date().toISOString(), source: 'CSPR.cloud (live)', paidVia: `x402 / ${ASSET_SYMBOL} ${NETWORK_LABEL}`,
  };
}

type CloudDeploy = { data: { deploy_hash: string; status: string; error_message: string | null; block_height?: number; cost?: string; timestamp?: string; caller_public_key?: string } };
async function getCasperDeploy(hash: string) {
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) throw new Error(`invalid deploy hash: ${hash}`);
  const d = await csprCloud<CloudDeploy>(`/deploys/${hash}`);
  return {
    deployHash: d.data.deploy_hash, status: d.data.status, errorMessage: d.data.error_message ?? null,
    blockHeight: d.data.block_height ?? null, cost: d.data.cost ?? null, caller: d.data.caller_public_key ?? null,
    timestamp: d.data.timestamp ?? null, network: NETWORK_LABEL,
    fetchedAt: new Date().toISOString(), source: 'CSPR.cloud (live)', paidVia: `x402 / ${ASSET_SYMBOL} ${NETWORK_LABEL}`,
  };
}

function generateOtp(digitsRaw?: string, ttlRaw?: string) {
  const digits = Math.min(Math.max(Number(digitsRaw) || 6, 4), 10);
  const ttl = Math.min(Math.max(Number(ttlRaw) || 300, 30), 3600);
  let otp = '';
  for (let i = 0; i < digits; i++) otp += randomInt(0, 10).toString();
  return { otp, digits, expiresInSeconds: ttl, expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    entropyBits: Math.round(digits * Math.log2(10)), algorithm: 'CSPRNG (node:crypto)',
    fetchedAt: new Date().toISOString(), source: 'Generated server-side (live)', paidVia: `x402 / ${ASSET_SYMBOL} ${NETWORK_LABEL}` };
}

function htmlDecode(s: string | null): string | null {
  if (!s) return null;
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ');
}
async function getCompanyMeta(domainRaw: string) {
  const domain = domainRaw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(domain) || domain.endsWith('.local') || domain.endsWith('.internal')) {
    throw new Error(`invalid domain: ${domainRaw}`);
  }
  const res = await fetch(`https://${domain}`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; wisp-api/0.1)', accept: 'text/html' },
    redirect: 'follow', signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`upstream ${res.status} from ${domain}`);
  const html = (await res.text()).slice(0, 250_000);
  const pick = (...rx: RegExp[]): string | null => {
    for (const re of rx) { const m = html.match(re); if (m?.[1]) return m[1].trim().replace(/\s+/g, ' '); }
    return null;
  };
  const title = htmlDecode(pick(/<title[^>]*>([^<]+)<\/title>/i));
  const description = htmlDecode(pick(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  ));
  const siteName = htmlDecode(pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i));
  return { name: siteName ?? title ?? domain, domain, website: `https://${domain}`, title: title ?? null,
    description: description ?? null, finalUrl: res.url, fetchedAt: new Date().toISOString(),
    source: 'Homepage metadata fetch (live)', paidVia: `x402 / ${ASSET_SYMBOL} ${NETWORK_LABEL}` };
}

// Simulated demo endpoints (deterministic; minute-seeded)
function seeded(seed: number): number { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x); }
function minuteSeed(): number { return Math.floor(Date.now() / 60_000); }
function mockAiComplete(prompt: string) {
  const seed = minuteSeed();
  const tokens = Math.floor(seeded(seed) * 200 + 40);
  return { prompt, completion: `Wisp demo model response to: "${prompt.slice(0, 80)}". (This endpoint is a deterministic mock — wire a real model upstream in production.)`,
    model: 'wisp-demo-1', promptTokens: prompt.split(/\s+/).length, completionTokens: tokens,
    fetchedAt: new Date().toISOString(), source: 'simulated', paidVia: `x402 / ${ASSET_SYMBOL} ${NETWORK_LABEL}` };
}
function mockMarketQuote(symbol: string) {
  const seed = minuteSeed() + symbol.length;
  const price = Math.round((10 + seeded(seed) * 1000) * 100) / 100;
  return { symbol: symbol.toUpperCase(), price, change24hPct: Math.round((seeded(seed + 1) * 20 - 10) * 100) / 100,
    fetchedAt: new Date().toISOString(), source: 'simulated', paidVia: `x402 / ${ASSET_SYMBOL} ${NETWORK_LABEL}` };
}

// ── Unified catalog ───────────────────────────────────────────────────────────

type CatalogEntry = {
  path: string; title: string; priceWcspr: string; category: string;
  dataSource: 'live' | 'simulated'; upstream: string; description: string;
  params: Record<string, string>; returns: string[]; exampleQuestion: string;
  handle: (req: Request) => unknown | Promise<unknown>;
};

const CATALOG: CatalogEntry[] = [
  { path: '/weather/current', title: 'Current Weather', priceWcspr: '0.001', category: 'weather', dataSource: 'live',
    upstream: 'Open-Meteo', description: 'Live current weather for any city: temperature, feels-like, humidity, wind, conditions.',
    params: { city: 'city name (default: London)' }, returns: ['city', 'tempC', 'humidityPct', 'windKph', 'conditions'],
    exampleQuestion: 'What is the weather in Tokyo right now?', handle: (r) => getWeather((r.query.city as string) ?? 'London') },
  { path: '/fx/rates', title: 'FX Reference Rates', priceWcspr: '0.001', category: 'finance', dataSource: 'live',
    upstream: 'Frankfurter / ECB', description: 'Latest ECB reference FX rates rebased to any currency.',
    params: { base: 'base currency (default: USD)', symbols: 'comma-separated codes (default: all)' }, returns: ['base', 'date', 'rates'],
    exampleQuestion: 'How many euros is one US dollar today?', handle: (r) => getFxRates((r.query.base as string) ?? 'USD', r.query.symbols as string | undefined) },
  { path: '/casper/account', title: 'Casper Account Lookup', priceWcspr: '0.001', category: 'blockchain', dataSource: 'live',
    upstream: 'CSPR.cloud', description: 'Live on-chain Casper account state: CSPR balance, account hash, main purse.',
    params: { id: 'public key or account hash (default: payee)' }, returns: ['accountHash', 'publicKey', 'balanceCspr', 'mainPurse'],
    exampleQuestion: 'What is the CSPR balance of this account?', handle: (r) => getCasperAccount((r.query.id as string) ?? (process.env.WISP_PAYEE_ADDRESS!.slice(2))) },
  { path: '/casper/deploy', title: 'Casper Deploy Status', priceWcspr: '0.001', category: 'blockchain', dataSource: 'live',
    upstream: 'CSPR.cloud', description: 'Live status of a Casper deploy / transaction by hash: status, block height, cost.',
    params: { hash: '64-char deploy hash (required)' }, returns: ['deployHash', 'status', 'blockHeight', 'cost'],
    exampleQuestion: 'Did deploy <hash> succeed?', handle: (r) => getCasperDeploy((r.query.hash as string) ?? '') },
  { path: '/otp/generate', title: 'OTP Generator', priceWcspr: '0.001', category: 'otp', dataSource: 'live',
    upstream: 'node:crypto CSPRNG', description: 'Cryptographically secure one-time passcode, configurable length and TTL.',
    params: { digits: '4-10 (default 6)', ttl: 'seconds 30-3600 (default 300)' }, returns: ['otp', 'expiresAt', 'entropyBits'],
    exampleQuestion: 'Generate a 2FA passcode.', handle: (r) => generateOtp(r.query.digits as string | undefined, r.query.ttl as string | undefined) },
  { path: '/company/lookup', title: 'Company Lookup', priceWcspr: '0.002', category: 'company', dataSource: 'live',
    upstream: 'homepage fetch', description: 'Company / website enrichment from a live homepage fetch: name, title, description.',
    params: { domain: 'company domain (required)' }, returns: ['name', 'domain', 'title', 'description'],
    exampleQuestion: 'What is the company behind casper.network?', handle: (r) => getCompanyMeta((r.query.domain as string) ?? 'casper.network') },
  { path: '/ai/complete', title: 'AI Completion (demo)', priceWcspr: '0.005', category: 'ai', dataSource: 'simulated',
    upstream: 'deterministic mock', description: 'Simulated LLM completion — demonstrates an agent paying for inference.',
    params: { prompt: 'the prompt (default: "hello")' }, returns: ['completion', 'model', 'completionTokens'],
    exampleQuestion: 'Complete: explain x402 in one line.', handle: (r) => mockAiComplete((r.query.prompt as string) ?? 'hello') },
  { path: '/market/quote', title: 'Market Quote (demo)', priceWcspr: '0.002', category: 'finance', dataSource: 'simulated',
    upstream: 'deterministic mock', description: 'Simulated market quote for a symbol.',
    params: { symbol: 'ticker (default: CSPR)' }, returns: ['symbol', 'price', 'change24hPct'],
    exampleQuestion: 'What is the CSPR price?', handle: (r) => mockMarketQuote((r.query.symbol as string) ?? 'CSPR') },
];

// ── x402 setup ─────────────────────────────────────────────────────────────────

const facilitatorConfig: FacilitatorConfig = { url: FACILITATOR_URL };
if (FACILITATOR_KEY) {
  const auth = { Authorization: FACILITATOR_KEY };
  facilitatorConfig.createAuthHeaders = async () => ({ verify: auth, settle: auth, supported: auth, bazaar: auth });
}
const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);

const casperScheme = new ExactCasperScheme().registerAsset(NETWORK, ASSET_PACKAGE, ASSET_DECIMALS);
const resourceServer = new x402ResourceServer(facilitatorClient).register(NETWORK, casperScheme);

const routes = Object.fromEntries(
  CATALOG.map((e) => [
    `GET ${e.path}`,
    {
      accepts: [{ scheme: 'exact' as const, price: wcspr(e.priceWcspr), network: NETWORK, payTo: PAYEE_ADDRESS }],
      description: `[Wisp API — ${e.title}] ${e.priceWcspr} WCSPR per call. ${e.description} Settled via x402 on ${NETWORK_LABEL}.`,
      mimeType: 'application/json',
    },
  ]),
);

// ── App ──────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Accept', 'Authorization', 'Content-Type', 'Origin', 'Payment-Signature', 'X-Payment'],
  exposedHeaders: ['PAYMENT-REQUIRED', 'PAYMENT-RESPONSE', 'X-PAYMENT-RESPONSE'],
  maxAge: 86_400,
}));

app.use(paymentMiddleware(routes, resourceServer));

// Free endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok', service: 'wisp-api', version: '0.1.0', network: NETWORK, networkLabel: NETWORK_LABEL,
    payTo: PAYEE_ADDRESS, asset: { symbol: ASSET_SYMBOL, package: ASSET_PACKAGE, decimals: ASSET_DECIMALS },
    facilitator: FACILITATOR_URL, protocol: 'x402 (pay-per-call over HTTP, settled in WCSPR on Casper)',
    paidEndpoints: CATALOG.map((e) => `GET ${e.path}`),
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Wisp API', version: '0.1.0',
    description: 'Pay-per-call REST API gated by x402, settled in WCSPR on the Casper network. Each call costs micro-WCSPR and returns structured JSON — no API keys, no subscriptions.',
    agentInstructions: [
      '1. Call any paid endpoint; it returns 402 with a PAYMENT-REQUIRED header.',
      '2. Sign an x402 payment authorization (EIP-712 TransferWithAuthorization) and retry with the PAYMENT-SIGNATURE header.',
      '3. The facilitator verifies + settles on Casper, then the data is returned.',
    ],
    network: NETWORK, networkLabel: NETWORK_LABEL, payTo: PAYEE_ADDRESS,
    asset: { symbol: ASSET_SYMBOL, name: ASSET_NAME, package: ASSET_PACKAGE, decimals: ASSET_DECIMALS },
    facilitator: FACILITATOR_URL, endpointCount: CATALOG.length,
    endpoints: CATALOG.map((e) => ({
      path: e.path, method: 'GET', price: `${e.priceWcspr} ${ASSET_SYMBOL}`, payTo: PAYEE_ADDRESS,
      category: e.category, dataSource: e.dataSource, upstream: e.upstream, description: e.description,
      params: e.params, returns: e.returns, exampleQuestion: e.exampleQuestion,
    })),
    freeEndpoints: [{ path: '/', method: 'GET' }, { path: '/health', method: 'GET' }],
  });
});

// Paid handlers (payment already verified + settled by the middleware)
for (const e of CATALOG) {
  app.get(e.path, async (req: Request, res: Response) => {
    try {
      res.json(await e.handle(req));
    } catch (err) {
      res.status(502).json({ error: `Upstream data fetch failed: ${err instanceof Error ? err.message : String(err)}`, endpoint: e.path });
    }
  });
}

// Local server (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n[wisp-api] 🟣 Wisp x402 resource server ready`);
    console.log(`[wisp-api]   URL:         http://localhost:${PORT}`);
    console.log(`[wisp-api]   Network:     ${NETWORK_LABEL} (${NETWORK})`);
    console.log(`[wisp-api]   Pay-to:      ${PAYEE_ADDRESS}`);
    console.log(`[wisp-api]   Asset:       ${ASSET_SYMBOL} (${ASSET_PACKAGE})`);
    console.log(`[wisp-api]   Facilitator: ${FACILITATOR_URL}`);
    for (const e of CATALOG) console.log(`[wisp-api]   GET ${e.path.padEnd(20)} ${e.priceWcspr} ${ASSET_SYMBOL} — ${e.title}`);
    console.log(`[wisp-api]   GET /                  free — full catalog`);
    console.log(`[wisp-api]   GET /health            free — directory\n`);
  });
}

export default app;
