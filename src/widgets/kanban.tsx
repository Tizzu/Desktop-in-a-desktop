import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { moveCard, placeCard, type Columns } from './board';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface KanbanState { cols: Columns }

const TITLES = ['To do', 'In progress', 'Done'];
const DRAG_FROM = 4; // px di spostamento prima che un clic diventi trascinamento

interface Drag { id: string; text: string; x: number; y: number; w: number; dx: number; dy: number }
interface Drop { col: number; index: number }

function Kanban({ state, onChange }: WidgetProps<KanbanState>) {
  const t = useT();
  const [draft, setDraft] = useState('');
  const [drag, setDrag] = useState<Drag | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const colsEl = useRef<HTMLDivElement>(null);

  const add = () => {
    if (!draft.trim()) return;
    onChange({ cols: [[...state.cols[0], { id: crypto.randomUUID(), text: draft.trim() }], state.cols[1], state.cols[2]] });
    setDraft('');
  };
  const remove = (id: string) => onChange({ cols: state.cols.map((c) => c.filter((x) => x.id !== id)) as Columns });

  // Dove cadrebbe la carta: la colonna più vicina in orizzontale, e la posizione tra le sue carte (senza contare quella trascinata).
  const dropAt = (x: number, y: number, id: string): Drop => {
    const sections = [...(colsEl.current?.querySelectorAll<HTMLElement>('section') ?? [])];
    let col = 0, best = Infinity;
    sections.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      if (d < best) { best = d; col = i; }
    });
    const cards = [...(sections[col]?.querySelectorAll<HTMLElement>('.kanban-card') ?? [])].filter((c) => c.dataset.id !== id);
    const index = cards.filter((c) => { const r = c.getBoundingClientRect(); return y > r.top + r.height / 2; }).length;
    return { col, index };
  };

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>, card: { id: string; text: string }) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault(); // niente selezione del testo
    const el = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    let target: Drop | null = null;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_FROM) return;
      moved = true;
      target = dropAt(ev.clientX, ev.clientY, card.id);
      setDrop(target);
      setDrag({ id: card.id, text: card.text, x: ev.clientX, y: ev.clientY, w: el.width, dx: sx - el.left, dy: sy - el.top });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setDrag(null);
      setDrop(null);
      if (moved && target) onChange({ cols: placeCard(state.cols, card.id, target.col, target.index) });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <div className="kanban">
      <input value={draft} placeholder={t('New card and Enter…')} aria-label={t('New card')} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      <div className="kanban-cols" ref={colsEl}>
        {state.cols.map((col, ci) => {
          const cards = col.filter((c) => c.id !== drag?.id);
          const mark = drop?.col === ci ? drop.index : -1;
          return (
            <section key={ci} aria-label={t(TITLES[ci]!)} className={mark >= 0 ? 'drop-col' : ''}>
              <h4>{t(TITLES[ci]!)} <small>{col.length}</small></h4>
              {cards.map((c, i) => (
                <div key={c.id} className="kanban-slot">
                  {mark === i && <div className="kanban-drop" />}
                  <div className="kanban-card" data-id={c.id} onPointerDown={(e) => startDrag(e, c)}>
                    <span>{c.text}</span>
                    <div>
                      <button className="icon-btn" aria-label={t('Move left')} disabled={ci === 0} onClick={() => onChange({ cols: moveCard(state.cols, c.id, -1) })}>‹</button>
                      <button className="icon-btn" aria-label={t('Move right')} disabled={ci === 2} onClick={() => onChange({ cols: moveCard(state.cols, c.id, 1) })}>›</button>
                      <button className="icon-btn" aria-label={t('Delete')} onClick={() => remove(c.id)}>×</button>
                    </div>
                  </div>
                </div>
              ))}
              {mark === cards.length && <div className="kanban-drop" />}
            </section>
          );
        })}
      </div>
      {/* Il "fantasma" sta nel body: dentro il widget (che può essere inclinato) il posizionamento fisso sarebbe sbagliato. */}
      {drag && createPortal(<div className="kanban-ghost" style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.w }}>{drag.text}</div>, document.body)}
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
  hasData: (s: KanbanState) => s.cols.some((c) => c.length > 0),
  Component: Kanban,
});
