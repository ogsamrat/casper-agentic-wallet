import { useClick } from '../ClickContext';
import { short } from '../util';

export function Header() {
  const { ready, account, signIn, signOut, buyCspr } = useClick();
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">◍</span> Wisp
        <span className="net">Casper Testnet</span>
      </div>
      <div className="actions">
        <button className="ghost" onClick={buyCspr} disabled={!ready}>Buy CSPR</button>
        {account ? (
          <button className="primary" onClick={signOut}>{short(String(account.public_key ?? ''))}</button>
        ) : (
          <button className="primary" onClick={signIn} disabled={!ready}>Connect wallet</button>
        )}
      </div>
    </header>
  );
}
