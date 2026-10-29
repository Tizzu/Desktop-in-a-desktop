import { registerWidget, type WidgetProps } from './registry';

interface CounterState { label: string; value: number; step: number; target: number }

function Counter({ state, onChange }: WidgetProps<CounterState>) {
  const add = (n: number) => onChange({ ...state, value: state.value + n });
  const pct = state.target > 0 ? Math.min(100, (state.value / state.target) * 100) : 0;
  return (
    <div className="counter">
      <input className="counter-label" value={state.label} placeholder="Cosa conti?" aria-label="Nome" onChange={(e) => onChange({ ...state, label: e.target.value })} />
      <div className="counter-value">{state.value}{state.target > 0 && <small> / {state.target}</small>}</div>
      {state.target > 0 && <div className="timer-bar"><div style={{ width: `${pct}%` }} /></div>}
      <div className="timer-actions">
        <button className="btn" aria-label="Diminuisci" onClick={() => add(-state.step)}>−{state.step}</button>
        <button className="btn primary" aria-label="Aumenta" onClick={() => add(state.step)}>+{state.step}</button>
      </div>
      <div className="counter-opts">
        <label>passo <input type="number" min={1} value={state.step} onChange={(e) => onChange({ ...state, step: Math.max(1, Number(e.target.value) || 1) })} /></label>
        <label>meta <input type="number" min={0} value={state.target} onChange={(e) => onChange({ ...state, target: Math.max(0, Number(e.target.value) || 0) })} /></label>
        <button className="chip" onClick={() => onChange({ ...state, value: 0 })}>Azzera</button>
      </div>
    </div>
  );
}

registerWidget({
  type: 'counter',
  label: 'Contatore',
  icon: '🔘',
  category: 'numbers',
  defaultSize: { w: 220, h: 230 },
  initialState: () => ({ label: '', value: 0, step: 1, target: 0 }),
  Component: Counter,
});
