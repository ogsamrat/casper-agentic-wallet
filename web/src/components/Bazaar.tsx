import { useState } from 'react';
import type { Service } from '../api';

function ServiceCard({ s }: { s: Service }) {
  return (
    <div className="service">
      <div className="service-top">
        <span className="cat">{s.category}</span>
        <span className="price">{s.price}</span>
      </div>
      <h3>{s.name}</h3>
      <p>{s.description}</p>
      <code className="url">{s.method} {s.url}</code>
    </div>
  );
}

export function Bazaar({ services }: { services: Service[] }) {
  const [query, setQuery] = useState('');
  const filtered = query
    ? services.filter((s) => JSON.stringify(s).toLowerCase().includes(query.toLowerCase()))
    : services;
  return (
    <section className="bazaar">
      <div className="bazaar-head">
        <h2>Bazaar <span className="count">{filtered.length}</span></h2>
        <input placeholder="search services…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="services">
        {filtered.map((s) => <ServiceCard key={s.url} s={s} />)}
        {filtered.length === 0 && <p className="empty">No services found.</p>}
      </div>
    </section>
  );
}
