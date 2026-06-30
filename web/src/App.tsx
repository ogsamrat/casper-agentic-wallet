import { useEffect, useState } from 'react';
import { getBazaar, type Service } from './api';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { WalletCard } from './components/WalletCard';
import { StackCard } from './components/StackCard';
import { Bazaar } from './components/Bazaar';
import { Footer } from './components/Footer';

export default function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBazaar()
      .then((r) => setServices(r.services))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="aurora" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Header />
      <main className="app">
        <Hero servicesCount={services.length} />
        <section className="grid reveal">
          <WalletCard />
          <StackCard />
        </section>
        <Bazaar services={services} loading={loading} />
      </main>
      <Footer />
    </>
  );
}
