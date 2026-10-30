import type { Lang } from './i18n';

export const SCHEMA_VERSION = 3;

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
  /** Inclinazione in gradi, applicata solo se `settings.tilt` è attivo. */
  rot: number;
  /** Id del widget contenitore che lo ospita; assente se sta direttamente sulla tela. */
  parent?: string;
  state: unknown;
}

export interface Workspace {
  id: string;
  name: string;
  order: number;
  widgets: WidgetInstance[];
  /** Agganci tra widget della tela (non tra quelli dentro un contenitore). */
  links?: Link[];
}

export const CATEGORY_IDS = ['notes', 'time', 'numbers', 'wellbeing', 'media', 'fun'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type ThemeId = 'warm' | 'forest' | 'sea' | 'lavender' | 'blossom' | 'system';

export interface Settings {
  /** Rotazione leggera e casuale dei widget. */
  tilt: boolean;
  /** Lancio con inerzia e rimbalzo sui bordi. */
  physics: boolean;
  /** 'tucked': tool in piedi, infilati nella barra. 'slanted': tool di sbieco con prospettiva. */
  drawerStyle: 'tucked' | 'slanted';
  /** Raggruppa i tool in cassetti virtuali per categoria. */
  categories: boolean;
  /** Barra di ricerca fissa al centro della pagina: non si sposta e i widget lanciati vi rimbalzano. */
  searchBar: boolean;
  /** Palette dell'interfaccia; 'system' segue l'accento del sistema (CSS `AccentColor`). */
  theme: ThemeId;
  /** Lingua dell'interfaccia. */
  language: Lang;
  /** Cassetto aperto ('all' mostra ogni tool). */
  activeCategory: CategoryId | 'all';
}

export const DEFAULT_SETTINGS: Settings = { language: 'en', tilt: true, physics: true, drawerStyle: 'tucked', categories: true, searchBar: false, theme: 'warm', activeCategory: 'all' };

export interface AppData {
  version: number;
  activeWorkspaceId: string;
  settings: Settings;
  workspaces: Workspace[];
}
