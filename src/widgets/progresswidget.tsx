import { useState, type PointerEvent } from 'react';
import { clampPct, percent, type ProgressState } from './progress';
import { registerWidget, type WidgetProps } from './registry';

const STEPS = [-10, -5, -1, 1, 5, 10];

function Progress({ state, onChange }: WidgetProps<ProgressState>) {
  const [draft, setDraft] = useState('');
  const pct = percent(state);
  const manual = state.mode === 'manual';
  const done = state.tasks.filter((t) => t.done).length;

  // Clic o trascinamento sulla barra: imposta il valore a mano.
  const setFromBar = (e: PointerEvent<HTMLDivElement>) =>
    onChange({ ...state, value: clampPct((e.nativeEvent.offsetX / e.currentTarget.clientWidth) * 100) });

  const addTask = () => {
    const text = draft.trim();
    if (!text) return;
    onChange({ ...state, tasks: [...state.tasks, { id: crypto.randomUUID(), text, done: false }] });
    setDraft('');
  };
  const patchTask = (id: string, done: boolean) =>
    onChange({ ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, done } : t)) });

  return (
    <div className="prog">
      <input className="prog-title" value={state.title} placeholder="Di cosa tieni il progresso?" aria-label="Titolo" onChange={(e) => onChange({ ...state, title: e.target.value })} />
      <div className="prog-head">
        <span className="prog-pct">{pct}<small>%</small></span>
        <span className="prog-modes" role="radiogroup" aria-label="Come si calcola">
          <button role="radio" aria-checked={manual} className={`chip${manual ? ' on' : ''}`} onClick={() => onChange({ ...state, mode: 'manual' })}>Manuale</button>
          <button role="radio" aria-checked={!manual} className={`chip${!manual ? ' on' : ''}`} onClick={() => onChange({ ...state, mode: 'tasks' })}>Sotto-task</button>
        </span>
      </div>
      <div
        className={`prog-bar${manual ? ' editable' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        onPointerDown={(e) => { if (!manual) return; e.currentTarget.setPointerCapture(e.pointerId); setFromBar(e); }}
        onPointerMove={(e) => { if (manual && e.buttons === 1) setFromBar(e); }}
      >
        <div className={pct >= 100 ? 'full' : ''} style={{ width: `${pct}%` }} />
      </div>
      {manual ? (
        <>
          <div className="prog-steps">
            {STEPS.map((n) => (
              <button key={n} className="chip" onClick={() => onChange({ ...state, value: clampPct(state.value + n) })}>{n > 0 ? `+${n}` : `−${-n}`}%</button>
            ))}
          </div>
          <label className="prog-set">imposta <input type="number" min={0} max={100} value={state.value} onChange={(e) => onChange({ ...state, value: clampPct(Number(e.target.value)) })} /> %</label>
        </>
      ) : (
        <>
          <ul className="prog-tasks">
            {state.tasks.map((t) => (
              <li key={t.id} className={t.done ? 'done' : ''}>
                <input type="checkbox" checked={t.done} onChange={(e) => patchTask(t.id, e.target.checked)} />
                <span>{t.text}</span>
                <button className="icon-btn" aria-label={`Elimina ${t.text}`} onClick={() => onChange({ ...state, tasks: state.tasks.filter((x) => x.id !== t.id) })}>×</button>
              </li>
            ))}
          </ul>
          <input className="todo-input" value={draft} placeholder="Aggiungi un sotto-task…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
          <div className="muted">{state.tasks.length === 0 ? 'Aggiungi dei sotto-task: la barra si riempie da sola' : `${done} di ${state.tasks.length} completati`}</div>
        </>
      )}
    </div>
  );
}

registerWidget({
  type: 'progress',
  label: 'Progresso',
  icon: '📈',
  category: 'notes',
  defaultSize: { w: 300, h: 280 },
  initialState: () => ({ title: '', mode: 'manual', value: 0, tasks: [] }),
  Component: Progress,
});
