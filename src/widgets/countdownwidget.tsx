import { remaining } from './countdown';
import { useTick } from './timerCore';
import { registerWidget, type WidgetProps } from './registry';

interface CountdownState { label: string; /** Data e ora, come "2026-12-24T18:00" (vuoto se non scelta). */ at: string }

function Countdown({ state, onChange }: WidgetProps<CountdownState>) {
  useTick(!!state.at, 15_000);
  const target = state.at ? new Date(state.at).getTime() : NaN;
  const r = Number.isNaN(target) ? null : remaining(target, Date.now());
  return (
    <div className="countdown">
      <input className="counter-label" value={state.label} placeholder="Verso cosa?" aria-label="Nome" onChange={(e) => onChange({ ...state, label: e.target.value })} />
      {r ? (
        <div className="countdown-value" aria-live="off">
          <b>{r.days}</b><small>giorni</small> <b>{r.hours}</b><small>ore</small> <b>{r.minutes}</b><small>min</small>
        </div>
      ) : (
        <div className="timer-note">Scegli una data</div>
      )}
      <div className="timer-note">{r?.past ? 'è passato' : r ? 'mancano' : ''}</div>
      <input type="datetime-local" value={state.at} aria-label="Data" onChange={(e) => onChange({ ...state, at: e.target.value })} />
    </div>
  );
}

registerWidget({
  type: 'countdown',
  label: 'Conto alla rovescia',
  icon: '📅',
  category: 'time',
  defaultSize: { w: 260, h: 200 },
  initialState: () => ({ label: '', at: '' }),
  Component: Countdown,
});
