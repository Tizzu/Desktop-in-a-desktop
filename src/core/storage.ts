import { openDB, type IDBPDatabase } from 'idb';
import { THEMES } from './themes';
import { isLang } from './i18n';
import { DEFAULT_PALETTE_KEY, DEFAULT_PRIVACY_KEY, validShortcut } from './shortcut';
import { TEMPLATES } from './templates';
import { CATEGORY_IDS, DEFAULT_SETTINGS, MAX_CUSTOM_TEMPLATES, type CustomTemplate, type TemplateWidget, PRIVACY_IDLE_MINUTES, SCHEMA_VERSION, TINT_IDS, TRASH_LIMIT, type AppData, type Settings, type SpaceOverrides, type TrashedWidget } from './types';

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
  // Dati già esistenti: chi li ha creati non ha bisogno della visita guidata, che serve solo a chi parte da zero.
  const merged = { ...DEFAULT_SETTINGS, tourDone: true, ...rest, theme: rest.theme ?? (adaptColors ? 'system' : DEFAULT_SETTINGS.theme) };
  // Valori sconosciuti (dati vecchi o rovinati) tornano al predefinito invece di rompere l'interfaccia.
  if (!THEMES.some((t) => t.id === merged.theme)) merged.theme = DEFAULT_SETTINGS.theme;
  if (!isLang(merged.language)) merged.language = DEFAULT_SETTINGS.language;
  if (merged.drawerStyle !== 'tucked' && merged.drawerStyle !== 'slanted') merged.drawerStyle = DEFAULT_SETTINGS.drawerStyle;
  if (merged.activeCategory !== 'all' && !CATEGORY_IDS.includes(merged.activeCategory)) merged.activeCategory = 'all';
  merged.searchKey = validShortcut(merged.searchKey);
  merged.privacyKey = validShortcut(merged.privacyKey, DEFAULT_PRIVACY_KEY);
  merged.paletteKey = validShortcut(merged.paletteKey, DEFAULT_PALETTE_KEY);
  // Chi aveva già scelto Ctrl+K (o un'altra delle scorciatoie) per altro la tiene: la palette ripiega su una libera.
  if (merged.paletteKey === merged.searchKey || merged.paletteKey === merged.privacyKey) merged.paletteKey = ['Alt+k', 'Ctrl+Alt+k'].find((k) => k !== merged.searchKey && k !== merged.privacyKey)!;
  if (!PRIVACY_IDLE_MINUTES.includes(merged.privacyIdle)) merged.privacyIdle = DEFAULT_SETTINGS.privacyIdle;
  // L'avviso era un sì/no (no = velo vuoto): ora ce n'è sempre uno, al centro o discreto in un angolo.
  const notice: unknown = merged.privacyNotice;
  merged.privacyNotice = notice === 'corner' || notice === false ? 'corner' : 'center';
  // L'inclinazione era un sì/no, ora è una quantità da 0 a 1.
  const tilt: unknown = merged.tilt;
  merged.tilt = typeof tilt === 'boolean' ? (tilt ? 1 : 0) : isNum(tilt) ? Math.max(0, Math.min(1, tilt)) : DEFAULT_SETTINGS.tilt;
  if (typeof merged.seenVersion !== 'string') merged.seenVersion = DEFAULT_SETTINGS.seenVersion;
  for (const k of ['physics', 'categories', 'searchBar', 'tourDone', 'timerSound', 'privacyOnLeave'] as const) if (typeof merged[k] !== 'boolean') merged[k] = DEFAULT_SETTINGS[k];
  return merged;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Impostazioni proprie di uno spazio: tiene solo quelle valide, o niente. */
function cleanOverrides(raw: unknown): SpaceOverrides | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const out: SpaceOverrides = {};
  if (isNum(r.tilt)) out.tilt = Math.max(0, Math.min(1, r.tilt));
  if (typeof r.searchBar === 'boolean') out.searchBar = r.searchBar;
  return Object.keys(out).length ? out : undefined;
}

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
      overrides: cleanOverrides(w.overrides),
      locked: w.locked === true ? true : undefined,
      privacy: w.privacy === true ? true : undefined,
      widgets: (Array.isArray(w.widgets) ? w.widgets : [])
        .filter((x) => x && typeof x === 'object' && typeof x.id === 'string' && typeof x.type === 'string' && isNum(x.x) && isNum(x.y) && isNum(x.w) && isNum(x.h))
        .map((x) => ({ ...x, z: isNum(x.z) ? x.z : 1, pinned: x.pinned === true ? true : undefined, tint: (TINT_IDS as readonly unknown[]).includes(x.tint) ? x.tint : undefined })),
    }));
  if (workspaces.length === 0) return undefined;
  const activeWorkspaceId = workspaces.some((w) => w.id === d.activeWorkspaceId) ? d.activeWorkspaceId! : workspaces[0]!.id;
  return migrate({ ...(d as AppData), workspaces, activeWorkspaceId }, viewCenter());
}

