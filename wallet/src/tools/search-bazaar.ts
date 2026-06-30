import { z } from 'zod';
import type { Ctx } from '../context.js';
import { text } from './_util.js';

type CatalogService = { path?: string; price?: string; category?: string; description?: string; [k: string]: unknown };

export function registerSearchBazaar(server: any, ctx: Ctx) {
  server.tool(
    'search_bazaar',
    'Discover x402-gated services this agent can pay for. Queries the Wisp bazaar — the Wisp API catalog and (if configured) the Wisp Hub registry — and returns matching services with their prices, endpoints, and example questions.',
    { query: z.string().optional().describe('Optional keyword filter, e.g. "weather" or "casper".') },
    async ({ query }: { query?: string }) => {
      const sources = [
        process.env.WISP_API_URL ?? 'http://localhost:4021',
        process.env.WISP_HUB_URL,
      ].filter(Boolean) as string[];

      const services: CatalogService[] = [];
      for (const base of sources) {
        try {
          const res = await fetch(`${base.replace(/\/$/, '')}/`, {
            headers: { accept: 'application/json' },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) continue;
          const j = (await res.json()) as { endpoints?: CatalogService[]; payTo?: string; network?: string };
          for (const e of j.endpoints ?? []) services.push({ source: base, network: j.network, payTo: j.payTo, ...e });
        } catch {
          /* source unreachable — skip */
        }
      }

      const q = query?.toLowerCase();
      const filtered = q ? services.filter((s) => JSON.stringify(s).toLowerCase().includes(q)) : services;
      return text({
        asset: ctx.config.asset.symbol,
        network: ctx.config.network,
        count: filtered.length,
        services: filtered,
        note: services.length === 0 ? 'No bazaar sources reachable. Set WISP_API_URL / WISP_HUB_URL.' : undefined,
      });
    },
  );
}
