import { useEffect, useState } from 'react';
import { getAgent, type AgentInfo } from '../api';
import { short } from '../util';

function Copy({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy"
      title="copy address"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? '✓' : '⧉'}
    </button>
  );
}

function Balance({ chain, label, sub, value }: { chain: string; label: string; sub: string; value?: string }) {
  return (
    <div className="bal">
      <span className={`dot dot-${chain}`} />
      <div className="bal-v">{value ?? <span className="sk sk-line" />}</div>
      <div className="bal-l">{label}<em>{sub}</em></div>
    </div>
  );
}

export function WalletCard() {
  const [agent, setAgent] = useState<AgentInfo | null>(null);

  useEffect(() => {
    getAgent().then(setAgent).catch(() => setAgent(null));
  }, []);

  return (
    <div className="wallet-card">
      <div className="wc-sheen" />
      <div className="wc-head">
        <span className="wc-brand"><span className="wc-logo">◍</span> Agent wallet</span>
        <span className="wc-live"><i />live</span>
      </div>

      <div className="wc-balances">
        <Balance chain="casper" label="CSPR" sub="gas" value={agent?.casper?.cspr} />
        <Balance chain="casper" label={agent?.casper?.token.symbol ?? 'WISP'} sub="Casper x402" value={agent?.casper?.token.balance} />
        <Balance chain="base" label="USDC" sub="Base x402" value={agent?.base?.usdc} />
      </div>

      <div className="wc-addrs">
        {agent?.casper && (
          <div className="addr">
            <span className="chip chain-casper">Casper</span>
            <code>{short(agent.casper.address)}</code>
            <Copy value={agent.casper.address} />
            <a className="ext" href={`https://testnet.cspr.live/account/${agent.casper.publicKey}`} target="_blank" rel="noreferrer">↗</a>
          </div>
        )}
        {agent?.base && (
          <div className="addr">
            <span className="chip chain-base">Base</span>
            <code>{short(agent.base.address)}</code>
            <Copy value={agent.base.address} />
            <a className="ext" href={`https://sepolia.basescan.org/address/${agent.base.address}`} target="_blank" rel="noreferrer">↗</a>
          </div>
        )}
      </div>
    </div>
  );
}
