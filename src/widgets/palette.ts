export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

/** Nuova palette armoniosa (tinte vicine, toni morbidi); i colori bloccati restano. */
export function makePalette(prev: string[], locked: boolean[], rand: () => number = Math.random): string[] {
  const base = rand() * 360;
  return prev.map((c, i) => (locked[i] ? c : hslToHex((base + i * (18 + rand() * 28)) % 360, 35 + rand() * 30, 55 + rand() * 22)));
}
