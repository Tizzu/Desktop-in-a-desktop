import type { Action, Desk } from './store';
import type { AppData } from './types';

/** Disposizione attuale di uno spazio (copia di riferimento: i dati non si modificano mai sul posto). */
export const deskOf = (s: AppData, ws: string): Desk | undefined => {
  const w = s.workspaces.find((x) => x.id === ws);
  return w && { ws, widgets: w.widgets, links: w.links ?? [] };
};

/** Vero se la patch cambia qualcosa della disposizione (posizione, misura, angolo, fissaggio, tinta, contenitore) e non solo del contenuto. */
const isLayoutPatch = (patch: object) => Object.keys(patch).some((k) => k !== 'state' && k !== 'z');

/** Spazi che l'azione modifica nella disposizione; vuoto se non è un'azione da annullare (contenuto dei widget, impostazioni, ordine di sovrapposizione…). */
export function spacesOf(a: Action, s: AppData): string[] {
  const ws = (a as { ws?: string }).ws ?? s.activeWorkspaceId;
  switch (a.type) {
    case 'addWidget':
    case 'removeWidget':
    case 'addLinkedProgress':
    case 'duplicateWidget':
    case 'link':
    case 'unlink':
    case 'restoreWidget':
      return [ws];
    case 'updateWidget':
      return isLayoutPatch(a.patch) ? [ws] : [];
    case 'updateWidgets':
      return a.patches.some((p) => isLayoutPatch(p.patch)) ? [ws] : [];
    case 'moveWidgetToSpace':
      return [ws, a.to];
    default:
      return [];
  }
}

/** Azioni che si fondono in un'unica voce se arrivano a raffica (trascinamento, lancio, frecce sull'angolo). */
const mergeable = (a: Action) => a.type === 'updateWidget' || a.type === 'updateWidgets' || a.type === 'link' || a.type === 'unlink';

interface Entry { desks: Desk[] }

/** Cronologia di annulla/ripeti della scrivania di questa scheda. */
export function createHistory(limit = 100, burstMs = 700) {
  let undos: Entry[] = [];
  let redos: Entry[] = [];
  let lastAt = -Infinity;
  let lastKey = '';

  const snapshot = (s: AppData, spaces: string[]): Entry => ({ desks: spaces.map((ws) => deskOf(s, ws)).filter((d): d is Desk => !!d) });
  // Rimette a posto ciò che l'ultima voce ha cambiato, e conserva com'era per poterlo ripristinare nel verso opposto.
  const swap = (from: Entry[], to: Entry[], s: AppData): Desk[] | null => {
    const entry = from.pop();
    if (!entry) return null;
    to.push(snapshot(s, entry.desks.map((d) => d.ws)));
    lastAt = -Infinity;
    return entry.desks;
  };

  return {
    /** Da chiamare PRIMA di applicare un'azione locale. */
    record(s: AppData, a: Action, now: number) {
      const spaces = spacesOf(a, s);
      if (!spaces.length) return;
      const key = spaces.join('|');
      const burst = mergeable(a) && key === lastKey && now - lastAt < burstMs;
      lastAt = mergeable(a) ? now : -Infinity;
      lastKey = key;
      if (burst) return;
      undos.push(snapshot(s, spaces));
      if (undos.length > limit) undos.shift();
      redos = [];
    },
    /** Chiude la raffica in corso: la prossima modifica sarà una voce a sé. */
    endBurst() { lastAt = -Infinity; },
    undo: (s: AppData) => swap(undos, redos, s),
    redo: (s: AppData) => swap(redos, undos, s),
    get canUndo() { return undos.length > 0; },
    get canRedo() { return redos.length > 0; },
  };
}

export type History = ReturnType<typeof createHistory>;
