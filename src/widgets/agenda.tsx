import { dayKey } from './dates';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';

interface AgendaState { /** Giorno a cui si riferiscono le voci: cambiato giorno, la pagina riparte vuota. */ day: string; slots: Record<string, string> }

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

function Agenda({ state, onChange }: WidgetProps<AgendaState>) {
  const today = useToday();
  const slots = state.day === today ? state.slots : {};
  const hour = new Date().getHours();
  return (
    <div className="agenda">
      {HOURS.map((h) => (
        <label key={h} className={h === hour ? 'now' : ''}>
          <span>{String(h).padStart(2, '0')}</span>
          <input value={slots[h] ?? ''} aria-label={`Ore ${h}`} onChange={(e) => onChange({ day: today, slots: { ...slots, [h]: e.target.value } })} />
        </label>
      ))}
    </div>
  );
}

registerWidget({
  type: 'agenda',
  label: 'Agenda',
  icon: '🗓️',
  category: 'time',
  defaultSize: { w: 280, h: 400 },
  initialState: () => ({ day: dayKey(), slots: {} }),
  Component: Agenda,
});
