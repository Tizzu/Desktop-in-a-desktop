import { dayKey, daysBetween } from './dates';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface StreakState { label: string; since: string }

function Streak({ state, onChange }: WidgetProps<StreakState>) {
  const t = useT();
  const today = useToday();
  const days = Math.max(0, daysBetween(state.since, today));
  return (
    <div className="counter">
      <div className="timer-note">{t('Days without')}</div>
      <input className="counter-label" value={state.label} placeholder={t('…what?')} aria-label={t('Name')} onChange={(e) => onChange({ ...state, label: e.target.value })} />
      <div className="counter-value">{days}<small> {days === 1 ? t('day') : t('days')}</small></div>
      <button className="chip" onClick={() => onChange({ ...state, since: dayKey() })}>{t('Restart from today')}</button>
    </div>
  );
}

registerWidget({
  type: 'streak',
  label: 'Day streak',
  icon: '🔥',
  category: 'wellbeing',
  defaultSize: { w: 240, h: 240 },
  initialState: () => ({ label: '', since: dayKey() }),
  Component: Streak,
});
