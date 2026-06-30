import { useState } from 'react';
import { callService, type Service } from '../api';
import { config } from '../config';

function hostOf(u: string) {
  try { const x = new URL(u); return x.host + (x.pathname === '/' ? '' : x.pathname); } catch { return u; }
}
function txUrl(chain: string | undefined, tx: string) {
  return chain === 'base' ? `https://sepolia.basescan.org/tx/${tx}` : `https://testnet.cspr.live/deploy/${tx}`;
}

function ServiceCard({ s }: { s: Service }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const payable = s.payable !== false && config.supportedNetworks.includes(s.network);

  const pay = async () => {
    setBusy(true);
    setResult(null);
    try { setResult(await callService(s.url)); }
    catch (e: any) { setResult({ error: e?.message ?? 'request failed' }); }
    finally { setBusy(false); }
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
        <button className="pay" onClick={pay} disabled={busy || !payable}
          title={payable ? 'Pay with the agent wallet' : 'Preview only — this wallet is funded on testnet'}>
          {busy ? 'paying…' : payable ? 'Pay & call' : 'preview'}
        </button>
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

function Grid({ items }: { items: Service[] }) {
  return (
    <div className="services">
      {items.map((s) => <ServiceCard key={s.url} s={s} />)}
      {items.length === 0 && <p className="empty">No services here.</p>}
    </div>
  );
}

export function Bazaar({ services, loading }: { services: Service[]; loading?: boolean }) {
  const [query, setQuery] = useState('');
  const [chain, setChain] = useState<'all' | 'casper' | 'base'>('all');

  const match = (s: Service) =>
    (chain === 'all' || (s.chain ?? 'casper') === chain) &&
    (!query || JSON.stringify(s).toLowerCase().includes(query.toLowerCase()));

  const filtered = services.filter(match);
  const payable = filtered.filter((s) => s.payable !== false);
  const preview = filtered.filter((s) => s.payable === false);

  return (
    <section className="bazaar" id="bazaar">
      <div className="bazaar-head">
        <span className="count-lbl">{loading ? 'loading…' : `${filtered.length} services`}</span>
        <div className="filters">
          <div className="seg">
            {(['all', 'casper', 'base'] as const).map((c) => (
              <button key={c} className={chain === c ? 'on' : ''} onClick={() => setChain(c)}>{c}</button>
            ))}
          </div>
          <input placeholder="search services…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="services">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="service skeleton" key={i}>
              <span className="sk sk-chip" /><span className="sk sk-h" /><span className="sk sk-p" /><span className="sk sk-p short" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="tier-head"><span className="tier-dot live" /> Payable now <em>· Casper testnet + Base Sepolia</em></div>
          <Grid items={payable} />
          {preview.length > 0 && (
            <>
              <div className="tier-head muted"><span className="tier-dot" /> Base mainnet <em>· preview — fund the wallet on mainnet to pay</em></div>
              <Grid items={preview} />
            </>
          )}
        </>
      )}
    </section>
  );
}
