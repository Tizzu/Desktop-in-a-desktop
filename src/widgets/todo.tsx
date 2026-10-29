import { useState } from 'react';
import { registerWidget, type WidgetProps } from './registry';

interface Item { id: string; text: string; done: boolean }
interface TodoState { items: Item[] }

function Todo({ state, onChange }: WidgetProps<TodoState>) {
  const [draft, setDraft] = useState('');
  const left = state.items.filter((i) => !i.done).length;

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange({ items: [...state.items, { id: crypto.randomUUID(), text, done: false }] });
    setDraft('');
  };
  const patch = (id: string, p: Partial<Item>) =>
    onChange({ items: state.items.map((i) => (i.id === id ? { ...i, ...p } : i)) });

  return (
    <div className="todo">
      <input
        className="todo-input"
        value={draft}
        placeholder="Aggiungi e premi Invio…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
      />
      <ul className="todo-list">
        {state.items.map((i) => (
          <li key={i.id} className={i.done ? 'done' : ''}>
            <input type="checkbox" checked={i.done} onChange={(e) => patch(i.id, { done: e.target.checked })} />
            <span>{i.text}</span>
            <button className="icon-btn" aria-label="Elimina" onClick={() => onChange({ items: state.items.filter((x) => x.id !== i.id) })}>×</button>
          </li>
        ))}
      </ul>
      <footer className="todo-foot">
        <span>{state.items.length === 0 ? 'Niente da fare 🎉' : `${left} da fare`}</span>
        {state.items.some((i) => i.done) && (
          <button className="chip" onClick={() => onChange({ items: state.items.filter((i) => !i.done) })}>Rimuovi fatti</button>
        )}
      </footer>
    </div>
  );
}

registerWidget({
  type: 'todo',
  label: 'Da fare',
  icon: '✅',
  category: 'notes',
  defaultSize: { w: 260, h: 320 },
  initialState: () => ({ items: [] }),
  Component: Todo,
});
