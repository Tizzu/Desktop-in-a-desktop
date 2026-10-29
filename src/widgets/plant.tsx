import { dayKey, daysBetween } from './dates';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface PlantState { /** Giorni in cui è stata annaffiata. */ watered: string[] }

const STAGES = ['🌰', '🌱', '🪴', '🌿', '🌳', '🌸'];
const NAMES = ['A seed', 'A sprout', 'A seedling', 'Growing well', 'A little tree', 'In bloom!'];

function Plant({ state, onChange }: WidgetProps<PlantState>) {
  const t = useT();
  const today = useToday();
  const done = state.watered.includes(today);
  const last = state.watered[state.watered.length - 1];
  // Dopo tre giorni senz'acqua la pianta è triste, ma non perde i progressi.
  const thirsty = !!last && !done && daysBetween(last, today) > 3;
  const stage = Math.min(STAGES.length - 1, state.watered.length);
  return (
    <div className="counter">
      <div className="plant" aria-label={t(NAMES[stage]!)}>{thirsty ? '🥀' : STAGES[stage]}</div>
      <div className="timer-note">{thirsty ? t('Thirsty…') : t(NAMES[stage]!)} · {t('{n} days of care', { n: state.watered.length })}</div>
      <button className="btn primary" disabled={done} onClick={() => onChange({ watered: [...state.watered, today].slice(-365) })}>{done ? t('Watered today 💧') : t('Water it')}</button>
    </div>
  );
}

registerWidget({
  type: 'plant',
  label: 'Plant',
  icon: '🪴',
  category: 'wellbeing',
  defaultSize: { w: 230, h: 250 },
  initialState: () => ({ watered: [] }),
  Component: Plant,
});
