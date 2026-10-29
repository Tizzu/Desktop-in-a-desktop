import { useState } from 'react';
import { moveCard, type Columns } from './board';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface KanbanState { cols: Columns }

const TITLES = ['To do', 'In progress', 'Done'];

function Kanban({ state, onChange }: WidgetProps<KanbanState>) {
  const t = useT();
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onChange({ cols: [[...state.cols[0], { id: crypto.randomUUID(), text: draft.trim() }], state.cols[1], state.cols[2]] });
    setDraft('');
  };
  const remove = (id: string) => onChange({ cols: state.cols.map((c) => c.filter((x) => x.id !== id)) as Columns });
  return (
    <div className="kanban">
      <input value={draft} placeholder={t('New card and Enter…')} aria-label={t('New card')} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      <div className="kanban-cols">
        {state.cols.map((col, ci) => (
          <section key={ci} aria-label={t(TITLES[ci]!)}>
            <h4>{t(TITLES[ci]!)} <small>{col.length}</small></h4>
            {col.map((c) => (
              <div key={c.id} className="kanban-card">
                <span>{c.text}</span>
                <div>
                  <button className="icon-btn" aria-label={t('Move left')} disabled={ci === 0} onClick={() => onChange({ cols: moveCard(state.cols, c.id, -1) })}>‹</button>
                  <button className="icon-btn" aria-label={t('Move right')} disabled={ci === 2} onClick={() => onChange({ cols: moveCard(state.cols, c.id, 1) })}>›</button>
                  <button className="icon-btn" aria-label={t('Delete')} onClick={() => remove(c.id)}>×</button>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

registerWidget({
  type: 'kanban',
  label: 'Board',
  icon: '🗂️',
  category: 'notes',
  defaultSize: { w: 420, h: 320 },
  initialState: () => ({ cols: [[], [], []] }),
  Component: Kanban,
});
