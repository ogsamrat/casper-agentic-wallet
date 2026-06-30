import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClickProvider } from './ClickContext';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClickProvider>
      <App />
    </ClickProvider>
  </StrictMode>,
);