/** Centro approssimato della tela (finestra meno barra dei cassetti e barra degli spazi), per migrare dalle coordinate assolute. */
const viewCenter = () => (typeof window === 'undefined' ? undefined : { x: window.innerWidth / 2, y: (window.innerHeight - 92) / 2 });

/** Tipi di widget tolti dall'app: vengono scartati dai dati salvati e importati. */
const REMOVED_TYPES = ['frame'];

/** Cestino letto dal disco: tiene solo le voci complete, al massimo TRASH_LIMIT. */
function cleanTrash(raw: unknown): TrashedWidget[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is TrashedWidget => !!t && typeof t === 'object' && typeof t.space === 'string' && isNum(t.at) && !!t.widget && typeof t.widget === 'object'
      && typeof t.widget.id === 'string' && typeof t.widget.type === 'string' && isNum(t.widget.x) && isNum(t.widget.y) && isNum(t.widget.w) && isNum(t.widget.h))
    .slice(0, TRASH_LIMIT);
}

/** Modelli di spazio letti dal disco: tiene solo quelli ben formati (e coerenti negli indici), al massimo MAX_CUSTOM_TEMPLATES. */
function cleanTemplates(raw: unknown): CustomTemplate[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomTemplate[] = [];
  for (const t of raw) {
    if (!t || typeof t !== 'object' || typeof t.id !== 'string' || typeof t.name !== 'string' || !Array.isArray(t.widgets) || out.some((o) => o.id === t.id)) continue;
    const list = t.widgets.slice(0, 200);
    const widgets: TemplateWidget[] = list
      .filter((w: any) => w && typeof w === 'object' && typeof w.type === 'string' && isNum(w.x) && isNum(w.y) && isNum(w.w) && isNum(w.h))
      .map((w: any, _i: number, kept: unknown[]) => ({
        type: w.type, x: w.x, y: w.y, w: w.w, h: w.h,
        ...(Number.isInteger(w.parent) && w.parent >= 0 && w.parent < kept.length ? { parent: w.parent } : {}),
        ...(typeof w.label === 'string' ? { label: w.label } : {}),
        ...('state' in w && w.state !== undefined ? { state: w.state } : {}),
      }));
    // Se qualche widget è stato scartato gli indici non tornano più: meglio rinunciare al modello che sbagliare i contenitori e gli agganci.
    if (!widgets.length || widgets.length !== list.length) continue;
    const links = (Array.isArray(t.links) ? t.links : []).filter((l: unknown): l is [number, number] => Array.isArray(l) && l.length === 2 && Number.isInteger(l[0]) && Number.isInteger(l[1]) && l[0] >= 0 && l[1] >= 0 && l[0] < widgets.length && l[1] < widgets.length && l[0] !== l[1]);
    out.push({ id: t.id, name: t.name.slice(0, 60), widgets, ...(links.length ? { links } : {}) });
    if (out.length >= MAX_CUSTOM_TEMPLATES) break;
  }
  return out;
}

/** Id dei modelli di serie tolti: solo quelli che esistono davvero, una volta sola. */
const cleanHidden = (raw: unknown): string[] =>
  Array.isArray(raw) ? [...new Set(raw.filter((id): id is string => typeof id === 'string' && TEMPLATES.some((t) => t.id === id)))] : [];

// Punto unico per le migrazioni di schema (v1 -> v2: settings e rotazione; v2 -> v3: coordinate rispetto al centro,
// per cui serve `center`, il centro della tela di quel momento; senza, le posizioni restano com'erano).
export function migrate(data: AppData, center?: { x: number; y: number }): AppData {
  const absolute = data.version < 3 && center;
  return {
    ...data,
    version: SCHEMA_VERSION,
    trash: cleanTrash((data as { trash?: unknown }).trash),
    templates: cleanTemplates((data as { templates?: unknown }).templates),
    hiddenTemplates: cleanHidden((data as { hiddenTemplates?: unknown }).hiddenTemplates),
    settings: migrateSettings((data as { settings?: unknown }).settings),
    workspaces: data.workspaces.map((w0) => {
      const w = { ...w0, widgets: w0.widgets.filter((x) => !REMOVED_TYPES.includes(x.type)) };
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
    trash: [],
    templates: [],
    hiddenTemplates: [],
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
