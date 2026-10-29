// --- 2048 ---
export type Grid = number[][];

export const emptyGrid = (): Grid => Array.from({ length: 4 }, () => [0, 0, 0, 0]);

function slideRow(row: number[]) {
  const tiles = row.filter(Boolean);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === tiles[i + 1]) { out.push(tiles[i]! * 2); gained += tiles[i]! * 2; i++; }
    else out.push(tiles[i]!);
  }
  while (out.length < 4) out.push(0);
  return { row: out, gained };
}

/** Sposta tutte le tessere; `moved` è falso se nulla cambia (la mossa non vale). */
export function slide(grid: Grid, dir: 'left' | 'right' | 'up' | 'down') {
  const vertical = dir === 'up' || dir === 'down';
  const reverse = dir === 'right' || dir === 'down';
  const lines = vertical ? grid[0]!.map((_, c) => grid.map((r) => r[c]!)) : grid.map((r) => [...r]);
  let gained = 0;
  const done = lines.map((l) => {
    const s = slideRow(reverse ? [...l].reverse() : l);
    gained += s.gained;
    return reverse ? s.row.reverse() : s.row;
  });
  const next = vertical ? done[0]!.map((_, r) => done.map((l) => l[r]!)) : done;
  return { grid: next, gained, moved: JSON.stringify(next) !== JSON.stringify(grid) };
}

/** Aggiunge una tessera (2, raramente 4) in una cella libera; `rnd` serve per i test. */
export function spawn(grid: Grid, rnd: () => number = Math.random): Grid {
  const free: [number, number][] = [];
  grid.forEach((r, y) => r.forEach((v, x) => !v && free.push([y, x])));
  if (!free.length) return grid;
  const [y, x] = free[Math.floor(rnd() * free.length)]!;
  return grid.map((r, i) => r.map((v, j) => (i === y && j === x ? (rnd() < 0.9 ? 2 : 4) : v)));
}

export const canMove = (grid: Grid) => (['left', 'right', 'up', 'down'] as const).some((d) => slide(grid, d).moved);

// --- Tris ---
export type Mark = 'X' | 'O' | '';
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]] as const;

/** Vincitore ('X' | 'O'), 'draw' se la griglia è piena, altrimenti null. */
export function ticTacToe(cells: Mark[]): 'X' | 'O' | 'draw' | null {
  for (const [a, b, c] of LINES) if (cells[a!] && cells[a!] === cells[b!] && cells[a!] === cells[c!]) return cells[a!] as 'X' | 'O';
  return cells.every(Boolean) ? 'draw' : null;
}

// --- Memory ---
export const FACES = ['🌻', '🍄', '🦊', '🐢', '🍋', '🌙', '🧶', '☕'];

/** Mazzo di 16 carte (8 coppie) mescolato. */
export function deck(rnd: () => number = Math.random): string[] {
  const cards = [...FACES, ...FACES];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cards[i], cards[j]] = [cards[j]!, cards[i]!];
  }
  return cards;
}
