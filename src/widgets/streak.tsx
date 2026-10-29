import { dayKey, daysBetween } from './dates';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';

interface StreakState { label: string; since: string }

function Streak({ state, onChange }: WidgetProps<StreakState>) {
  const today = useToday();
  const days = Math.max(0, daysBetween(state.since, today));
  return (
    <div className="counter">
      <div className="timer-note">Giorni senza</div>
      <input className="counter-label" value={state.label} placeholder="…cosa?" aria-label="Nome" onChange={(e) => onChange({ ...state, label: e.target.value })} />
      <div className="counter-value">{days}<small> {days === 1 ? 'giorno' : 'giorni'}</small></div>
      <button className="chip" onClick={() => onChange({ ...state, since: dayKey() })}>Ricomincia da oggi</button>
    </div>
  );
}

registerWidget({
  type: 'streak',
  label: 'Serie di giorni',
  icon: '🔥',
  category: 'wellbeing',
  defaultSize: { w: 240, h: 240 },
  initialState: () => ({ label: '', since: dayKey() }),
  Component: Streak,
});
