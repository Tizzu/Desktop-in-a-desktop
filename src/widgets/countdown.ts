export interface Remaining { past: boolean; days: number; hours: number; minutes: number }

/** Tempo che manca a `target` (o trascorso, se passato), scomposto in giorni, ore e minuti. */
export function remaining(target: number, now: number): Remaining {
  const diff = Math.abs(target - now);
  return {
    past: target < now,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  };
}
