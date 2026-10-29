import { useState } from 'react';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface Item { id: string; text: string; done: boolean }
interface TodoState { items: Item[] }

function Todo({ state, onChange }: WidgetProps<TodoState>) {
  const t = useT();
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
        placeholder={t('Add and press Enter…')}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
      />
      <ul className="todo-list">
        {state.items.map((i) => (
          <li key={i.id} className={i.done ? 'done' : ''}>
            <input type="checkbox" checked={i.done} onChange={(e) => patch(i.id, { done: e.target.checked })} />
            <span>{i.text}</span>
            <button className="icon-btn" aria-label={t('Delete')} onClick={() => onChange({ items: state.items.filter((x) => x.id !== i.id) })}>×</button>
          </li>
        ))}
      </ul>
      <footer className="todo-foot">
        <span>{state.items.length === 0 ? t('Nothing to do 🎉') : t('{n} to do', { n: left })}</span>
        {state.items.some((i) => i.done) && (
          <button className="chip" onClick={() => onChange({ items: state.items.filter((i) => !i.done) })}>{t('Remove done')}</button>
        )}
      </footer>
    </div>
  );
}

registerWidget({
  type: 'todo',
  label: 'To do',
  icon: '✅',
  category: 'notes',
  defaultSize: { w: 260, h: 320 },
  initialState: () => ({ items: [] }),
  Component: Todo,
});
