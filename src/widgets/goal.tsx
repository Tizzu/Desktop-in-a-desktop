import { useState } from 'react';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface GoalState { goal: string; done: boolean; date: string }

function Goal({ state, onChange }: WidgetProps<GoalState>) {
  const t = useT();
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
        <div className="goal-label">{t('Goal for today')}</div>
        <label className={`goal-text${state.done ? ' done' : ''}`}>
          <input type="checkbox" checked={state.done} onChange={(e) => onChange({ ...state, done: e.target.checked })} />
          <span>{state.goal}</span>
        </label>
        <button className="chip" onClick={() => { setDraft(state.goal); setEditing(true); }}>{t('Change')}</button>
      </div>
    );
  }
  return (
    <div className="goal">
      <div className="goal-label">{t('What is the most important thing today?')}</div>
      <input
        className="todo-input"
        autoFocus={editing}
        value={draft}
        placeholder={t('Type and press Enter…')}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        onBlur={() => editing && save()}
      />
      {!current && state.goal && <div className="goal-prev">{t('Last time: {goal}', { goal: state.goal })} {state.done && '✓'}</div>}
    </div>
  );
}

registerWidget({
  type: 'goal',
  label: 'Goal',
  icon: '🎯',
  category: 'notes',
  defaultSize: { w: 290, h: 150 },
  initialState: () => ({ goal: '', done: false, date: '' }),
  Component: Goal,
});
