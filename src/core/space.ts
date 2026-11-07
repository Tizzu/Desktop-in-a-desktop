import type { Settings, WidgetInstance, Workspace } from './types';

/** Inclinazione massima di un widget in gradi: vale per quella casuale iniziale e per quella scelta con la maniglia. */
export const MAX_TILT = 3;

export const clampTilt = (deg: number) => Math.max(-MAX_TILT, Math.min(MAX_TILT, deg));

/** Angolo casuale tra −MAX_TILT e +MAX_TILT, a due decimali. */
export const randomTilt = () => Math.round((Math.random() * 2 - 1) * MAX_TILT * 100) / 100;

/** Quantità di inclinazione (0..1) che vale in uno spazio: la sua, se ne ha una, altrimenti quella delle impostazioni. */
export const effectiveTilt = (s: Pick<Settings, 'tilt'>, w: Pick<Workspace, 'overrides'>) => w.overrides?.tilt ?? s.tilt;

/** Se la barra di ricerca fissa si vede in uno spazio. */
export const effectiveSearchBar = (s: Pick<Settings, 'searchBar'>, w: Pick<Workspace, 'overrides'>) => w.overrides?.searchBar ?? s.searchBar;

/** Id dei widget che non si spostano né si ridimensionano: quelli fissati, o tutti se lo spazio è bloccato. */
export const pinnedIds = (w: Pick<Workspace, 'widgets' | 'locked'>): Set<string> =>
  new Set(w.widgets.filter((x: WidgetInstance) => w.locked === true || x.pinned === true).map((x) => x.id));
