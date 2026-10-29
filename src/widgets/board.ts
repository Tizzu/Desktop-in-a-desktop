export interface Card { id: string; text: string }
export type Columns = [Card[], Card[], Card[]];

/** Sposta una carta di colonna (−1 a sinistra, +1 a destra); ai bordi non fa nulla. */
export function moveCard(cols: Columns, id: string, dir: -1 | 1): Columns {
  const from = cols.findIndex((c) => c.some((x) => x.id === id));
  const to = from + dir;
  if (from < 0 || to < 0 || to > 2) return cols;
  const card = cols[from]!.find((x) => x.id === id)!;
  const next = cols.map((c) => c.filter((x) => x.id !== id)) as Columns;
  next[to] = [...next[to]!, card];
  return next;
}
