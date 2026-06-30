import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useClick } from '../ClickContext';
import { short } from '../util';

export function Nav() {
  const { ready, account, signIn, signOut } = useClick();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-in">
        <NavLink to="/" className="brand"><span className="dot" /> Wisp</NavLink>
        <nav className="links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/bazaar">Bazaar</NavLink>
          <NavLink to="/wallet">Wallet</NavLink>
          <NavLink to="/docs">Docs</NavLink>
        </nav>
        <div className="nav-right">
          <div className="netcluster">
            <span className="c"><i className="cdot casper" />CSPR</span>
            <span className="c"><i className="cdot base" />BASE</span>
          </div>
          {account
            ? <button className="btn ghost" onClick={signOut}>{short(String(account.public_key ?? ''))}</button>
            : <button className="btn solid" onClick={signIn} disabled={!ready}>Connect</button>}
        </div>
      </div>
    </header>
  );
}
