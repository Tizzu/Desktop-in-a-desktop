import { addDays, dayKey } from './dates';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';

interface SleepState { /** Ore dormite la notte che finisce in quel giorno. */ hours: Record<string, number> }

function Sleep({ state, onChange }: WidgetProps<SleepState>) {
  const today = useToday();
  const week = Array.from({ length: 7 }, (_, i) => dayKey(addDays(new Date(), i - 6)));
  const logged = week.map((d) => state.hours[d]).filter((h): h is number => h !== undefined);
  const avg = logged.length ? logged.reduce((s, h) => s + h, 0) / logged.length : 0;
  return (
    <div className="counter">
      <div className="timer-note">Ore dormite stanotte</div>
      <div className="counter-opts">
        <button className="chip" aria-label="Meno" onClick={() => onChange({ hours: { ...state.hours, [today]: Math.max(0, (state.hours[today] ?? 7) - 0.5) } })}>−½</button>
        <span className="sleep-now">{state.hours[today] === undefined ? '—' : `${state.hours[today]} h`}</span>
        <button className="chip" aria-label="Più" onClick={() => onChange({ hours: { ...state.hours, [today]: Math.min(24, (state.hours[today] ?? 7) + 0.5) } })}>+½</button>
      </div>
      <div className="sleep-week" aria-label="Ultimi sette giorni">
        {week.map((d) => (
          <span key={d} title={`${d}: ${state.hours[d] ?? '—'}`} style={{ height: `${((state.hours[d] ?? 0) / 12) * 100}%` }} className={(state.hours[d] ?? 0) >= 7 ? 'ok' : ''} />
        ))}
      </div>
      <div className="timer-note">{logged.length ? `media ${avg.toFixed(1)} h` : ''}</div>
    </div>
  );
}

registerWidget({
  type: 'sleep',
  label: 'Sonno',
  icon: '😴',
  category: 'wellbeing',
  defaultSize: { w: 260, h: 250 },
  initialState: () => ({ hours: {} }),
  Component: Sleep,
});
