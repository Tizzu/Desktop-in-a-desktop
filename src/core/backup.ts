import { sanitize } from './storage';
import { SCHEMA_VERSION, type AppData } from './types';

const FORMAT = 'desktop-in-a-desktop';

/** Contenuto del file di esportazione: tutti gli spazi, i widget con il loro stato e le impostazioni. `appVersion` (la versione dell'estensione) serve a chi lo importa, per sapere da quale versione arriva. */
export const exportJson = (data: AppData, now = new Date(), appVersion?: string) =>
  JSON.stringify({ format: FORMAT, exportedAt: now.toISOString(), ...(appVersion ? { appVersion } : {}), data });

export const exportFileName = (now = new Date()) => `desktop-in-a-desktop-${now.toISOString().slice(0, 10)}.json`;

/** Esito della lettura di un backup. «newer»: il formato dei dati è più recente di quello che questa versione conosce. */
export type ImportResult =
  | { ok: true; data: AppData }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'newer'; /** versione del formato del backup */ version: number; /** versione dell'estensione che l'ha scritto, se indicata */ appVersion?: string };

/**
 * Legge un file di esportazione (o un salvataggio grezzo). I dati passano dalla stessa pulizia e migrazione di quelli
 * letti dal database, quindi anche un file di una versione precedente si apre. Uno più recente di quanto questa versione
 * conosce non si tocca: leggerlo con le regole di oggi ne perderebbe una parte.
 */
export function readImport(text: string): ImportResult {
  try {
    const raw = JSON.parse(text);
    const wrapped = !!raw && typeof raw === 'object' && 'format' in raw;
    if (wrapped && raw.format !== FORMAT) return { ok: false, reason: 'invalid' };
    const inner = wrapped ? raw.data : raw;
    const v = (inner as { version?: unknown } | null)?.version;
    // Dev'essere un backup nostro (con l'intestazione, o almeno con uno spazio attivo) e non un JSON qualunque che ha un campo "version".
    const ours = wrapped || typeof (inner as { activeWorkspaceId?: unknown } | null)?.activeWorkspaceId === 'string';
    if (ours && typeof v === 'number' && Number.isInteger(v) && v > SCHEMA_VERSION) {
      return { ok: false, reason: 'newer', version: v, appVersion: wrapped && typeof raw.appVersion === 'string' ? raw.appVersion.slice(0, 32) : undefined };
    }
    const data = sanitize(inner);
    return data ? { ok: true, data } : { ok: false, reason: 'invalid' };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

/** Come `readImport`, ma restituisce solo i dati (o undefined se il backup non è valido o è troppo recente). */
export const parseImport = (text: string): AppData | undefined => {
  const r = readImport(text);
  return r.ok ? r.data : undefined;
};

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
export async function exportText(data: AppData, now = new Date(), appVersion?: string) {
  const packed = await pipe(new TextEncoder().encode(exportJson(data, now, appVersion)), new CompressionStream('gzip'));
  return PREFIX + toBase64Url(packed) + SUFFIX;
}

/** Legge il testo prodotto da `exportText`, anche se la chat lo ha spezzato su più righe o ci ha messo parole intorno. */
export async function readImportText(text: string): Promise<ImportResult> {
  const m = /DIAD1:([A-Za-z0-9_\-\s]*?):END/.exec(text);
  if (!m) return { ok: false, reason: 'invalid' };
  try {
    const unpacked = await pipe(fromBase64Url(m[1]!.replace(/\s+/g, '')), new DecompressionStream('gzip'));
    return readImport(new TextDecoder().decode(unpacked));
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

export async function parseImportText(text: string): Promise<AppData | undefined> {
  const r = await readImportText(text);
  return r.ok ? r.data : undefined;
}
