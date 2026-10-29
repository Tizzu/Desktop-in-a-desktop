import { addDays, dayKey } from './dates';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface SleepState { /** Ore dormite la notte che finisce in quel giorno. */ hours: Record<string, number> }

function Sleep({ state, onChange }: WidgetProps<SleepState>) {
  const t = useT();
  const today = useToday();
  const week = Array.from({ length: 7 }, (_, i) => dayKey(addDays(new Date(), i - 6)));
  const logged = week.map((d) => state.hours[d]).filter((h): h is number => h !== undefined);
  const avg = logged.length ? logged.reduce((s, h) => s + h, 0) / logged.length : 0;
  return (
    <div className="counter">
      <div className="timer-note">{t('Hours slept last night')}</div>
      <div className="counter-opts">
        <button className="chip" aria-label={t('Less')} onClick={() => onChange({ hours: { ...state.hours, [today]: Math.max(0, (state.hours[today] ?? 7) - 0.5) } })}>−½</button>
        <span className="sleep-now">{state.hours[today] === undefined ? '—' : `${state.hours[today]} h`}</span>
        <button className="chip" aria-label={t('More')} onClick={() => onChange({ hours: { ...state.hours, [today]: Math.min(24, (state.hours[today] ?? 7) + 0.5) } })}>+½</button>
      </div>
      <div className="sleep-week" aria-label={t('Last seven days')}>
        {week.map((d) => (
          <span key={d} title={`${d}: ${state.hours[d] ?? '—'}`} style={{ height: `${((state.hours[d] ?? 0) / 12) * 100}%` }} className={(state.hours[d] ?? 0) >= 7 ? 'ok' : ''} />
        ))}
      </div>
      <div className="timer-note">{logged.length ? t('average {h} h', { h: avg.toFixed(1) }) : ''}</div>
    </div>
  );
}

registerWidget({
  type: 'sleep',
  label: 'Sleep',
  icon: '😴',
  category: 'wellbeing',
  defaultSize: { w: 260, h: 250 },
  initialState: () => ({ hours: {} }),
  Component: Sleep,
});
