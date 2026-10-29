import { useTick } from './timerCore';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface StopwatchState {
  /** Istante dell'ultimo avvio, null se fermo. */
  startedAt: number | null;
  /** Tempo accumulato prima dell'ultimo avvio. */
  base: number;
  laps: number[];
}

function fmt(ms: number) {
  const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function Stopwatch({ state, onChange }: WidgetProps<StopwatchState>) {
  const t = useT();
  const running = state.startedAt !== null;
  useTick(running, 50);
  const elapsed = state.base + (running ? Date.now() - state.startedAt! : 0);

  return (
    <div className="timer">
      <div className="timer-time">{fmt(elapsed)}</div>
      <div className="timer-actions">
        <button className="btn primary" onClick={() => onChange(running ? { ...state, startedAt: null, base: elapsed } : { ...state, startedAt: Date.now() })}>
          {running ? t('Stop') : elapsed > 0 ? t('Resume') : t('Start')}
        </button>
        {running && <button className="btn" onClick={() => onChange({ ...state, laps: [...state.laps, elapsed] })}>{t('Lap')}</button>}
        {!running && elapsed > 0 && <button className="btn" onClick={() => onChange({ startedAt: null, base: 0, laps: [] })}>{t('Reset')}</button>}
      </div>
      {state.laps.length > 0 && (
        <ol className="laps" reversed>
          {[...state.laps].reverse().map((l, i, arr) => {
            const prev = arr[i + 1] ?? 0;
            return <li key={i}><span>{fmt(l - prev)}</span><span className="muted">{fmt(l)}</span></li>;
          })}
        </ol>
      )}
    </div>
  );
}

registerWidget({
  type: 'stopwatch',
  label: 'Stopwatch',
  icon: '⏱️',
  category: 'time',
  defaultSize: { w: 240, h: 270 },
  initialState: () => ({ startedAt: null, base: 0, laps: [] }),
  Component: Stopwatch,
});
