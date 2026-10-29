import { addDays, dayKey } from './dates';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';

interface MoodState { /** Umore per giorno, da 0 (giù) a 4 (alle stelle). */ log: Record<string, number> }

export const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

function Mood({ state, onChange }: WidgetProps<MoodState>) {
  const today = useToday();
  const week = Array.from({ length: 7 }, (_, i) => dayKey(addDays(new Date(), i - 6)));
  return (
    <div className="mood">
      <div className="timer-note">Come stai oggi?</div>
      <div className="mood-pick">
        {MOODS.map((m, i) => (
          <button key={m} className={`mood-face${state.log[today] === i ? ' on' : ''}`} aria-label={`Umore ${i + 1} su 5`} aria-pressed={state.log[today] === i}
            onClick={() => onChange({ log: { ...state.log, [today]: i } })}>{m}</button>
        ))}
      </div>
      <div className="mood-week" aria-label="Ultimi sette giorni">
        {week.map((d) => <span key={d} title={d}>{state.log[d] === undefined ? '·' : MOODS[state.log[d]!]}</span>)}
      </div>
    </div>
  );
}

registerWidget({
  type: 'mood',
  label: 'Umore',
  icon: '🙂',
  category: 'wellbeing',
  defaultSize: { w: 270, h: 190 },
  initialState: () => ({ log: {} }),
  Component: Mood,
});
