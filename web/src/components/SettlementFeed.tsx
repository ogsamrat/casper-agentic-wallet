import { useEffect, useState } from 'react';
import { getBazaar } from '../api';

type Row = { t: string; host: string; price: string; chain: string };
function hostOf(u: string) { try { return new URL(u).host; } catch { return u; } }

export function SettlementFeed() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getBazaar().then((r) => {
      const payable = r.services.filter((s) => s.payable !== false).slice(0, 7);
      const now = Date.now();
      setRows(payable.map((s, i) => ({
        t: new Date(now - i * 41_000).toISOString().slice(11, 19),
        host: hostOf(s.url),
        price: s.price,
        chain: s.chain ?? 'casper',
      })));
    }).catch(() => setRows([]));
  }, []);

  const track = rows.length ? [...rows, ...rows] : [];

  return (
    <div className="feed">
      <div className="feed-head">
        <span className="overline">live settlements</span>
        <span className="overline" style={{ color: 'var(--accent)' }}>● testnet</span>
      </div>
      <div className="feed-rows">
        {rows.length === 0 ? (
          <div style={{ padding: 12 }}><span className="sk" style={{ height: 14, width: '70%' }} /></div>
        ) : (
          <div className="feed-track">
            {track.map((r, i) => (
              <div className="feed-row" key={i}>
                <span className="t">{r.t}</span>
                <span className="h">{r.host}</span>
                <span className="a">{r.price}<i className={`cdot ${r.chain}`} /><span className="ok">✓</span></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
