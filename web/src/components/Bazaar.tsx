import { useMemo, useState } from 'react';
import { callService, type Service } from '../api';
import { config } from '../config';

function hostOf(u: string) { try { return new URL(u).host; } catch { return u; } }
function txUrl(chain: string | undefined, tx: string) {
  return chain === 'base' ? `https://sepolia.basescan.org/tx/${tx}` : `https://testnet.cspr.live/deploy/${tx}`;
}
function titleCase(s: string) { return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function displayName(s: Service): string {
  let path = '';
  try { path = new URL(s.url).pathname; } catch { path = s.name; }
  const segs = path.split('/').filter(Boolean);
  if (s.chain === 'base') {
    return segs.length ? titleCase(segs[segs.length - 1]) : hostOf(s.url).replace(/^www\./, '');
  }
  const t = segs.map((w) => w.replace(/-/g, ' ')).join(' · ');
  return t ? titleCase(t) : s.name;
}
function pageList(cur: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | 'gap')[] = [1];
  const lo = Math.max(2, cur - 1), hi = Math.min(total - 1, cur + 1);
  if (lo > 2) out.push('gap');
  for (let p = lo; p <= hi; p++) out.push(p);
  if (hi < total - 1) out.push('gap');
  out.push(total);
  return out;
}

function Row({ s }: { s: Service }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const payable = s.payable !== false && config.supportedNetworks.includes(s.network);
  const pay = async () => {
    setBusy(true); setResult(null);
    try { setResult(await callService(s.url)); } catch (e: any) { setResult({ error: e?.message ?? 'failed' }); } finally { setBusy(false); }
  };
  const ok = result && result.status === 200 && result.paid;
  return (
    <div className="listing" data-chain={s.chain ?? 'casper'}>
      <span className="rail" />
      <span className={`stat ${payable ? 'ok' : 'cap'}`} title={payable ? 'payable now' : 'fund this chain to pay'}>{payable ? '✓' : '◐'}</span>
      <div className="main">
        <div className="name">{displayName(s)}</div>
        <div className="desc"><span className="host">{hostOf(s.url)}</span> · {s.description || 'x402-gated service'}</div>
      </div>
      <span className="cat-chip">{s.category}</span>
      <span className="price">{s.total ?? s.price}{s.fee ? <span className="fee"> +{s.fee}</span> : null}</span>
      <span className="act">
        {payable
          ? <button className="btn solid" onClick={pay} disabled={busy}>{busy ? 'paying…' : 'Pay & fetch'}</button>
          : <span className="cap-chip"><i className="d" />Fund to pay</span>}
      </span>
      {result && (
        <div className={`result ${ok ? 'ok' : 'err'}`}>
          <pre>{ok ? JSON.stringify(result.body, null, 1).slice(0, 520) : (result.error ?? JSON.stringify(result).slice(0, 260))}</pre>
          {result?.settlement?.transaction && <a href={txUrl(s.chain, result.settlement.transaction)} target="_blank" rel="noreferrer">settlement tx ↗</a>}
        </div>
      )}
    </div>
  );
}

const PER = 24;
type Scope = 'payable' | 'mainnet' | 'all';
const SCOPE_LABEL: Record<Scope, string> = { payable: 'Payable by this wallet', mainnet: 'Live on Base mainnet', all: 'All live services' };

export function Bazaar({ services, loading }: { services: Service[]; loading?: boolean }) {
  const [query, setQuery] = useState('');
  const [chain, setChain] = useState<'all' | 'casper' | 'base'>('all');
  const [scope, setScope] = useState<Scope>('payable');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => services.filter((s) =>
    (chain === 'all' || (s.chain ?? 'casper') === chain) &&
    (scope === 'all' || (scope === 'payable' ? s.payable !== false : s.payable === false)) &&
    (!query || JSON.stringify(s).toLowerCase().includes(query.toLowerCase())),
  ), [services, chain, scope, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * PER, cur * PER);

  if (loading) {
    return <div className="listings">{Array.from({ length: 8 }).map((_, i) => (
      <div className="listing" key={i}><span className="rail" /><span /><div className="main"><span className="sk" style={{ height: 13, width: '45%', display: 'block' }} /><span className="sk" style={{ height: 10, width: '70%', display: 'block', marginTop: 8 }} /></div></div>
    ))}</div>;
  }

  return (
    <>
      <div className="control-bar">
        <div className="seg">
          {(['payable', 'mainnet', 'all'] as const).map((sc) => (
            <button key={sc} className={scope === sc ? 'on' : ''} onClick={() => { setScope(sc); setPage(1); }}>
              {sc === 'payable' ? 'Payable now' : sc === 'mainnet' ? 'Base mainnet' : 'All'}
            </button>
          ))}
        </div>
        <div className="seg">
          {(['all', 'casper', 'base'] as const).map((c) => (
            <button key={c} className={chain === c ? 'on' : ''} onClick={() => { setChain(c); setPage(1); }}>{c}</button>
          ))}
        </div>
        <input placeholder="search name, host, category…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
      </div>

      {scope === 'mainnet' && (
        <div className="mainnet-banner">
          <span>These are live mainnet services. The demo wallet is funded on testnet — fund a Base mainnet wallet to call any of them.</span>
        </div>
      )}

      <div className={`group-head ${scope === 'payable' ? 'payable' : ''}`}>
        <span>{SCOPE_LABEL[scope]}</span><span className="ct">· {filtered.length}</span><span className="rule" />
      </div>

      <div className="listings">
        {slice.map((s) => <Row key={s.url} s={s} />)}
        {slice.length === 0 && <p className="empty">No services match these filters.</p>}
      </div>

      {pages > 1 && (
        <div className="pager">
          <span>showing {(cur - 1) * PER + 1}–{Math.min(cur * PER, filtered.length)} of {filtered.length}</span>
          <div className="pages">
            <button onClick={() => setPage(cur - 1)} disabled={cur <= 1}>‹</button>
            {pageList(cur, pages).map((p, i) => p === 'gap'
              ? <span key={i} style={{ padding: '0 4px', color: 'var(--text-dim)' }}>…</span>
              : <button key={i} className={p === cur ? 'on' : ''} onClick={() => setPage(p)}>{p}</button>)}
            <button onClick={() => setPage(cur + 1)} disabled={cur >= pages}>›</button>
          </div>
        </div>
      )}
    </>
  );
}
