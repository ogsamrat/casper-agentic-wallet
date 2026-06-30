const ITEMS = ['x402', 'Casper', 'Base', 'USDC', 'WISP', 'EIP-712', 'EIP-3009', 'CEP-18', 'MCP', 'CSPR.click', 'Coinbase x402 Bazaar', 'gasless'];

export function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((t, i) => (
          <span key={i} className="marquee-item">{t}<i className="marquee-dot" /></span>
        ))}
      </div>
    </div>
  );
}
