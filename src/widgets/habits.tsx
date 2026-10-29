import { useState } from 'react';
import { addDays, dayKey } from './dates';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';
import { useT, useLocale } from '../core/i18n';

interface Habit { id: string; name: string; days: string[] }
interface HabitsState { habits: Habit[] }

function Habits({ state, onChange }: WidgetProps<HabitsState>) {
  const t = useT();
  const locale = useLocale();
  const [draft, setDraft] = useState('');
  useToday(); // ridisegna allo scoccare della mezzanotte
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    onChange({ habits: [...state.habits, { id: crypto.randomUUID(), name, days: [] }] });
    setDraft('');
  };
  const toggle = (h: Habit, key: string) =>
    onChange({
      habits: state.habits.map((x) =>
        x.id !== h.id ? x : { ...x, days: x.days.includes(key) ? x.days.filter((d) => d !== key) : [...x.days, key] },
      ),
    });

  return (
    <div className="habits">
      <div className="habit-row head">
        <span />
        {week.map((d) => (
          <span key={dayKey(d)} className={dayKey(d) === dayKey(today) ? 'today' : ''}>
            {d.toLocaleDateString(locale, { weekday: 'narrow' }).toUpperCase()}
          </span>
        ))}
        <span />
      </div>
      {state.habits.map((h) => (
        <div key={h.id} className="habit-row">
          <span className="habit-name" title={h.name}>{h.name}</span>
          {week.map((d) => {
            const key = dayKey(d);
            return (
              <button key={key} className={`habit-cell${h.days.includes(key) ? ' on' : ''}`} aria-label={`${h.name} ${key}`} aria-pressed={h.days.includes(key)} onClick={() => toggle(h, key)} />
            );
          })}
          <button className="icon-btn" aria-label={t('Delete {text}', { text: h.name })} onClick={() => onChange({ habits: state.habits.filter((x) => x.id !== h.id) })}>×</button>
        </div>
      ))}
      <input className="todo-input" value={draft} placeholder={t('New habit…')} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
    </div>
  );
}

registerWidget({
  type: 'habits',
  label: 'Habits',
  icon: '🌱',
  category: 'wellbeing',
  defaultSize: { w: 330, h: 250 },
  initialState: () => ({ habits: [{ id: 'demo', name: 'Drink water', days: [] }] }),
  Component: Habits,
});
