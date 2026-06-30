import { WalletCard } from '../components/WalletCard';
import { StackCard } from '../components/StackCard';
import { useClick } from '../ClickContext';

export function WalletPage() {
  const { ready, buyCspr } = useClick();
  return (
    <div className="container">
      <header className="page-head">
        <p className="kicker">Wallet</p>
        <h1>The agent wallet</h1>
        <p className="lead">Live multi-chain balances, and how to keep the agent funded.</p>
      </header>
      <div className="wallet-grid">
        <WalletCard />
        <div className="wallet-side">
          <StackCard />
          <div className="fund-box">
            <h3>Fund the agent</h3>
            <ul>
              <li>Buy CSPR with a card via the CSPR.click on-ramp.</li>
              <li>Send <strong>WISP</strong> to the Casper address to pay x402 on Casper.</li>
              <li>Send <strong>USDC</strong> to the Base address to pay x402 on Base.</li>
            </ul>
            <button className="btn solid" onClick={buyCspr} disabled={!ready}>Buy CSPR</button>
          </div>
        </div>
      </div>
    </div>
  );
}
