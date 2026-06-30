import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBazaar } from '../api';
import { WalletCard } from '../components/WalletCard';
import { Reveal } from '../components/Reveal';
import { Marquee } from '../components/Marquee';

const STEPS = [
  { k: '01', t: 'Discover', d: "Browse the bazaar — Wisp's own catalog plus the Coinbase x402 Bazaar, across chains." },
  { k: '02', t: 'Authorize', d: 'The agent signs an EIP-712 / EIP-3009 authorization. No gas, nothing broadcast by the payer.' },
  { k: '03', t: 'Settle', d: 'A facilitator verifies and settles on-chain; the API returns its data in the same round-trip.' },
];
const FEATURES = [
  { t: 'Cross-chain by default', d: 'One wallet pays WISP on Casper or USDC on Base — the rail is chosen from the 402 itself.' },
  { t: 'Gasless settlement', d: 'Authorizations are signed off-chain; a facilitator submits and sponsors the gas.' },
  { t: 'Budget guardrails', d: 'Per-call and per-day caps are enforced before anything is ever signed.' },
  { t: 'A real marketplace', d: 'Discover and pay dozens of x402 services, with a transparent marketplace fee.' },
];

export function Home() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => { getBazaar().then((r) => setCount(r.services.length)).catch(() => {}); }, []);

  return (
    <div className="container">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">x402 payments · Casper + Base</span>
          <h1>The wallet that lets AI&nbsp;agents <em>pay for anything</em>.</h1>
          <p>
            Wisp settles internet-native micropayments autonomously — WISP on Casper and real USDC on
            Base — choosing the rail per request, signed with EIP-712, gasless for the agent.
          </p>
          <div className="hero-cta">
            <Link className="btn solid lg" to="/bazaar">Explore the bazaar</Link>
            <Link className="btn ghost lg" to="/docs">How it works →</Link>
          </div>
        </div>
        <div className="hero-card"><WalletCard /></div>
      </section>

      <Reveal>
        <section className="band">
          <div className="stat"><div className="stat-n">{count != null ? count : '—'}</div><div className="stat-l">x402 services</div></div>
          <div className="stat"><div className="stat-n">2</div><div className="stat-l">chains</div></div>
          <div className="stat"><div className="stat-n">~5s</div><div className="stat-l">settlement</div></div>
          <div className="stat"><div className="stat-n">$0</div><div className="stat-l">gas for the agent</div></div>
        </section>
      </Reveal>

      <Marquee />

      <section className="block">
        <Reveal><p className="kicker">How it works</p><h2 className="section-h">From request to paid response, in three steps.</h2></Reveal>
        <div className="step-grid">
          {STEPS.map((s, i) => (
            <Reveal key={s.k} delay={120 + i * 110}>
              <div className="step"><span className="step-k">{s.k}</span><h3>{s.t}</h3><p>{s.d}</p></div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="block">
        <Reveal><p className="kicker">Why Wisp</p><h2 className="section-h">Built for autonomous, cross-chain commerce.</h2></Reveal>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={120 + i * 90}>
              <div className="feature"><h3>{f.t}</h3><p>{f.d}</p></div>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="cta">
          <h2>Give your agent a wallet.</h2>
          <Link className="btn solid lg" to="/wallet">Open the wallet</Link>
        </section>
      </Reveal>
    </div>
  );
}
