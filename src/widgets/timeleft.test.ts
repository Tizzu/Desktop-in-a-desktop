import { describe, expect, it } from 'vitest';
import { periods } from './timeleft';

const by = (d: Date) => Object.fromEntries(periods(d).map((p) => [p.id, p]));

describe('tempo che passa', () => {
  it('a mezzogiorno il giorno è a metà', () => {
    expect(by(new Date(2026, 9, 28, 12, 0)).day!.fraction).toBeCloseTo(0.5, 5);
  });
  it('la settimana comincia di lunedì e finisce il lunedì dopo', () => {
    const mon = by(new Date(2026, 9, 26, 0, 0)).week!; // lunedì 26 ottobre 2026
    expect(mon.fraction).toBe(0);
    expect(new Date(mon.end).getDate()).toBe(2); // lunedì 2 novembre
    expect(by(new Date(2026, 9, 28, 12, 0)).week!.fraction).toBeCloseTo(2.5 / 7, 5); // mercoledì a mezzogiorno
    expect(by(new Date(2026, 10, 1, 12, 0)).week!.fraction).toBeCloseTo(6.5 / 7, 5); // domenica: l'ultimo giorno
  });
  // (con precisione di centesimi: il cambio dell'ora legale allunga o accorcia di un'ora un mese o un anno)
  it('il mese tiene conto della sua lunghezza (anche febbraio bisestile)', () => {
    expect(by(new Date(2028, 1, 15, 12, 0)).month!.fraction).toBeCloseTo(14.5 / 29, 2);
    expect(by(new Date(2026, 9, 16, 12, 0)).month!.fraction).toBeCloseTo(15.5 / 31, 2);
  });
  it('l\'anno comincia il primo gennaio', () => {
    expect(by(new Date(2026, 0, 1, 0, 0)).year!.fraction).toBe(0);
    expect(by(new Date(2026, 6, 2, 12, 0)).year!.fraction).toBeCloseTo(182.5 / 365, 2);
    expect(new Date(by(new Date(2026, 5, 1)).year!.end).getFullYear()).toBe(2027);
  });
  it('le frazioni restano tra 0 e 1', () => {
    for (const p of periods(new Date(2026, 11, 31, 23, 59, 59))) expect(p.fraction).toBeLessThanOrEqual(1);
  });
});
