import { x402Client, x402HTTPClient } from '@x402/fetch';
import { ExactCasperScheme } from '@make-software/casper-x402/exact/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { makeEvmSigner } from './evm.js';
import { loadHubConfig } from './config.js';
import type { Treasury } from './casper.js';

export type PaymentAccept = {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
};
export type PaymentRequired = {
  x402Version: number;
  accepts: PaymentAccept[];
  resource?: { url?: string };
};

/**
 * Custodial payment: the hub signs an x402 EIP-712 authorization from the shared
 * treasury account for the given challenge. Returns the encoded payment header.
 */
export async function signCustodialPayment(treasury: Treasury, challenge: PaymentRequired) {
  const client = new x402Client().register('casper:*', new ExactCasperScheme(treasury.signer));
  const httpClient = new x402HTTPClient(client);
  const payload = await httpClient.createPaymentPayload(challenge as any);
  const headers = httpClient.encodePaymentSignatureHeader(payload as any) as Record<string, string>;
  const [headerName, headerValue] = Object.entries(headers)[0] ?? ['', ''];
  return { headerName, headerValue, payload };
}

/**
 * Fetch an x402 URL and pay it on the agent's behalf using the treasury's
 * multi-chain keys (Casper WISP or Base USDC, chosen by the 402's network).
 */
export async function fetchAndPay(treasury: Treasury, url: string, init: RequestInit = {}) {
  const cfg = loadHubConfig();
  const client = new x402Client().register('casper:*', new ExactCasperScheme(treasury.signer));
  if (cfg.base) {
    try { registerExactEvmScheme(client, { signer: makeEvmSigner(cfg.base) }); } catch { /* casper still works */ }
  }
  const httpClient = new x402HTTPClient(client);

  const res1 = await fetch(url, init);
  if (res1.status !== 402) return { status: res1.status, paid: false, accept: undefined, response: res1, settlement: null };

  const header = res1.headers.get('payment-required') ?? res1.headers.get('PAYMENT-REQUIRED');
  const challenge = header ? JSON.parse(Buffer.from(header, 'base64').toString('utf-8')) : await res1.clone().json();
  const accept = (challenge.accepts ?? []).find(
    (a: any) => String(a.network).startsWith('casper:') || String(a.network).startsWith('eip155:'),
  ) ?? challenge.accepts?.[0];

  const payload = await httpClient.createPaymentPayload(challenge);
  const headers = httpClient.encodePaymentSignatureHeader(payload as any) as Record<string, string>;
  const res2 = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string> ?? {}), ...headers } });

  const sh = res2.headers.get('payment-response') ?? res2.headers.get('PAYMENT-RESPONSE') ?? res2.headers.get('x-payment-response');
  let settlement: unknown = null;
  if (sh) { try { settlement = JSON.parse(Buffer.from(sh, 'base64').toString('utf-8')); } catch { /* ignore */ } }
  // "paid" only when the retry actually succeeded (a re-402 means settlement failed,
  // e.g. paying a service on a chain this wallet isn't funded on).
  return { status: res2.status, paid: res2.status >= 200 && res2.status < 300, accept, response: res2, settlement };
}
