import { useEffect, useState } from 'react';
import { getAgent, type AgentInfo } from '../api';
import { short } from '../util';

function Copy({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="copy" onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1100); }}>
      {done ? 'copied' : 'copy'}
    </button>
  );
}

export function WalletCard() {
  const [a, setA] = useState<AgentInfo | null>(null);
  useEffect(() => { getAgent().then(setA).catch(() => setA(null)); }, []);
  const total = a ? Number(a.casper?.token?.balance ?? 0) + Number(a.base?.usdc ?? 0) : null;

  return (
    <div className="wallet-card">
      <div className="wc-head">
        <span className="overline">◆ Agent wallet</span>
        <span className="wc-live"><i />live</span>
      </div>
      <div className="wc-total">
        <div className="overline">total spendable · usd est.</div>
        <div className="v">{total != null ? `$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</div>
      </div>
      <div className="wc-rows">
        <div className="wc-row" data-chain="casper">
          <span className="edge" />
          <div>
            <div className="overline" style={{ marginBottom: 6 }}>Casper · testnet</div>
            <div className="sub"><span className="addr">{a?.casper ? short(a.casper.address) : '—'}</span>{a?.casper && <Copy value={a.casper.address} />}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="bal">{a?.casper ? `${Number(a.casper.token.balance).toLocaleString()} WISP` : '—'}</div>
            <div className="addr" style={{ marginTop: 4 }}>{a?.casper ? `${Number(a.casper.cspr).toLocaleString(undefined, { maximumFractionDigits: 1 })} CSPR` : ''}</div>
          </div>
        </div>
        <div className="wc-row" data-chain="base">
          <span className="edge" />
          <div>
            <div className="overline" style={{ marginBottom: 6 }}>Base · sepolia</div>
            <div className="sub"><span className="addr">{a?.base ? short(a.base.address) : '—'}</span>{a?.base && <Copy value={a.base.address} />}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="bal">{a?.base ? `${Number(a.base.usdc).toFixed(2)} USDC` : '—'}</div>
            <div className="addr" style={{ marginTop: 4 }}>gasless</div>
          </div>
        </div>
      </div>
      <div className="wc-foot">
        <a className="btn ghost" style={{ flex: 1 }} href={a?.casper ? `https://testnet.cspr.live/account/${a.casper.publicKey}` : '#'} target="_blank" rel="noreferrer">Casper ↗</a>
        <a className="btn ghost" style={{ flex: 1 }} href={a?.base ? `https://sepolia.basescan.org/address/${a.base.address}` : '#'} target="_blank" rel="noreferrer">Base ↗</a>
      </div>
    </div>
  );
}
