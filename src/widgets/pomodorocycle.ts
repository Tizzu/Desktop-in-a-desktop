export type Phase = 'focus' | 'short' | 'long';

export interface PomodoroConfig {
  /** Minuti di concentrazione, di pausa breve e di pausa lunga. */
  focus: number;
  short: number;
  long: number;
  /** Sessioni di concentrazione prima della pausa lunga. */
  sessions: number;
  /** Se vero, la fase successiva parte da sola quando una finisce. */
  auto: boolean;
}

export const DEFAULT_CONFIG: PomodoroConfig = { focus: 25, short: 5, long: 15, sessions: 4, auto: false };

const whole = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Impostazioni valide, anche partendo da dati incompleti o fuori misura. */
export function clampConfig(c: Partial<PomodoroConfig> = {}): PomodoroConfig {
  return {
    focus: whole(c.focus, 1, 180, DEFAULT_CONFIG.focus),
    short: whole(c.short, 1, 180, DEFAULT_CONFIG.short),
    long: whole(c.long, 1, 180, DEFAULT_CONFIG.long),
    sessions: whole(c.sessions, 1, 12, DEFAULT_CONFIG.sessions),
    auto: c.auto === true,
  };
}

export const phaseMs = (cfg: PomodoroConfig, phase: Phase) => cfg[phase] * 60_000;

/** Fase che segue `phase` e sessioni completate: dopo la concentrazione una pausa (lunga ogni `sessions`), poi di nuovo concentrazione. */
export function afterPhase(phase: Phase, done: number, sessions: number): { phase: Phase; done: number } {
  if (phase !== 'focus') return { phase: 'focus', done };
  const n = done + 1;
  return { phase: n % sessions === 0 ? 'long' : 'short', done: n };
}
