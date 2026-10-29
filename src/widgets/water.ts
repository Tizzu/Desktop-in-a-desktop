import { addDays, dayKey } from './dates';

/** ml bevuti per giorno ("2026-10-28" -> 1250). */
export type WaterLog = Record<string, number>;

/** Tiene solo gli ultimi `keep` giorni registrati, per non far crescere i dati salvati. */
export function prune(log: WaterLog, keep = 60): WaterLog {
  const days = Object.keys(log).sort().slice(-keep);
  return Object.fromEntries(days.map((d) => [d, log[d]!]));
}

/** Aggiunge (o toglie, con ml negativi) acqua al giorno indicato; mai sotto zero. */
export function addWater(log: WaterLog, day: string, ml: number): WaterLog {
  return prune({ ...log, [day]: Math.max(0, (log[day] ?? 0) + ml) });
}

/** Frazione dell'obiettivo raggiunta, tra 0 e 1. */
export const ratio = (ml: number, goal: number) => (goal > 0 ? Math.min(1, ml / goal) : 0);

/** Gli ultimi `n` giorni, dal più vecchio a oggi. */
export function lastDays(log: WaterLog, n: number, today = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(today, i - (n - 1));
    return { day: dayKey(d), date: d, ml: log[dayKey(d)] ?? 0 };
  });
}
