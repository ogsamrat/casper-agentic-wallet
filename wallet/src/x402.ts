import { x402Client, x402HTTPClient } from '@x402/fetch';
import { ExactCasperScheme } from '@make-software/casper-x402/exact/client';
import type { Account } from './casper.js';

export type PaymentAccept = {
  scheme: string;
  network: string;
  asset: string;
  amount: string;     // atomic units
  payTo: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
};

export type PaymentRequired = {
  x402Version: number;
  error?: string;
  resource?: { url?: string; description?: string; mimeType?: string };
  accepts: PaymentAccept[];
};

export function makeHttpClient(account: Account) {
  const client = new x402Client().register('casper:*', new ExactCasperScheme(account.signer));
  return new x402HTTPClient(client);
}

/** Decode an x402 402 challenge from the response (PAYMENT-REQUIRED header, else body). */
async function readChallenge(res: Response): Promise<PaymentRequired> {
  const header = res.headers.get('payment-required') ?? res.headers.get('PAYMENT-REQUIRED');
  if (header) return JSON.parse(Buffer.from(header, 'base64').toString('utf-8')) as PaymentRequired;
  return (await res.clone().json()) as PaymentRequired;
}

export function decodeSettlement(res: Response): unknown | null {
  const h = res.headers.get('payment-response') ?? res.headers.get('PAYMENT-RESPONSE') ?? res.headers.get('x-payment-response');
  if (!h) return null;
  try {
    return JSON.parse(Buffer.from(h, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export type FetchResult = {
  status: number;
  paid: boolean;
  accept?: PaymentAccept;
  response: Response;
  settlement?: unknown | null;
};

/**
 * x402-aware fetch with a budget gate. Performs the initial request; on 402 it
 * parses the challenge, runs `onBeforePay` (which may throw to abort on budget),
 * signs the payment authorization, and retries once with the payment header.
 */
export async function x402Fetch(
  account: Account,
  url: string,
  init: RequestInit,
  onBeforePay?: (accept: PaymentAccept, challenge: PaymentRequired) => void | Promise<void>,
): Promise<FetchResult> {
  const res1 = await fetch(url, init);
  if (res1.status !== 402) return { status: res1.status, paid: false, response: res1 };

  const challenge = await readChallenge(res1);
  if (!challenge.accepts?.length) throw new Error('402 had no payment options');

  const httpClient = makeHttpClient(account);
  const accept = challenge.accepts[0];
  if (onBeforePay) await onBeforePay(accept, challenge);

  const payload = await httpClient.createPaymentPayload(challenge as any);
  const headers = httpClient.encodePaymentSignatureHeader(payload as any) as Record<string, string>;

  const res2 = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string> ?? {}), ...headers } });
  return { status: res2.status, paid: true, accept, response: res2, settlement: decodeSettlement(res2) };
}

/**
 * Sign an x402 payment authorization for a synthetic challenge without sending
 * the resource request. Returns the encoded payment header(s).
 */
export async function signPayment(account: Account, challenge: PaymentRequired) {
  const httpClient = makeHttpClient(account);
  const payload = await httpClient.createPaymentPayload(challenge as any);
  const headers = httpClient.encodePaymentSignatureHeader(payload as any) as Record<string, string>;
  const [headerName, headerValue] = Object.entries(headers)[0] ?? ['', ''];
  return { headerName, headerValue, payload };
}
