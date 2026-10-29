import { intervalPhase, totalMs, type IntervalConfig } from './intervals';
import { clearAlarm, formatClock, setAlarm, useTick } from './timerCore';
import { registerWidget, type WidgetProps } from './registry';

interface IntervalState extends IntervalConfig { startedAt: number | null }

const LABEL = { work: 'Lavoro', rest: 'Recupero', done: 'Fatto!' };

function IntervalTimer({ state, onChange }: WidgetProps<IntervalState>) {
  const running = state.startedAt !== null;
  useTick(running, 250);
  const p = running ? intervalPhase(state, Date.now() - state.startedAt!) : null;
  const num = (key: keyof IntervalConfig, min: number) => (e: { target: { value: string } }) =>
    onChange({ ...state, [key]: Math.max(min, Math.floor(Number(e.target.value)) || min) });

  const start = () => {
    const startedAt = Date.now();
    setAlarm(startedAt + totalMs(state));
    onChange({ ...state, startedAt });
  };
  const stop = () => { clearAlarm(state.startedAt! + totalMs(state)); onChange({ ...state, startedAt: null }); };

  return (
    <div className="timer">
      {p ? (
        <>
          <div className="timer-note">{LABEL[p.phase]}{p.phase !== 'done' && ` · giro ${p.round}/${state.rounds}`}</div>
          <div className={`timer-time${p.phase === 'work' ? ' done' : ''}`}>{formatClock(p.left)}</div>
        </>
      ) : (
        <div className="interval-set">
          <label>lavoro (s)<input type="number" min={1} value={state.work} onChange={num('work', 1)} /></label>
          <label>recupero (s)<input type="number" min={1} value={state.rest} onChange={num('rest', 1)} /></label>
          <label>giri<input type="number" min={1} max={99} value={state.rounds} onChange={num('rounds', 1)} /></label>
        </div>
      )}
      <div className="timer-actions">
        <button className="btn primary" onClick={running ? stop : start}>{running ? (p?.phase === 'done' ? 'Chiudi' : 'Ferma') : 'Avvia'}</button>
      </div>
    </div>
  );
}

registerWidget({
  type: 'intervaltimer',
  label: 'Intervalli',
  icon: '🏋️',
  category: 'time',
  defaultSize: { w: 240, h: 230 },
  initialState: () => ({ work: 40, rest: 20, rounds: 8, startedAt: null }),
  Component: IntervalTimer,
});
