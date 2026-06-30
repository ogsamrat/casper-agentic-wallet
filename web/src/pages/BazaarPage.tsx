import { useEffect, useState } from 'react';
import { getBazaar, type Service } from '../api';
import { Bazaar } from '../components/Bazaar';

export function BazaarPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBazaar()
      .then((r) => setServices(r.services))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <header className="page-head">
        <p className="kicker">Marketplace</p>
        <h1>The bazaar</h1>
        <p className="lead">x402 services from Wisp and the Coinbase x402 Bazaar. Pay any service on a network this wallet funds — Casper testnet or Base Sepolia — in one click.</p>
      </header>
      <Bazaar services={services} loading={loading} />
    </div>
  );
}
