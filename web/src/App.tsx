import { useEffect, useState } from 'react';
import { useClick } from './ClickContext';
import { config } from './config';
import { getBazaar, getAgentWisp, atomicToDecimal, type Service } from './api';
import { Header } from './components/Header';
import { AgentCard } from './components/AgentCard';
import { StackCard } from './components/StackCard';
import { Bazaar } from './components/Bazaar';
import { Footer } from './components/Footer';

export default function App() {
  const { ready, cloudFetch } = useClick();
  const [services, setServices] = useState<Service[]>([]);
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

  return (
    <div className="app">
      <Header />
      <section className="hero">
        <h1>Pay for APIs, autonomously.</h1>
        <p>
          Wisp gives an AI agent a real Casper wallet and the ability to settle{' '}
          <a href="https://x402.org" target="_blank" rel="noreferrer">x402</a> micropayments in{' '}
          <strong>{config.assetSymbol}</strong> — signed with EIP-712, gasless for the agent.
        </p>
      </section>
      <section className="grid">
        <AgentCard ready={ready} balance={agentWisp} />
        <StackCard />
      </section>
      <Bazaar services={services} />
      <Footer />
    </div>
  );
}
