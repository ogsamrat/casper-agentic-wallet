import { config } from '../config';
import { short } from '../util';

export function AgentCard({ ready, balance }: { ready: boolean; balance: string | null }) {
  return (
    <div className="card agent">
      <h2>Agent wallet</h2>
      <div className="row"><span>Address</span><code>{short(config.agentAddress)}</code></div>
      <div className="row">
        <span>{config.assetSymbol} balance</span>
        <strong>{balance ?? (ready ? '…' : 'connect to read')}</strong>
      </div>
      <a className="link" href={`https://testnet.cspr.live/account/${config.agentAddress.replace(/^00/, '')}`} target="_blank" rel="noreferrer">View on explorer →</a>
      <p className="hint">Fund the agent: buy CSPR (top-right), then send {config.assetSymbol} to this address from your connected wallet.</p>
    </div>
  );
}
