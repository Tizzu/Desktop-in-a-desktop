import type { AppData } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
const MAX_CHARS = 20000;

/** Tutto il testo leggibile di uno stato di widget (note, voci, titoli…), senza id, immagini e numeri. */
export function widgetText(state: unknown): string {
  const out: string[] = [];
  let size = 0;
  const walk = (v: unknown, depth: number) => {
    if (size > MAX_CHARS || depth > 6) return;
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t || UUID.test(t) || t.startsWith('data:') || t.length > 5000) return;
      out.push(t);
      size += t.length;
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) if (k !== 'id' && k !== 'progress') walk(x, depth + 1);
    }
  };
  walk(state, 0);
  return out.join(' ');
}

export interface Found { ws: string; space: string; id: string; label: string; snippet: string }

const SNIPPET = 60;

const fold = (s: string) => s.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/** Un tratto di testo attorno al punto in cui compare la ricerca. */
function around(text: string, query: string): string {
  const i = fold(text).indexOf(query);
  if (i < 0) return text.slice(0, SNIPPET);
  const from = Math.max(0, i - 20);
  return `${from > 0 ? '…' : ''}${text.slice(from, from + SNIPPET)}${from + SNIPPET < text.length ? '…' : ''}`;
}

/**
 * Cerca nel testo e nel nome dei widget di tutti gli spazi (senza badare a maiuscole e accenti).
 * `label` dà il nome (già tradotto) di un widget; la ricerca vuota non trova niente.
 */
export function findWidgets(data: AppData, query: string, label: (type: string, state: unknown) => string, limit = 30): Found[] {
  const q = fold(query.trim());
  if (!q) return [];
  const found: Found[] = [];
  for (const w of data.workspaces) {
    for (const x of w.widgets) {
      const name = label(x.type, x.state);
      const text = widgetText(x.state);
      const inName = fold(name).includes(q);
      if (!inName && !fold(text).includes(q)) continue;
      found.push({ ws: w.id, space: w.name, id: x.id, label: name, snippet: fold(text).includes(q) ? around(text, q) : '' });
      if (found.length >= limit) return found;
    }
  }
  return found;
}
