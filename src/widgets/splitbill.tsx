import { euro, splitBill } from './money';
import { registerWidget, type WidgetProps } from './registry';

interface SplitState { total: string; people: number; tip: number }

function SplitBill({ state, onChange }: WidgetProps<SplitState>) {
  const total = Number(state.total.replace(',', '.'));
  const r = splitBill(Number.isFinite(total) ? total : 0, state.people, state.tip);
  return (
    <div className="counter">
      <input className="counter-label" value={state.total} inputMode="decimal" placeholder="Totale del conto €" aria-label="Totale" onChange={(e) => onChange({ ...state, total: e.target.value })} />
      <div className="counter-value">{euro(r.each)}<small> a testa</small></div>
      <div className="counter-opts">
        <label>persone <input type="number" min={1} value={state.people} onChange={(e) => onChange({ ...state, people: Math.max(1, Math.floor(Number(e.target.value)) || 1) })} /></label>
        <label>mancia % <input type="number" min={0} value={state.tip} onChange={(e) => onChange({ ...state, tip: Math.max(0, Number(e.target.value) || 0) })} /></label>
      </div>
      <div className="timer-note">{r.withTip > 0 ? `totale con mancia ${euro(r.withTip)}` : ''}</div>
    </div>
  );
}

registerWidget({
  type: 'splitbill',
  label: 'Dividi il conto',
  icon: '🍕',
  category: 'numbers',
  defaultSize: { w: 260, h: 250 },
  initialState: () => ({ total: '', people: 2, tip: 0 }),
  Component: SplitBill,
});
