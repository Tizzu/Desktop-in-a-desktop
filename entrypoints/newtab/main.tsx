import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '../../src/App';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import '../../src/styles.css';

try {
  const theme = localStorage.getItem('theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch { /* storage non disponibile */ }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallback={<p className="app-error" role="alert">Qualcosa è andato storto. Ricarica la pagina: i tuoi dati non sono stati toccati.</p>}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
