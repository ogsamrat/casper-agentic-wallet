// x402 service registry — the "bazaar" the agent's search_bazaar tool discovers.
// Seeds from the live Wisp API catalog and accepts manual registrations.

export type Service = {
  id: string;
  name: string;
  url: string;
  method: string;
  price: string;
  asset: string;
  network: string;
  category: string;
  description: string;
  source: string;
  registeredAt: string;
  chain?: 'casper' | 'base';
  tier?: 'testnet' | 'mainnet';
  payable?: boolean; // whether the agent wallet can settle this network
  fee?: string;    // marketplace fee, e.g. "5%"
  total?: string;  // price including fee
};

export class Bazaar {
  private services = new Map<string, Service>();

  /** Pull the Wisp API catalog (GET /) and register each paid endpoint. */
  async seedFromApi(apiUrl: string): Promise<number> {
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return 0;
      const j = (await res.json()) as {
        endpoints?: Array<{ path: string; method: string; price: string; category: string; description: string }>;
        network?: string; payTo?: string; asset?: { package?: string };
      };
      let n = 0;
      for (const e of j.endpoints ?? []) {
        const url = `${apiUrl.replace(/\/$/, '')}${e.path}`;
        this.services.set(url, {
          id: url, name: e.path, url, method: e.method, price: e.price,
          asset: j.asset?.package ?? '', network: j.network ?? '', category: e.category,
          description: e.description, source: 'wisp-api', chain: 'casper',
          tier: 'testnet', payable: true,
          registeredAt: new Date().toISOString(),
        });
        n++;
      }
      return n;
    } catch {
      return 0;
    }
  }

  /**
   * Pull the Coinbase x402 Bazaar (CDP discovery) and register Base USDC services,
   * applying a marketplace fee. The agent can pay these via the wallet's EVM scheme.
   */
  async seedFromBaseBazaar(feePct: number, discoveryUrl: string, payableNetwork: string, limit = 200): Promise<number> {
    try {
      const res = await fetch(`${discoveryUrl}?limit=${limit}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return 0;
      const j = (await res.json()) as { items?: any[]; resources?: any[] };
      const items = j.items ?? j.resources ?? [];
      let n = 0;
      for (const r of items) {
        const a = (r.accepts ?? [])[0];
        if (!a || !String(a.network).startsWith('eip155')) continue;
        const url: string | undefined = r.resource ?? r.url;
        if (!url) continue;
        // Testnet (the wallet's funded network) is payable; mainnet is preview-only.
        const payable = a.network === payableNetwork;
        const price = Number(a.amount) / 1e6; // USDC, 6 dp
        const total = price * (1 + feePct / 100);
        let host = url;
        try { host = new URL(url).host; } catch { /* keep url */ }
        this.services.set(url, {
          id: url, name: host, url, method: 'GET',
          price: `${price} USDC`, fee: `${feePct}%`, total: `${total.toFixed(6)} USDC`,
          asset: a.asset, network: a.network, chain: 'base',
          tier: payable ? 'testnet' : 'mainnet', payable,
          category: r.extensions?.bazaar?.category ?? 'base',
          description: String(r.description ?? '').slice(0, 240),
          source: 'base-bazaar', registeredAt: new Date().toISOString(),
        });
        n++;
      }
      return n;
    } catch {
      return 0;
    }
  }

  register(s: Omit<Service, 'id' | 'registeredAt' | 'source'> & { source?: string }): Service {
    const svc: Service = { ...s, id: s.url, source: s.source ?? 'registered', registeredAt: new Date().toISOString() };
    this.services.set(svc.url, svc);
    return svc;
  }

  list(query?: string): Service[] {
    const all = [...this.services.values()];
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter((s) => JSON.stringify(s).toLowerCase().includes(q));
  }

  get size(): number {
    return this.services.size;
  }
}
