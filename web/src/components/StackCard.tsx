import { config } from '../config';
import { useClick } from '../ClickContext';

export function StackCard() {
  const { ready } = useClick();
  return (
    <div className="card status">
      <h2>Stack</h2>
      <div className="row"><span>Wisp API</span><a href={config.sellerUrl} target="_blank" rel="noreferrer">casper-api ↗</a></div>
      <div className="row"><span>Wisp Hub</span><a href={config.hubUrl} target="_blank" rel="noreferrer">hub ↗</a></div>
      <div className="row"><span>Facilitator</span><span>CSPR.cloud</span></div>
      <div className="row"><span>CSPR.click</span><span>{ready ? 'ready' : 'loading…'}</span></div>
    </div>
  );
}
