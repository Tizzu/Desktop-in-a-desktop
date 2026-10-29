export interface Task { id: string; text: string; done: boolean }

export interface ProgressState {
  title: string;
  /** manual: il valore lo imposti tu; tasks: deriva dai sotto-task spuntati. */
  mode: 'manual' | 'tasks';
  value: number;
  tasks: Task[];
}

export const clampPct = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0);

/** Percentuale mostrata dalla barra. */
export function percent(s: ProgressState): number {
  if (s.mode === 'manual') return clampPct(s.value);
  if (s.tasks.length === 0) return 0;
  return clampPct((100 * s.tasks.filter((t) => t.done).length) / s.tasks.length);
}
