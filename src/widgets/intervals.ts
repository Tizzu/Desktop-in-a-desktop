export interface IntervalConfig { work: number; rest: number; rounds: number }
export interface IntervalPhase { phase: 'work' | 'rest' | 'done'; round: number; left: number }

/** Dove si trova un allenamento a intervalli dopo `elapsed` ms (durate in secondi). L'ultimo recupero non c'è. */
export function intervalPhase({ work, rest, rounds }: IntervalConfig, elapsed: number): IntervalPhase {
  const w = work * 1000, r = rest * 1000;
  let t = elapsed;
  for (let round = 1; round <= rounds; round++) {
    if (t < w) return { phase: 'work', round, left: w - t };
    t -= w;
    if (round === rounds) break;
    if (t < r) return { phase: 'rest', round, left: r - t };
    t -= r;
  }
  return { phase: 'done', round: rounds, left: 0 };
}

export const totalMs = ({ work, rest, rounds }: IntervalConfig) => (work * rounds + rest * (rounds - 1)) * 1000;
