import { useState } from 'react';
import { callService, type Service } from '../api';

function hostOf(u: string) {
  try { const x = new URL(u); return x.host + (x.pathname === '/' ? '' : x.pathname); } catch { return u; }
}
function txUrl(chain: string | undefined, tx: string) {
  return chain === 'base'
    ? `https://sepolia.basescan.org/tx/${tx}`
    : `https://testnet.cspr.live/deploy/${tx}`;
}

function ServiceCard({ s }: { s: Service }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const pay = async () => {
    setBusy(true);
    setResult(null);
    try {
      setResult(await callService(s.url));
    } catch (e: any) {
      setResult({ error: e?.message ?? 'request failed' });
    } finally {
      setBusy(false);
    }
  };

  const ok = result && result.status === 200 && result.paid;

  return (
    <div className="service">
      <div className="service-top">
        <span className={`chip chain-${s.chain ?? 'casper'}`}>{s.chain === 'base' ? 'Base · USDC' : 'Casper · WISP'}</span>
        <span className="price">{s.total ?? s.price}{s.fee ? <em> · {s.fee} fee</em> : null}</span>
      </div>
      <h3>{s.name}</h3>
      <p>{s.description || 'x402-gated service.'}</p>
      <div className="service-foot">
        <code className="url">{hostOf(s.url)}</code>
        <button className="pay" onClick={pay} disabled={busy}>{busy ? 'paying…' : 'Pay & call'}</button>
      </div>
      {result && (
        <div className={`result ${ok ? 'ok' : 'err'}`}>
          <pre>{ok ? JSON.stringify(result.body, null, 1).slice(0, 600) : (result.error ?? JSON.stringify(result).slice(0, 300))}</pre>
          {result?.settlement?.transaction && (
            <a href={txUrl(s.chain, result.settlement.transaction)} target="_blank" rel="noreferrer">settlement tx ↗</a>
          )}
        </div>
      )}
    </div>
  );
}

export function Bazaar({ services, loading }: { services: Service[]; loading?: boolean }) {
  const [query, setQuery] = useState('');
  const [chain, setChain] = useState<'all' | 'casper' | 'base'>('all');

  const filtered = services
    .filter((s) => chain === 'all' || (s.chain ?? 'casper') === chain)
    .filter((s) => !query || JSON.stringify(s).toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="bazaar" id="bazaar">
      <div className="bazaar-head">
        <div>
          <h2>The bazaar <span className="count">{loading ? '…' : filtered.length}</span></h2>
          <p className="sub">x402 services from Wisp and the Coinbase x402 Bazaar — pay any of them with one click.</p>
        </div>
        <div className="filters">
          <div className="seg">
            {(['all', 'casper', 'base'] as const).map((c) => (
              <button key={c} className={chain === c ? 'on' : ''} onClick={() => setChain(c)}>{c}</button>
            ))}
          </div>
          <input placeholder="search services…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="services">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div className="service skeleton" key={i}>
                <span className="sk sk-chip" /><span className="sk sk-h" /><span className="sk sk-p" /><span className="sk sk-p short" />
              </div>
            ))
          : filtered.map((s) => <ServiceCard key={s.url} s={s} />)}
        {!loading && filtered.length === 0 && <p className="empty">No services found.</p>}
      </div>
    </section>
  );
}
