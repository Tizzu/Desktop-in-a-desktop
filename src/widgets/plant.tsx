import { dayKey, daysBetween } from './dates';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';

interface PlantState { /** Giorni in cui è stata annaffiata. */ watered: string[] }

const STAGES = ['🌰', '🌱', '🪴', '🌿', '🌳', '🌸'];
const NAMES = ['Un seme', 'Un germoglio', 'Una piantina', 'Cresce bene', 'Un alberello', 'In fiore!'];

function Plant({ state, onChange }: WidgetProps<PlantState>) {
  const today = useToday();
  const done = state.watered.includes(today);
  const last = state.watered[state.watered.length - 1];
  // Dopo tre giorni senz'acqua la pianta è triste, ma non perde i progressi.
  const thirsty = !!last && !done && daysBetween(last, today) > 3;
  const stage = Math.min(STAGES.length - 1, state.watered.length);
  return (
    <div className="counter">
      <div className="plant" aria-label={NAMES[stage]}>{thirsty ? '🥀' : STAGES[stage]}</div>
      <div className="timer-note">{thirsty ? 'Ha sete…' : NAMES[stage]} · {state.watered.length} {state.watered.length === 1 ? 'giorno' : 'giorni'} di cure</div>
      <button className="btn primary" disabled={done} onClick={() => onChange({ watered: [...state.watered, today].slice(-365) })}>{done ? 'Annaffiata oggi 💧' : 'Annaffia'}</button>
    </div>
  );
}

registerWidget({
  type: 'plant',
  label: 'Pianta',
  icon: '🪴',
  category: 'wellbeing',
  defaultSize: { w: 230, h: 250 },
  initialState: () => ({ watered: [] }),
  Component: Plant,
});
