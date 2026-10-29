import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '../../src/App';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { isLang, translate, type Lang } from '../../src/core/i18n';
import '../../src/styles.css';

let lang: Lang = 'en';
try {
  const saved = localStorage.getItem('language');
  if (isLang(saved)) lang = saved;
  document.documentElement.lang = lang;
} catch { /* storage non disponibile */ }

try {
  const theme = localStorage.getItem('theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch { /* storage non disponibile */ }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallback={<p className="app-error" role="alert">{translate(lang, 'Something went wrong. Reload the page: your data has not been touched.')}</p>}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
