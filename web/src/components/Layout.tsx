import { Outlet } from 'react-router-dom';
import { Nav } from './Nav';
import { Footer } from './Footer';

export function Layout() {
  return (
    <>
      <Nav />
      <main className="page">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
