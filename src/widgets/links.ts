/** Normalizza un indirizzo digitato dall'utente; accetta solo http/https (mai javascript:, data: ecc.). */
export function normalizeUrl(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export type Query = { kind: 'url'; href: string } | { kind: 'search'; text: string };

/** Decide se il testo digitato è un indirizzo da aprire o una ricerca. */
export function resolveQuery(input: string): Query | null {
  const t = input.trim();
  if (!t) return null;
  const looksLikeUrl = !/\s/.test(t) && (/^https?:\/\//i.test(t) || /^[\w-]+(\.[\w-]+)*\.[a-z]{2,}([/:?#]\S*)?$/i.test(t));
  if (looksLikeUrl) {
    const href = normalizeUrl(t);
    if (href) return { kind: 'url', href };
  }
  return { kind: 'search', text: t };
}

/** Porta l'elemento `id` in posizione `index` (contata sulla lista senza l'elemento stesso); fuori misura va agli estremi. */
export function placeItem<T extends { id: string }>(items: T[], id: string, index: number): T[] {
  const item = items.find((x) => x.id === id);
  if (!item) return items;
  const rest = items.filter((x) => x.id !== id);
  const at = Math.max(0, Math.min(index, rest.length));
  return [...rest.slice(0, at), item, ...rest.slice(at)];
}
