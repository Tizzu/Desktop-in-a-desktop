import { useState } from 'react';
import { clearReminder, setReminder, useTick } from './timerCore';
import { registerWidget, type WidgetProps } from './registry';

interface Item { id: string; text: string; when: number }
interface ReminderState { items: Item[] }

const fmt = (when: number) => new Date(when).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Reminder({ state, onChange }: WidgetProps<ReminderState>) {
  const [text, setText] = useState('');
  const [at, setAt] = useState('');
  useTick(state.items.length > 0, 5000);
  const when = at ? new Date(at).getTime() : NaN;
  const now = Date.now();

  const add = () => {
    if (!text.trim() || Number.isNaN(when)) return;
    setReminder(when, text.trim());
    onChange({ items: [...state.items, { id: crypto.randomUUID(), text: text.trim(), when }].sort((a, b) => a.when - b.when) });
    setText('');
    setAt('');
  };
  const remove = (i: Item) => { clearReminder(i.when, i.text); onChange({ items: state.items.filter((x) => x.id !== i.id) }); };

  return (
    <div className="todo">
      <input className="todo-input" value={text} placeholder="Ricordami di…" aria-label="Testo" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      <div className="reminder-add">
        <input type="datetime-local" value={at} aria-label="Quando" onChange={(e) => setAt(e.target.value)} />
        <button className="chip" disabled={!text.trim() || Number.isNaN(when)} onClick={add}>Aggiungi</button>
      </div>
      <ul className="todo-list">
        {state.items.map((i) => (
          <li key={i.id} className={i.when <= now ? 'done' : ''}>
            <span>{i.text}<small className="reminder-when"> {fmt(i.when)}</small></span>
            <button className="icon-btn" aria-label="Elimina" onClick={() => remove(i)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

registerWidget({
  type: 'reminder',
  label: 'Promemoria',
  icon: '🔔',
  category: 'time',
  defaultSize: { w: 280, h: 300 },
  initialState: () => ({ items: [] }),
  Component: Reminder,
});
