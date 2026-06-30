// Vercel serverless entry — Node(req,res) → Web Request → Hono app.fetch → res,
// with error capture so failures surface as JSON instead of an opaque 500.
import app from '../src/app.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  try {
    const host = req.headers.host ?? 'localhost';
    const url = `https://${host}${req.url ?? '/'}`;
    const method = (req.method ?? 'GET').toUpperCase();
    let body: Buffer | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
      body = chunks.length ? Buffer.concat(chunks) : undefined;
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers.set(k, v);
      else if (Array.isArray(v)) headers.set(k, v.join(', '));
    }
    const request = new Request(url, { method, headers, body, duplex: 'half' } as RequestInit);
    const response = await app.fetch(request);
    res.statusCode = response.status;
    response.headers.forEach((val: string, key: string) => res.setHeader(key, val));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'hub handler failed', message: e?.message ?? String(e) }));
  }
}
