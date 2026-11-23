import { percent } from '../widgets/progress';
import type { WidgetInstance, Workspace } from './types';

/** Un task di una lista "Da fare"; `progress` è l'id del widget Progresso collegato (se c'è). */
interface LinkedItem { id: string; text: string; done: boolean; progress?: string }

/** Percentuale di un widget Progresso, o null se i suoi dati non sono leggibili. */
function pctOf(w: WidgetInstance): number | null {
  const s = w.state as { mode?: unknown; tasks?: unknown } | null;
  if (!s || typeof s !== 'object' || (s.mode === 'tasks' && !Array.isArray(s.tasks))) return null;
  try { return percent(s as Parameters<typeof percent>[0]); } catch { return null; }
}

/**
 * Tiene allineati i task collegati e i widget Progresso: un task collegato è spuntato se e solo se il suo progresso è al 100%;
 * se il widget Progresso non c'è più (chiuso), il task torna normale (e resta com'era). Restituisce lo stesso oggetto
 * se non c'è nulla da cambiare.
 */
export function relinkTasks(w: Workspace): Workspace {
  let changed = false;
  const widgets = w.widgets.map((x) => {
    const items = (x.state as { items?: unknown } | null)?.items;
    if (x.type !== 'todo' || !Array.isArray(items) || !items.some((i: LinkedItem) => i?.progress)) return x;
    let touched = false;
    const next = (items as LinkedItem[]).map((i) => {
      if (!i?.progress) return i;
      const p = w.widgets.find((y) => y.id === i.progress && y.type === 'progress');
      const pct = p ? pctOf(p) : null;
      if (pct === null) {
        touched = true;
        const { progress: _gone, ...rest } = i;
        return rest;
      }
      const done = pct >= 100;
      if (done === i.done) return i;
      touched = true;
      return { ...i, done };
    });
    if (!touched) return x;
    changed = true;
    return { ...x, state: { ...(x.state as object), items: next } };
  });
  return changed ? { ...w, widgets } : w;
}

/** Il widget Progresso da aprire a destra di una lista, con il testo del task come titolo. */
export function progressBeside(
  todo: Pick<WidgetInstance, 'x' | 'y' | 'w' | 'parent'>,
  def: { defaultSize: { w: number; h: number }; initialState: () => unknown },
  id: string,
  title: string,
  rot: number,
): Omit<WidgetInstance, 'z'> {
  return {
    id,
    type: 'progress',
    x: todo.x + todo.w,
    y: todo.y,
    ...def.defaultSize,
    parent: todo.parent,
    rot,
    state: { ...(def.initialState() as object), title },
  };
}
