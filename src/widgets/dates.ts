/** Chiave giornaliera locale, es. "2026-10-28". */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Giorni di calendario tra due chiavi giornaliere (positivo se `to` è dopo `from`). */
export const daysBetween = (from: string, to: string) => {
  const [fy, fm, fd] = from.split('-').map(Number), [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty!, tm! - 1, td!) - Date.UTC(fy!, fm! - 1, fd!)) / 86_400_000);
};
