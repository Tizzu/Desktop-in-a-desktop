import { sanitize } from './storage';
import type { AppData } from './types';

const FORMAT = 'desktop-in-a-desktop';

/** Contenuto del file di esportazione: tutti gli spazi, i widget con il loro stato e le impostazioni. */
export const exportJson = (data: AppData, now = new Date()) =>
  JSON.stringify({ format: FORMAT, exportedAt: now.toISOString(), data });

export const exportFileName = (now = new Date()) => `desktop-in-a-desktop-${now.toISOString().slice(0, 10)}.json`;

/**
 * Legge un file di esportazione (o un salvataggio grezzo). I dati passano dalla stessa pulizia e migrazione di quelli
 * letti dal database, quindi anche un file di una versione precedente si apre. Restituisce undefined se non è valido.
 */
export function parseImport(text: string): AppData | undefined {
  try {
    const raw = JSON.parse(text);
    if (raw && typeof raw === 'object' && 'format' in raw) return raw.format === FORMAT ? sanitize(raw.data) : undefined;
    return sanitize(raw);
  } catch {
    return undefined;
  }
}

// --- Esportazione come testo: una stringa da incollare in una chat al posto del file ---

const PREFIX = 'DIAD1:';
const SUFFIX = ':END'; // il testo intorno (parole in una chat) si distingue dal contenuto solo grazie a un terminatore

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Base64 "url-safe" senza riempimento: nessun carattere che una chat possa interpretare (+ / =). */
function toBase64Url(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string) {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Gli stessi dati dell'esportazione su file, compressi e scritti su una sola riga di testo. */
export async function exportText(data: AppData, now = new Date()) {
  const packed = await pipe(new TextEncoder().encode(exportJson(data, now)), new CompressionStream('gzip'));
  return PREFIX + toBase64Url(packed) + SUFFIX;
}

/** Legge il testo prodotto da `exportText`, anche se la chat lo ha spezzato su più righe o ci ha messo parole intorno. */
export async function parseImportText(text: string): Promise<AppData | undefined> {
  const m = /DIAD1:([A-Za-z0-9_\-\s]*?):END/.exec(text);
  if (!m) return undefined;
  try {
    const unpacked = await pipe(fromBase64Url(m[1]!.replace(/\s+/g, '')), new DecompressionStream('gzip'));
    return parseImport(new TextDecoder().decode(unpacked));
  } catch {
    return undefined;
  }
}
