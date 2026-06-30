import { useEffect, useState } from 'react';
import { useClick } from './ClickContext';
import { config } from './config';
import { getBazaar, getAgentWisp, atomicToDecimal, type Service } from './api';

function short(addr: string) {
  return addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}

export default function App() {
  const { ready, account, signIn, signOut, buyCspr, cloudFetch } = useClick();
  const [services, setServices] = useState<Service[]>([]);
  const [query, setQuery] = useState('');
  const [agentWisp, setAgentWisp] = useState<string | null>(null);

  useEffect(() => {
    getBazaar().then((r) => setServices(r.services)).catch(() => setServices([]));
  }, []);

  useEffect(() => {
    if (!ready) return;
    getAgentWisp(cloudFetch, config.assetPackage)
      .then((b) => setAgentWisp(atomicToDecimal(b)))
      .catch(() => setAgentWisp(null));
  }, [ready, cloudFetch]);

  const filtered = query
    ? services.filter((s) => JSON.stringify(s).toLowerCase().includes(query.toLowerCase()))
    : services;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◍</span> Wisp
          <span className="net">Casper Testnet</span>
        </div>
        <div className="actions">
          <button className="ghost" onClick={buyCspr} disabled={!ready}>Buy CSPR</button>
          {account ? (
            <button className="primary" onClick={signOut}>{short(String(account.public_key ?? ''))}</button>
          ) : (
            <button className="primary" onClick={signIn} disabled={!ready}>Connect wallet</button>
          )}
        </div>
      </header>

      <section className="hero">
        <h1>Pay for APIs, autonomously.</h1>
        <p>
          Wisp gives an AI agent a real Casper wallet and the ability to settle{' '}
          <a href="https://x402.org" target="_blank" rel="noreferrer">x402</a> micropayments in{' '}
          <strong>{config.assetSymbol}</strong> — signed with EIP-712, gasless for the agent.
        </p>
      </section>

      <section className="grid">
        <div className="card agent">
          <h2>Agent wallet</h2>
          <div className="row"><span>Address</span><code>{short(config.agentAddress)}</code></div>
          <div className="row"><span>{config.assetSymbol} balance</span><strong>{agentWisp ?? (ready ? '…' : 'connect to read')}</strong></div>
          <a className="link" href={`https://testnet.cspr.live/account/${config.agentAddress.replace(/^00/, '')}`} target="_blank" rel="noreferrer">View on explorer →</a>
          <p className="hint">Fund the agent: buy CSPR (top-right), then send {config.assetSymbol} to this address from your connected wallet.</p>
        </div>

        <div className="card status">
          <h2>Stack</h2>
          <div className="row"><span>Wisp API</span><a href={config.sellerUrl} target="_blank" rel="noreferrer">casper-api ↗</a></div>
          <div className="row"><span>Wisp Hub</span><a href={config.hubUrl} target="_blank" rel="noreferrer">hub ↗</a></div>
          <div className="row"><span>Facilitator</span><span>CSPR.cloud</span></div>
          <div className="row"><span>CSPR.click</span><span>{ready ? 'ready' : 'loading…'}</span></div>
        </div>
      </section>

      <section className="bazaar">
        <div className="bazaar-head">
          <h2>Bazaar <span className="count">{filtered.length}</span></h2>
          <input placeholder="search services…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="services">
          {filtered.map((s) => (
            <div className="service" key={s.url}>
              <div className="service-top">
                <span className="cat">{s.category}</span>
                <span className="price">{s.price}</span>
              </div>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <code className="url">{s.method} {s.url}</code>
            </div>
          ))}
          {filtered.length === 0 && <p className="empty">No services found.</p>}
        </div>
      </section>

      <footer className="footer">
        <span>Casper testnet · WISP CEP-18 · x402</span>
        <a href="https://github.com/ogsamrat/casper-agentic-wallet" target="_blank" rel="noreferrer">github ↗</a>
      </footer>
    </div>
  );
}
