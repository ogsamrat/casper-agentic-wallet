import { x402Client, x402HTTPClient } from '@x402/fetch';
import { ExactCasperScheme } from '@make-software/casper-x402/exact/client';
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
