export const SCHEMA_VERSION = 2;

export interface WidgetInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  /** Inclinazione in gradi, applicata solo se `settings.tilt` è attivo. */
  rot: number;
  state: unknown;
}

export interface Workspace {
  id: string;
  name: string;
  order: number;
  widgets: WidgetInstance[];
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
  /** Cassetto aperto ('all' mostra ogni tool). */
  activeCategory: CategoryId | 'all';
}

export const DEFAULT_SETTINGS: Settings = { tilt: true, physics: true, drawerStyle: 'tucked', categories: true, searchBar: false, theme: 'warm', activeCategory: 'all' };

export interface AppData {
  version: number;
  activeWorkspaceId: string;
  settings: Settings;
  workspaces: Workspace[];
}
