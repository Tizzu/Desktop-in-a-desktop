import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, afterPhase, clampConfig, phaseMs } from './pomodorocycle';

describe('timer di concentrazione', () => {
  it('di serie: 25/5/15 minuti, pausa lunga ogni 4 sessioni, avvio manuale', () => {
    expect(clampConfig()).toEqual(DEFAULT_CONFIG);
    expect(phaseMs(DEFAULT_CONFIG, 'focus')).toBe(25 * 60_000);
    expect(phaseMs(DEFAULT_CONFIG, 'long')).toBe(15 * 60_000);
  });
  it('le impostazioni fuori misura o rovinate vengono riportate a valori validi', () => {
    expect(clampConfig({ focus: 0, short: 999, long: -3, sessions: 50 })).toMatchObject({ focus: 1, short: 180, long: 1, sessions: 12 });
    expect(clampConfig({ focus: 'x' as never, sessions: NaN })).toMatchObject({ focus: 25, sessions: 4 });
    expect(clampConfig({ focus: 12.9 }).focus).toBe(12);
    expect(clampConfig({ auto: 'sì' as never }).auto).toBe(false);
    expect(clampConfig({ auto: true }).auto).toBe(true);
  });
  it('dopo la concentrazione viene una pausa, lunga ogni N sessioni; dopo la pausa si ricomincia', () => {
    expect(afterPhase('focus', 0, 4)).toEqual({ phase: 'short', done: 1 });
    expect(afterPhase('focus', 3, 4)).toEqual({ phase: 'long', done: 4 });
    expect(afterPhase('short', 1, 4)).toEqual({ phase: 'focus', done: 1 });
    expect(afterPhase('long', 4, 4)).toEqual({ phase: 'focus', done: 4 });
  });
  it('con un numero di sessioni diverso', () => {
    expect(afterPhase('focus', 1, 2)).toEqual({ phase: 'long', done: 2 });
    expect(afterPhase('focus', 0, 1)).toEqual({ phase: 'long', done: 1 }); // ogni sessione è seguita dalla pausa lunga
    expect(afterPhase('focus', 5, 6)).toEqual({ phase: 'long', done: 6 });
  });
});
