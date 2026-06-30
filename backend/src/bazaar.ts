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
          description: e.description, source: 'wisp-api', registeredAt: new Date().toISOString(),
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
