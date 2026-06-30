import { NavLink } from 'react-router-dom';
import { useClick } from '../ClickContext';
import { short } from '../util';

export function Nav() {
  const { ready, account, signIn, signOut } = useClick();
  return (
    <header className="nav">
      <div className="nav-in">
        <NavLink to="/" className="brand"><span className="logo" /> Wisp</NavLink>
        <nav className="links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/bazaar">Bazaar</NavLink>
          <NavLink to="/wallet">Wallet</NavLink>
          <NavLink to="/docs">Docs</NavLink>
        </nav>
        <div className="nav-cta">
          {account ? (
            <button className="btn ghost" onClick={signOut}>{short(String(account.public_key ?? ''))}</button>
          ) : (
            <button className="btn solid" onClick={signIn} disabled={!ready}>Connect</button>
          )}
        </div>
      </div>
    </header>
  );
}
