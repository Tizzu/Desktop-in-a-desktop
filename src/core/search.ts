import { browser } from 'wxt/browser';
import { resolveQuery } from '../widgets/links';

/** Cerca col motore predefinito del browser (permesso `search`); un indirizzo viene aperto direttamente. */
export function runSearch(raw: string, newTab = false) {
  const q = resolveQuery(raw);
  if (!q) return;
  if (q.kind === 'url') {
    if (newTab) window.open(q.href, '_blank', 'noopener,noreferrer');
    else window.location.href = q.href;
    return;
  }
  Promise.resolve()
    .then(() => browser.search.query({ text: q.text, disposition: newTab ? 'NEW_TAB' : 'CURRENT_TAB' }))
    .catch(() => {
      window.location.href = `https://duckduckgo.com/?q=${encodeURIComponent(q.text)}`;
    });
}
