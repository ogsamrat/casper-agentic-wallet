import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { BazaarPage } from './pages/BazaarPage';
import { WalletPage } from './pages/WalletPage';
import { DocsPage } from './pages/DocsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="bazaar" element={<BazaarPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="docs" element={<DocsPage />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
