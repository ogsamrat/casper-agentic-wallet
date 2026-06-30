import { describe, it, expect } from 'vitest';
import { Bazaar } from '../src/bazaar.js';

const svc = (name: string, category: string) => ({
  name, url: `http://x/${name}`, method: 'GET', price: '0.001 WISP',
  asset: 'a', network: 'casper:casper-test', category, description: `${category} service`,
});

describe('Bazaar', () => {
  it('registers and lists services', () => {
    const b = new Bazaar();
    b.register(svc('weather', 'weather'));
    expect(b.size).toBe(1);
    expect(b.list()).toHaveLength(1);
  });

  it('dedupes by url', () => {
    const b = new Bazaar();
    b.register(svc('weather', 'weather'));
    b.register(svc('weather', 'weather'));
    expect(b.size).toBe(1);
  });

  it('filters by query', () => {
    const b = new Bazaar();
    b.register(svc('weather', 'weather'));
    b.register(svc('fx', 'finance'));
    expect(b.list('weather')).toHaveLength(1);
    expect(b.list('finance')).toHaveLength(1);
    expect(b.list('nonexistent')).toHaveLength(0);
  });
});
