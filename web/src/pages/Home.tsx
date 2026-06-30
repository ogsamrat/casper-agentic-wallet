import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getBazaar } from '../api';
import { SettlementFeed } from '../components/SettlementFeed';
import { Reveal } from '../components/Reveal';

const STEPS = [
  { n: '01', t: 'Discover', d: 'Browse the bazaar — Wisp services plus the Coinbase x402 Bazaar, across chains.' },
  { n: '02', t: 'Authorize', d: 'The agent signs an EIP-712 / EIP-3009 authorization. No gas, nothing broadcast by the payer.' },
  { n: '03', t: 'Settle', d: 'A facilitator verifies and settles on-chain; the API returns its data in the same round-trip.' },
];
const FEATURES = [
  { t: 'Cross-chain by default', d: 'One wallet pays WISP on Casper or USDC on Base — the rail is read from the 402 itself.' },
  { t: 'Gasless settlement', d: 'Authorizations are signed off-chain; a facilitator submits and sponsors the gas.' },
  { t: 'Budget guardrails', d: 'Per-call and per-day caps are enforced before anything is ever signed.' },
  { t: 'A real marketplace', d: 'Discover and pay live x402 services, with a transparent marketplace fee.' },
];

export function Home() {
  const [count, setCount] = useState<number | null>(null);
  const [payable, setPayable] = useState<number | null>(null);
  useEffect(() => {
    getBazaar().then((r) => { setCount(r.services.length); setPayable(r.services.filter((s) => s.payable !== false).length); }).catch(() => {});
  }, []);

  return (
    <div className="container wide">
      <section className="hero">
        <div className="hero-copy">
          <div className="overline" style={{ color: 'var(--accent)' }}>x402 · cross-chain payments</div>
          <h1 className="display">Your agent pays<br />the <em>open web</em>.</h1>
          <p className="hero-sub">One agent wallet, two testnets, {count ?? '…'} paid services — settled gasless over x402: WISP on Casper, USDC on Base.</p>
          <div className="hero-cta">
            <Link className="btn solid lg" to="/bazaar">Open the bazaar</Link>
            <Link className="text-link" to="/docs">Read the docs →</Link>
          </div>
          <div className="stat-strip">
            <span><b>{count ?? '—'}</b> listings</span>
            <span><b>{payable ?? '—'}</b> payable now</span>
            <span><b>2</b> chains</span>
            <span><b>$0</b> agent gas</span>
          </div>
        </div>
        <div className="hero-feed"><SettlementFeed /></div>
      </section>

      <section className="section">
        <Reveal><div className="kicker"><span className="idx">01</span> How it works</div><h2 className="section-h">Request, authorize, settle — one round-trip.</h2></Reveal>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={100 + i * 100}>
              <div className="step"><span className="n">{s.n}</span><h3>{s.t}</h3><p>{s.d}</p></div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <Reveal><div className="kicker"><span className="idx">02</span> Why Wisp</div><h2 className="section-h">Built for autonomous, cross-chain commerce.</h2></Reveal>
        <div className="features">
          {FEATURES.map((f) => <div className="feature" key={f.t}><h3>{f.t}</h3><p>{f.d}</p></div>)}
        </div>
      </section>

      <section className="cta">
        <h2>Give your agent a wallet.</h2>
        <Link className="btn solid lg" to="/wallet">Open the wallet →</Link>
      </section>
    </div>
  );
}
