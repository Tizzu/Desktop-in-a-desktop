export type PeriodId = 'day' | 'week' | 'month' | 'year';

export interface Period {
  id: PeriodId;
  /** Quanto ne è passato, da 0 a 1. */
  fraction: number;
  /** Istante in cui finisce (inizio del periodo successivo), in ms. */
  end: number;
}

/** Giorno, settimana (da lunedì), mese e anno che contengono `now`, con quanto ne è trascorso. */
export function periods(now: Date): Period[] {
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const weekday = (now.getDay() + 6) % 7; // 0 = lunedì
  const spans: [PeriodId, Date, Date][] = [
    ['day', new Date(y, m, d), new Date(y, m, d + 1)],
    ['week', new Date(y, m, d - weekday), new Date(y, m, d - weekday + 7)],
    ['month', new Date(y, m, 1), new Date(y, m + 1, 1)],
    ['year', new Date(y, 0, 1), new Date(y + 1, 0, 1)],
  ];
  return spans.map(([id, start, end]) => ({
    id,
    fraction: Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()))),
    end: end.getTime(),
  }));
}
