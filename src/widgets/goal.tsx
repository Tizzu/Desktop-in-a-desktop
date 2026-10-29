import { useState } from 'react';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';

interface GoalState { goal: string; done: boolean; date: string }

function Goal({ state, onChange }: WidgetProps<GoalState>) {
  const today = useToday();
  const current = state.date === today && state.goal !== '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const save = () => {
    const goal = draft.trim();
    setEditing(false);
    if (goal) onChange({ goal, done: false, date: today });
  };

  if (current && !editing) {
    return (
      <div className="goal">
        <div className="goal-label">Obiettivo di oggi</div>
        <label className={`goal-text${state.done ? ' done' : ''}`}>
          <input type="checkbox" checked={state.done} onChange={(e) => onChange({ ...state, done: e.target.checked })} />
          <span>{state.goal}</span>
        </label>
        <button className="chip" onClick={() => { setDraft(state.goal); setEditing(true); }}>Cambia</button>
      </div>
    );
  }
  return (
    <div className="goal">
      <div className="goal-label">Qual è la cosa più importante di oggi?</div>
      <input
        className="todo-input"
        autoFocus={editing}
        value={draft}
        placeholder="Scrivi e premi Invio…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        onBlur={() => editing && save()}
      />
      {!current && state.goal && <div className="goal-prev">Ultima volta: {state.goal} {state.done && '✓'}</div>}
    </div>
  );
}

registerWidget({
  type: 'goal',
  label: 'Obiettivo',
  icon: '🎯',
  category: 'notes',
  defaultSize: { w: 290, h: 150 },
  initialState: () => ({ goal: '', done: false, date: '' }),
  Component: Goal,
});
