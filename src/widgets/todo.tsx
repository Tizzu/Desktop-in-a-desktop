import { useState } from 'react';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';
import { useConfirm } from '../components/Confirm';

interface Item { id: string; text: string; done: boolean; /** id del widget Progresso collegato */ progress?: string }
interface TodoState { items: Item[] }

function Todo({ state, onChange, linkTask }: WidgetProps<TodoState>) {
  const t = useT();
  const ask = useConfirm();
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
            <input type="checkbox" checked={i.done} disabled={!!i.progress} title={i.progress ? t('Follows its progress widget') : undefined} onChange={(e) => patch(i.id, { done: e.target.checked })} />
            <span>{i.text}</span>
            {i.progress ? (
              <span className="todo-linked" role="img" aria-label={t('Linked to a progress widget')} title={t('Linked to a progress widget')}>📈</span>
            ) : linkTask && (
              <button
                className="icon-btn todo-link-btn"
                aria-label={t('Track {text} with a progress widget', { text: i.text })}
                title={t('Track with a progress widget')}
                onClick={async () => { if (await ask(t('Open a progress widget beside this list and link it to this task?'), { confirm: t('Open') })) linkTask(i.id, i.text); }}
              >📈</button>
            )}
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
