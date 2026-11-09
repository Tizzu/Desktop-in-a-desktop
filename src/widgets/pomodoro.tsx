import { useEffect, useState } from 'react';
import { dayKey } from './dates';
import { useToday } from './useToday';
import { clearAlarm, formatClock, setAlarm, useFinishChime, useTick } from './timerCore';
import { DEFAULT_CONFIG, afterPhase, clampConfig, phaseMs, type Phase, type PomodoroConfig } from './pomodorocycle';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface PomodoroState {
  phase: Phase;
  endsAt: number | null;
  left: number | null;
  /** Sessioni di concentrazione completate. */
  done: number;
  /** Durate, sessioni e avvio automatico; assenti nei dati salvati dalle versioni precedenti. */
  cfg?: PomodoroConfig;
  /** Giorno a cui si riferiscono le sessioni contate: cambiato giorno, si riparte da capo (se il reset giornaliero è acceso). */
  day?: string;
}

const LABEL: Record<Phase, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };

function Pomodoro({ state, onChange }: WidgetProps<PomodoroState>) {
  const t = useT();
  const cfg = clampConfig(state.cfg);
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const running = state.endsAt !== null;
  useTick(running);
  const remaining = running ? Math.max(0, state.endsAt! - Date.now()) : (state.left ?? phaseMs(cfg, state.phase));
  const finished = running && remaining === 0;
  const idle = !running && state.left === null;
  useFinishChime(state.endsAt, finished);

  const begin = (phase: Phase, done: number, ms: number) => {
    const endsAt = Date.now() + ms;
    setAlarm(endsAt);
    onChange({ ...state, phase, done, endsAt, left: null });
  };
  const start = () => begin(state.phase, state.done, state.left ?? phaseMs(cfg, state.phase));
  const pause = () => {
    clearAlarm(state.endsAt!);
    onChange({ ...state, endsAt: null, left: Math.max(0, state.endsAt! - Date.now()) });
  };
  const next = () => {
    if (state.endsAt !== null) clearAlarm(state.endsAt);
    const n = afterPhase(state.phase, state.done, cfg.sessions);
    onChange({ ...state, phase: n.phase, endsAt: null, left: null, done: n.done });
  };
  const reset = () => {
    if (state.endsAt !== null) clearAlarm(state.endsAt);
    onChange({ ...state, endsAt: null, left: null });
  };
  // Ricomincia da capo: concentrazione, nessuna sessione contata, nessun timer.
  const startOver = () => {
    if (state.endsAt !== null) clearAlarm(state.endsAt);
    onChange({ ...state, phase: 'focus', endsAt: null, left: null, done: 0, day: today });
  };
  const askStartOver = () => {
    if ((running || state.done > 0) && !confirm(t('Start over? The sessions counted so far and the running timer will be reset.'))) return;
    startOver();
  };

  // A mezzanotte (o alla prima apertura del giorno dopo) si ricomincia, ma mai a timer in corso: aspetta che si fermi.
  // I dati di prima non avevano il giorno: da qui in poi lo tengono.
  useEffect(() => {
    if (state.day === undefined) onChange({ ...state, day: today });
    else if (cfg.dailyReset && state.day !== today && state.endsAt === null) startOver();
  }, [today, state.day, state.endsAt, cfg.dailyReset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Con l'avvio automatico, finita una fase parte subito la successiva.
  useEffect(() => {
    if (!finished || !cfg.auto) return;
    const n = afterPhase(state.phase, state.done, cfg.sessions);
    begin(n.phase, n.done, phaseMs(cfg, n.phase));
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCfg = (patch: Partial<PomodoroConfig>) => onChange({ ...state, cfg: clampConfig({ ...cfg, ...patch }) });
  const num = (key: 'focus' | 'short' | 'long' | 'sessions', label: string) => (
    <label key={key}>
      {t(label)}
      <input type="number" min={1} max={key === 'sessions' ? 12 : 180} value={cfg[key]} onChange={(e) => setCfg({ [key]: e.target.value === '' ? 1 : Number(e.target.value) })} />
    </label>
  );

  if (editing) {
    return (
      <div className="timer pomo-cfg">
        <div className="interval-set">
          {num('focus', 'Focus (min)')}
          {num('short', 'Short break (min)')}
          {num('long', 'Long break (min)')}
          {num('sessions', 'Sessions before long break')}
          <label className="pomo-auto">
            <input type="checkbox" checked={cfg.auto} onChange={(e) => setCfg({ auto: e.target.checked })} />
            {t('Start the next phase automatically')}
          </label>
          <label className="pomo-auto">
            <input type="checkbox" checked={cfg.dailyReset} onChange={(e) => setCfg({ dailyReset: e.target.checked })} />
            {t('Start over every day')}
          </label>
        </div>
        <button className="btn primary" onClick={() => setEditing(false)}>{t('Done')}</button>
      </div>
    );
  }

  const cycle = state.done % cfg.sessions;
  return (
    <div className="timer">
      <button className="icon-btn timer-reset-btn" aria-label={t('Start over')} title={t('Start over')} onClick={askStartOver}>↺</button>
      <button className="icon-btn timer-cfg-btn" aria-label={t('Customise')} title={t('Customise')} onClick={() => setEditing(true)}>⚙</button>
      <div className="timer-note">{t(LABEL[state.phase])}</div>
      <div className={`timer-time${finished ? ' done' : ''}`}>{formatClock(remaining)}</div>
      <div className="pomo-dots" aria-label={t('{n} of {total} sessions', { n: cycle, total: cfg.sessions })}>
        {Array.from({ length: cfg.sessions }, (_, i) => <span key={i} className={i < cycle ? 'on' : ''} />)}
      </div>
      <div className="timer-actions">
        {finished ? (
          <button className="btn primary" onClick={next}>{t('Next')}</button>
        ) : (
          <>
            <button className="btn primary" onClick={running ? pause : start}>{running ? t('Pause') : idle ? t('Start') : t('Resume')}</button>
            {idle ? <button className="btn" onClick={next}>{t('Skip')}</button> : <button className="btn" onClick={reset}>{t('Reset')}</button>}
          </>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'pomodoro',
  label: 'Focus timer',
  icon: '🍅',
  category: 'time',
  defaultSize: { w: 260, h: 310 },
  initialState: () => ({ phase: 'focus', endsAt: null, left: null, done: 0, cfg: DEFAULT_CONFIG, day: dayKey() }),
  Component: Pomodoro,
});
