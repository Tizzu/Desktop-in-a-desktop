import { clearAlarm, formatClock, setAlarm, useTick } from './timerCore';
import { registerWidget, type WidgetProps } from './registry';

type Phase = 'focus' | 'short' | 'long';

interface PomodoroState {
  phase: Phase;
  endsAt: number | null;
  left: number | null;
  /** Sessioni di concentrazione completate. */
  done: number;
}

const DURATION: Record<Phase, number> = { focus: 25 * 60_000, short: 5 * 60_000, long: 15 * 60_000 };
const LABEL: Record<Phase, string> = { focus: 'Concentrazione', short: 'Pausa breve', long: 'Pausa lunga' };

function Pomodoro({ state, onChange }: WidgetProps<PomodoroState>) {
  const running = state.endsAt !== null;
  useTick(running);
  const remaining = running ? Math.max(0, state.endsAt! - Date.now()) : (state.left ?? DURATION[state.phase]);
  const finished = running && remaining === 0;
  const idle = !running && state.left === null;

  const start = () => {
    const endsAt = Date.now() + (state.left ?? DURATION[state.phase]);
    setAlarm(endsAt);
    onChange({ ...state, endsAt, left: null });
  };
  const pause = () => {
    clearAlarm(state.endsAt!);
    onChange({ ...state, endsAt: null, left: Math.max(0, state.endsAt! - Date.now()) });
  };
  const next = () => {
    if (state.endsAt !== null) clearAlarm(state.endsAt);
    const done = state.phase === 'focus' ? state.done + 1 : state.done;
    const phase: Phase = state.phase === 'focus' ? (done % 4 === 0 ? 'long' : 'short') : 'focus';
    onChange({ phase, endsAt: null, left: null, done });
  };
  const reset = () => {
    if (state.endsAt !== null) clearAlarm(state.endsAt);
    onChange({ ...state, endsAt: null, left: null });
  };

  const cycle = state.done % 4;
  return (
    <div className="timer">
      <div className="timer-note">{LABEL[state.phase]}</div>
      <div className={`timer-time${finished ? ' done' : ''}`}>{formatClock(remaining)}</div>
      <div className="pomo-dots" aria-label={`${cycle} sessioni su 4`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={i < cycle ? 'on' : ''} />)}
      </div>
      <div className="timer-actions">
        {finished ? (
          <button className="btn primary" onClick={next}>Avanti</button>
        ) : (
          <>
            <button className="btn primary" onClick={running ? pause : start}>{running ? 'Pausa' : idle ? 'Avvia' : 'Riprendi'}</button>
            {idle ? <button className="btn" onClick={next}>Salta</button> : <button className="btn" onClick={reset}>Azzera</button>}
          </>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'pomodoro',
  label: 'Pomodoro',
  icon: '🍅',
  category: 'time',
  defaultSize: { w: 240, h: 230 },
  initialState: () => ({ phase: 'focus', endsAt: null, left: null, done: 0 }),
  Component: Pomodoro,
});
