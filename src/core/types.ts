import type { Lang } from './i18n';
import { DEFAULT_PALETTE_KEY, DEFAULT_PRIVACY_KEY } from './shortcut';

export const SCHEMA_VERSION = 4;

/** Tinte con cui si può colorare la barra di un widget (la tinta vera è nel CSS, per tema). */
export const TINT_IDS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'] as const;
export type TintId = (typeof TINT_IDS)[number];

/** Due widget agganciati per un lato: si muovono insieme. */
export type Link = [string, string];

export interface WidgetInstance {
  id: string;
  type: string;
  /**
   * Widget sulla tela: distanza del suo angolo in alto a sinistra dal centro della tela (il punto 0).
   * Widget dentro un contenitore (`parent`): posizione rispetto all'angolo in alto a sinistra del suo corpo.
   */
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  /** Inclinazione in gradi (entro ±MAX_TILT), moltiplicata per la quantità di inclinazione dello spazio: a 0 non si vede. */
  rot: number;
  /** Vero se è fissato: non si sposta, non si ridimensiona, non parte con l'inerzia. */
  pinned?: boolean;
  /** Tinta della barra del titolo; assente = quella del tema. */
  tint?: TintId;
  /** Id del widget contenitore che lo ospita; assente se sta direttamente sulla tela. */
  parent?: string;
  state: unknown;
}

/** Impostazioni che uno spazio può decidere da sé; se mancano vale quella globale. */
export interface SpaceOverrides {
  /** Quantità di inclinazione, da 0 (nessuna) a 1 (gli angoli salvati per intero). */
  tilt?: number;
  /** Barra di ricerca fissa al centro. */
  searchBar?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  order: number;
  widgets: WidgetInstance[];
  overrides?: SpaceOverrides;
  /** Vero se tutti i widget dello spazio sono bloccati (come se fossero tutti fissati). */
  locked?: boolean;
  /** Vero se, entrando in questo spazio, la pagina si nasconde da sola (modalità privacy). */
  privacy?: boolean;
  /** Agganci tra widget della tela (non tra quelli dentro un contenitore). */
  links?: Link[];
}

export const CATEGORY_IDS = ['notes', 'time', 'numbers', 'wellbeing', 'media', 'layout', 'fun'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type ThemeId = 'warm' | 'forest' | 'sea' | 'lavender' | 'blossom' | 'system';

export interface Settings {
  /** Quantità di inclinazione dei widget, da 0 (spenta) a 1 (gli angoli casuali salvati, fino a ±3°). */
  tilt: number;
  /** Lancio con inerzia e rimbalzo sui bordi. */
  physics: boolean;
  /** 'tucked': tool in piedi, infilati nella barra. 'slanted': tool di sbieco con prospettiva. */
  drawerStyle: 'tucked' | 'slanted';
  /** Raggruppa i tool in cassetti virtuali per categoria. */
  categories: boolean;
  /** Scorciatoia che porta il focus sulla barra di ricerca fissa (vedi shortcut.ts). */
  searchKey: string;
  /** Barra di ricerca fissa al centro della pagina: non si sposta e i widget lanciati vi rimbalzano. */
  searchBar: boolean;
  /** Palette dell'interfaccia; 'system' segue l'accento del sistema (CSS `AccentColor`). */
  theme: ThemeId;
  /** Lingua dell'interfaccia. */
  language: Lang;
  /** Suoni (campane calme) quando un timer finisce. */
  timerSound: boolean;
  /** Ultima versione di cui l'utente ha visto le novità; vuota se mai. */
  seenVersion: string;
  /** Vero dopo la visita guidata (completata o saltata): non si ripropone da sola. */
  tourDone: boolean;
  /** Scorciatoia che apre la palette dei comandi (cerca widget, aggiunge tool, cambia spazio…). */
  paletteKey: string;
  /** Scorciatoia che nasconde la pagina (modalità privacy). */
  privacyKey: string;
  /** Avviso mentre la pagina è nascosta: 'center' = al centro, con un grosso pulsante per riaprirla; 'corner' = discreto, in basso a destra (tasto e occhio). */
  privacyNotice: 'center' | 'corner';
  /** Nasconde la pagina quando si passa a un'altra scheda o finestra. */
  privacyOnLeave: boolean;
  /** Minuti di inattività dopo cui la pagina si nasconde; 0 = mai. */
  privacyIdle: number;
  /** Cassetto aperto ('all' mostra ogni tool). */
  activeCategory: CategoryId | 'all';
}

/** Minuti di inattività tra cui scegliere per la modalità privacy (0 = mai). */
export const PRIVACY_IDLE_MINUTES = [0, 1, 2, 5, 10, 15, 30];

export const DEFAULT_SETTINGS: Settings = { language: 'en', tilt: 1, physics: true, drawerStyle: 'tucked', categories: true, searchBar: false, searchKey: '\\', theme: 'warm', tourDone: false, timerSound: true, seenVersion: '', paletteKey: DEFAULT_PALETTE_KEY, privacyKey: DEFAULT_PRIVACY_KEY, privacyNotice: 'center', privacyOnLeave: false, privacyIdle: 0, activeCategory: 'all' };

/** Un widget tolto di recente: si può rimettere dalle impostazioni (Dati). */
export interface TrashedWidget {
  widget: WidgetInstance;
  /** Spazio da cui è stato tolto. */
  space: string;
  /** Quando (ms dall'epoca). */
  at: number;
}

/** Un widget di un modello di spazio: com'era nello spazio da cui è stato salvato (posizioni rispetto al centro, o al contenitore). */
export interface TemplateWidget {
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Posizione, nell'elenco del modello, del contenitore che lo ospita. */
  parent?: number;
  /** Nome di un contenitore (se non si salva il contenuto, il nome resta). */
  label?: string;
  /** Contenuto salvato; assente = il widget parte vuoto. */
  state?: unknown;
}

/** Un modello di spazio creato dall'utente (salvato da uno spazio). */
export interface CustomTemplate {
  id: string;
  name: string;
  widgets: TemplateWidget[];
  /** Coppie di posizioni (nell'elenco) di widget agganciati. */
  links?: [number, number][];
}

/** Quanti modelli propri si possono tenere. */
export const MAX_CUSTOM_TEMPLATES = 30;

/** Quanti widget tolti si tengono nel cestino. */
export const TRASH_LIMIT = 10;

export interface AppData {
  version: number;
  /** Widget tolti di recente, il più recente per primo. */
  trash?: TrashedWidget[];
  /** Modelli di spazio creati dall'utente. */
  templates?: CustomTemplate[];
  /** Id dei modelli di serie che l'utente ha tolto (si rimettono dalle impostazioni). */
  hiddenTemplates?: string[];
  activeWorkspaceId: string;
  settings: Settings;
  workspaces: Workspace[];
}
