import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-in">
        <div className="footer-brand"><span className="dot" /> Wisp</div>
        <nav className="footer-links">
          <Link to="/bazaar">Bazaar</Link>
          <Link to="/wallet">Wallet</Link>
          <Link to="/docs">Docs</Link>
          <a href="https://github.com/ogsamrat/casper-agentic-wallet" target="_blank" rel="noreferrer">GitHub ↗</a>
        </nav>
        <span className="footer-meta">Casper testnet · Base Sepolia · x402</span>
      </div>
    </footer>
  );
}
