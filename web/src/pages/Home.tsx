import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBazaar } from '../api';
import { WalletCard } from '../components/WalletCard';

function Stat({ n, l }: { n: string; l: string }) {
  return <div className="stat"><div className="stat-n">{n}</div><div className="stat-l">{l}</div></div>;
}
function Step({ k, t, d }: { k: string; t: string; d: string }) {
  return (
    <div className="step">
      <span className="step-k">{k}</span>
      <h3>{t}</h3>
      <p>{d}</p>
    </div>
  );
}
function Feature({ t, d }: { t: string; d: string }) {
  return <div className="feature"><h3>{t}</h3><p>{d}</p></div>;
}

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

      <section className="band">
        <Stat n={count != null ? String(count) : '—'} l="x402 services" />
        <Stat n="2" l="chains" />
        <Stat n="~5s" l="settlement" />
        <Stat n="$0" l="gas for the agent" />
      </section>

      <section className="block">
        <p className="kicker">How it works</p>
        <h2 className="section-h">From request to paid response, in three steps.</h2>
        <div className="step-grid">
          <Step k="01" t="Discover" d="Browse the bazaar — Wisp's own catalog plus the Coinbase x402 Bazaar, across chains." />
          <Step k="02" t="Authorize" d="The agent signs an EIP-712 / EIP-3009 authorization. No gas, nothing broadcast by the payer." />
          <Step k="03" t="Settle" d="A facilitator verifies and settles on-chain; the API returns its data in the same round-trip." />
        </div>
      </section>

      <section className="block">
        <p className="kicker">Why Wisp</p>
        <h2 className="section-h">Built for autonomous, cross-chain commerce.</h2>
        <div className="feature-grid">
          <Feature t="Cross-chain by default" d="One wallet pays WISP on Casper or USDC on Base — the rail is chosen from the 402 itself." />
          <Feature t="Gasless settlement" d="Authorizations are signed off-chain; a facilitator submits and sponsors gas." />
          <Feature t="Budget guardrails" d="Per-call and per-day caps are enforced before anything is signed." />
          <Feature t="A real marketplace" d="Discover and pay dozens of x402 services, with a transparent marketplace fee." />
        </div>
      </section>

      <section className="cta">
        <h2>Give your agent a wallet.</h2>
        <Link className="btn solid lg" to="/wallet">Open the wallet</Link>
      </section>
    </div>
  );
}
