import { clearAlarm, formatClock, setAlarm, useTick } from './timerCore';
import { registerWidget, type WidgetProps } from './registry';

interface TimerState {
  /** Durata impostata, in ms. */
  duration: number;
  /** Istante di scadenza se in corso. */
  endsAt: number | null;
  /** Tempo rimasto se in pausa. */
  left: number | null;
}

const PRESETS = [5, 15, 25];

function Timer({ state, onChange }: WidgetProps<TimerState>) {
  const running = state.endsAt !== null;

  useTick(running);

  const remaining = running ? Math.max(0, state.endsAt! - Date.now()) : (state.left ?? state.duration);
  const finished = running && remaining === 0;
  const idle = !running && state.left === null;

  const start = () => {
    const endsAt = Date.now() + (state.left ?? state.duration);
    setAlarm(endsAt);
    onChange({ ...state, endsAt, left: null });
  };
  const pause = () => {
    clearAlarm(state.endsAt!);
    onChange({ ...state, endsAt: null, left: Math.max(0, state.endsAt! - Date.now()) });
  };
  const reset = () => {
    if (state.endsAt !== null) clearAlarm(state.endsAt);
    onChange({ ...state, endsAt: null, left: null });
  };
  const setDuration = (minutes: number, seconds: number) =>
    onChange({ ...state, duration: Math.max(1, minutes * 60 + seconds) * 1000 });

  const minutes = Math.floor(state.duration / 60000), seconds = Math.floor((state.duration % 60000) / 1000);

  return (
    <div className="timer">
      <div className={`timer-time${finished ? ' done' : ''}`}>{formatClock(remaining)}</div>
      <div className="timer-bar"><div style={{ width: `${(remaining / state.duration) * 100}%` }} /></div>
      {idle ? (
        <div className="timer-set">
          <input type="number" min={0} max={999} value={minutes} aria-label="Minuti"
            onChange={(e) => setDuration(Number(e.target.value) || 0, seconds)} />
          <span>:</span>
          <input type="number" min={0} max={59} value={seconds} aria-label="Secondi"
            onChange={(e) => setDuration(minutes, Math.min(59, Number(e.target.value) || 0))} />
          {PRESETS.map((p) => (
            <button key={p} className="chip" onClick={() => setDuration(p, 0)}>{p}′</button>
          ))}
        </div>
      ) : (
        <div className="timer-note">{finished ? 'Tempo scaduto' : running ? 'In corso' : 'In pausa'}</div>
      )}
      <div className="timer-actions">
        {!finished && (
          <button className="btn primary" onClick={running ? pause : start}>
            {running ? 'Pausa' : idle ? 'Avvia' : 'Riprendi'}
          </button>
        )}
        {!idle && <button className="btn" onClick={reset}>{finished ? 'Ricomincia' : 'Azzera'}</button>}
      </div>
    </div>
  );
}

registerWidget({
  type: 'timer',
  label: 'Timer',
  icon: '⏳',
  category: 'time',
  defaultSize: { w: 230, h: 210 },
  initialState: () => ({ duration: 5 * 60_000, endsAt: null, left: null }),
  Component: Timer,
});
