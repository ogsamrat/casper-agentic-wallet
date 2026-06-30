import { useClick } from '../ClickContext';

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="stat">
      <div className="stat-n">{n}</div>
      <div className="stat-l">{l}</div>
    </div>
  );
}

export function Hero({ servicesCount }: { servicesCount: number }) {
  const { ready, account, signIn, buyCspr } = useClick();
  return (
    <section className="hero">
      <span className="pill"><i className="pulse" /> Live · Casper testnet + Base Sepolia</span>
      <h1>The wallet that lets <span className="grad">agents pay</span><br />for anything.</h1>
      <p>
        Wisp settles <a href="https://x402.org" target="_blank" rel="noreferrer">x402</a> micropayments
        autonomously — WISP on Casper and real USDC on Base — choosing the rail per request, signed with
        EIP-712, gasless for the agent.
      </p>
      <div className="hero-cta">
        {!account && <button className="primary lg" onClick={signIn} disabled={!ready}>Connect wallet</button>}
        <button className="ghost lg" onClick={buyCspr} disabled={!ready}>Buy CSPR</button>
        <a className="ghost lg" href="#bazaar">Browse the bazaar →</a>
      </div>
      <div className="stats">
        <Stat n={servicesCount ? String(servicesCount) : '—'} l="x402 services" />
        <Stat n="2" l="chains" />
        <Stat n="~5s" l="settlement" />
        <Stat n="$0" l="agent gas" />
      </div>
    </section>
  );
}
