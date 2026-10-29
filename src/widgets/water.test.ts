import { describe, expect, it } from 'vitest';
import { addWater, lastDays, prune, ratio } from './water';

describe('acqua', () => {
  it('somma per giorno e non scende sotto zero', () => {
    let log = addWater({}, '2026-10-28', 250);
    log = addWater(log, '2026-10-28', 500);
    expect(log['2026-10-28']).toBe(750);
    expect(addWater(log, '2026-10-28', -5000)['2026-10-28']).toBe(0);
  });
  it('non tocca gli altri giorni', () => {
    const log = addWater({ '2026-10-27': 900 }, '2026-10-28', 250);
    expect(log).toEqual({ '2026-10-27': 900, '2026-10-28': 250 });
  });
  it('conserva solo gli ultimi giorni', () => {
    const log = Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`2026-01-${String(i + 1).padStart(3, '0')}`, i]));
    const p = prune(log, 60);
    expect(Object.keys(p)).toHaveLength(60);
    expect(p['2026-01-070']).toBe(69);
    expect(p['2026-01-001']).toBeUndefined();
  });
  it('calcola la frazione dell\'obiettivo, con tetto a 1 e obiettivo zero sicuro', () => {
    expect(ratio(500, 2000)).toBe(0.25);
    expect(ratio(3000, 2000)).toBe(1);
    expect(ratio(500, 0)).toBe(0);
  });
  it('restituisce gli ultimi 7 giorni finendo con oggi', () => {
    const days = lastDays({ '2026-10-28': 1200 }, 7, new Date(2026, 9, 28));
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ day: '2026-10-28', ml: 1200 });
    expect(days[0]!.day).toBe('2026-10-22');
  });
});
