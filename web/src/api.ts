import { config } from './config';

export type Service = {
  name: string;
  url: string;
  method: string;
  price: string;
  category: string;
  description: string;
  network: string;
};

/** Fetch the x402 bazaar from the Wisp Hub. */
export async function getBazaar(query?: string): Promise<{ count: number; services: Service[] }> {
  const url = new URL(`${config.hubUrl}/bazaar`);
  if (query) url.searchParams.set('query', query);
  const res = await fetch(url.toString(), { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`hub ${res.status}`);
  return res.json();
}

/** Agent on-chain WISP balance (atomic) via the CSPR.click cloud proxy. */
export async function getAgentWisp(cloudFetch: (p: string) => Promise<any>, assetPackage: string): Promise<string> {
  const raw = config.agentAddress.replace(/^00/, '');
  const j = await cloudFetch(`/accounts/${raw}/ft-token-ownership`);
  const row = (j?.data ?? []).find(
    (t: any) => String(t.contract_package_hash).toLowerCase() === assetPackage.toLowerCase(),
  );
  return row?.balance ?? '0';
}

export function atomicToDecimal(atomic: string, decimals = 9): string {
  const s = atomic.padStart(decimals + 1, '0');
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, '');
  return whole + (frac ? '.' + frac : '');
}
