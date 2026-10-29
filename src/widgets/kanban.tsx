import { useState } from 'react';
import { moveCard, type Columns } from './board';
import { registerWidget, type WidgetProps } from './registry';

interface KanbanState { cols: Columns }

const TITLES = ['Da fare', 'In corso', 'Fatto'];

function Kanban({ state, onChange }: WidgetProps<KanbanState>) {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onChange({ cols: [[...state.cols[0], { id: crypto.randomUUID(), text: draft.trim() }], state.cols[1], state.cols[2]] });
    setDraft('');
  };
  const remove = (id: string) => onChange({ cols: state.cols.map((c) => c.filter((x) => x.id !== id)) as Columns });
  return (
    <div className="kanban">
      <input value={draft} placeholder="Nuova carta e Invio…" aria-label="Nuova carta" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      <div className="kanban-cols">
        {state.cols.map((col, ci) => (
          <section key={ci} aria-label={TITLES[ci]}>
            <h4>{TITLES[ci]} <small>{col.length}</small></h4>
            {col.map((c) => (
              <div key={c.id} className="kanban-card">
                <span>{c.text}</span>
                <div>
                  <button className="icon-btn" aria-label="Sposta a sinistra" disabled={ci === 0} onClick={() => onChange({ cols: moveCard(state.cols, c.id, -1) })}>‹</button>
                  <button className="icon-btn" aria-label="Sposta a destra" disabled={ci === 2} onClick={() => onChange({ cols: moveCard(state.cols, c.id, 1) })}>›</button>
                  <button className="icon-btn" aria-label="Elimina" onClick={() => remove(c.id)}>×</button>
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
  label: 'Bacheca',
  icon: '🗂️',
  category: 'notes',
  defaultSize: { w: 420, h: 320 },
  initialState: () => ({ cols: [[], [], []] }),
  Component: Kanban,
});
