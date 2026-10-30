import { openDB, type IDBPDatabase } from 'idb';
import { THEMES } from './themes';
import { isLang } from './i18n';
import { CATEGORY_IDS, DEFAULT_SETTINGS, SCHEMA_VERSION, type AppData, type Settings } from './types';

export interface Storage {
  load(): Promise<AppData | undefined>;
  save(data: AppData): Promise<void>;
}

const DB_NAME = 'desktop-in-a-desktop';
const STORE = 'app';
const KEY = 'data';

export function createIdbStorage(dbName = DB_NAME): Storage {
  let dbPromise: Promise<IDBPDatabase> | undefined;
  const db = () =>
    (dbPromise ??= openDB(dbName, 1, {
      upgrade(d) {
        d.createObjectStore(STORE);
      },
    }));

  return {
    async load() {
      return sanitize(await (await db()).get(STORE, KEY));
    },
    async save(data) {
      await (await db()).put(STORE, data, KEY);
    },
  };
}

function migrateSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings> & { adaptColors?: boolean };
  const { adaptColors, ...rest } = r;
  const merged = { ...DEFAULT_SETTINGS, ...rest, theme: rest.theme ?? (adaptColors ? 'system' : DEFAULT_SETTINGS.theme) };
  // Valori sconosciuti (dati vecchi o rovinati) tornano al predefinito invece di rompere l'interfaccia.
  if (!THEMES.some((t) => t.id === merged.theme)) merged.theme = DEFAULT_SETTINGS.theme;
  if (!isLang(merged.language)) merged.language = DEFAULT_SETTINGS.language;
  if (merged.drawerStyle !== 'tucked' && merged.drawerStyle !== 'slanted') merged.drawerStyle = DEFAULT_SETTINGS.drawerStyle;
  if (merged.activeCategory !== 'all' && !CATEGORY_IDS.includes(merged.activeCategory)) merged.activeCategory = 'all';
  for (const k of ['tilt', 'physics', 'categories', 'searchBar'] as const) if (typeof merged[k] !== 'boolean') merged[k] = DEFAULT_SETTINGS[k];
  return merged;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Ripulisce i dati letti dal disco: scarta ciò che non è utilizzabile (spazi o widget senza id, coordinate non
 * numeriche…) invece di far bloccare l'app. Restituisce undefined se non resta niente di valido.
 */
export function sanitize(raw: unknown): AppData | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const d = raw as Partial<AppData>;
  if (!Array.isArray(d.workspaces)) return undefined;
  const workspaces = d.workspaces
    .filter((w) => w && typeof w === 'object' && typeof w.id === 'string')
    .map((w, i) => ({
      id: w.id,
      name: typeof w.name === 'string' ? w.name : `Space ${i + 1}`,
      order: isNum(w.order) ? w.order : i,
      links: w.links,
      widgets: (Array.isArray(w.widgets) ? w.widgets : [])
        .filter((x) => x && typeof x === 'object' && typeof x.id === 'string' && typeof x.type === 'string' && isNum(x.x) && isNum(x.y) && isNum(x.w) && isNum(x.h))
        .map((x) => ({ ...x, z: isNum(x.z) ? x.z : 1 })),
    }));
  if (workspaces.length === 0) return undefined;
  const activeWorkspaceId = workspaces.some((w) => w.id === d.activeWorkspaceId) ? d.activeWorkspaceId! : workspaces[0]!.id;
  return migrate({ ...(d as AppData), workspaces, activeWorkspaceId }, viewCenter());
}

/** Centro approssimato della tela (finestra meno barra dei cassetti e barra degli spazi), per migrare dalle coordinate assolute. */
const viewCenter = () => (typeof window === 'undefined' ? undefined : { x: window.innerWidth / 2, y: (window.innerHeight - 92) / 2 });

// Punto unico per le migrazioni di schema (v1 -> v2: settings e rotazione; v2 -> v3: coordinate rispetto al centro,
// per cui serve `center`, il centro della tela di quel momento; senza, le posizioni restano com'erano).
export function migrate(data: AppData, center?: { x: number; y: number }): AppData {
  const absolute = data.version < 3 && center;
  return {
    ...data,
    version: SCHEMA_VERSION,
    settings: migrateSettings((data as { settings?: unknown }).settings),
    workspaces: data.workspaces.map((w) => {
      const ids = new Set(w.widgets.map((x) => x.id));
      const hosts = new Set(w.widgets.filter((x) => typeof x.parent !== 'string').map((x) => x.id));
      const links = (Array.isArray(w.links) ? w.links : []).filter(
        (l): l is [string, string] => Array.isArray(l) && l.length === 2 && l[0] !== l[1] && ids.has(l[0]) && ids.has(l[1]),
      );
      return {
        ...w,
        links,
        widgets: w.widgets.map((x) => {
          // Un parent che non esiste (o che non è sulla tela) non ha senso: il widget torna libero.
          const parent = typeof x.parent === 'string' && hosts.has(x.parent) && x.parent !== x.id ? x.parent : undefined;
          const shifted = absolute && !parent ? { x: x.x - center.x, y: x.y - center.y } : {};
          return { ...x, ...shifted, parent, rot: x.rot ?? 0 };
        }),
      };
    }),
  };
}

export function createDefaultData(): AppData {
  const id = crypto.randomUUID();
  return {
    version: SCHEMA_VERSION,
    activeWorkspaceId: id,
    settings: { ...DEFAULT_SETTINGS },
    workspaces: [{ id, name: 'Space 1', order: 0, widgets: [], links: [] }],
  };
}

// Copia di sicurezza sincrona: alla chiusura della pagina la scrittura su IndexedDB (asincrona) può non fare in tempo,
// localStorage invece sì. Alla riapertura, se c'è, è per definizione più recente del database.
const BACKUP_KEY = 'pendingSave';

export function backupPending(data: AppData) {
  try { localStorage.setItem(BACKUP_KEY, JSON.stringify(data)); } catch { /* quota piena o storage bloccato */ }
}

/** Legge la copia di sicurezza (senza cancellarla: sparisce dopo il primo salvataggio riuscito). */
export function readBackup(): AppData | undefined {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? sanitize(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

function clearBackup() {
  try { localStorage.removeItem(BACKUP_KEY); } catch { /* idem */ }
}

// Salvataggio con debounce + attesa massima + flush immediato su richiesta.
// Senza l'attesa massima, un flusso continuo di modifiche (trascinamento, lancio con inerzia) rimanderebbe
// il salvataggio all'infinito, e chiudere la scheda in quel momento farebbe perdere tutto.
export function createAutosaver(storage: Storage, delay = 300, maxWait = 1000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: AppData | undefined;
  let firstPendingAt: number | undefined;

  const flush = async () => {
    clearTimeout(timer);
    timer = undefined;
    firstPendingAt = undefined;
    if (!pending) return;
    const data = pending;
    pending = undefined;
    try {
      await storage.save(data);
    } catch {
      // Database non disponibile o pieno: i dati restano nella copia di sicurezza invece di perdersi.
      backupPending(data);
      return;
    }
    if (!pending) clearBackup(); // salvato davvero e nulla di nuovo in attesa: la copia non serve più
  };

  return {
    schedule(data: AppData) {
      pending = data;
      firstPendingAt ??= Date.now();
      clearTimeout(timer);
      const waited = Date.now() - firstPendingAt;
      timer = setTimeout(flush, Math.min(delay, Math.max(0, maxWait - waited)));
    },
    /** Da chiamare quando la pagina si nasconde o chiude: scrive subito la copia sincrona. */
    backup() {
      if (pending) backupPending(pending);
    },
    flush,
  };
}
