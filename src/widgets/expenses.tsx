import { useState } from 'react';
import { euro, totals, type Entry } from './money';
import { registerWidget, type WidgetProps } from './registry';

interface ExpensesState { entries: Entry[] }

function Expenses({ state, onChange }: WidgetProps<ExpensesState>) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const t = totals(state.entries);
  const value = Number(amount.replace(',', '.'));
  const add = (sign: 1 | -1) => {
    if (!Number.isFinite(value) || value <= 0) return;
    onChange({ entries: [{ id: crypto.randomUUID(), label: label.trim() || (sign > 0 ? 'Entrata' : 'Spesa'), amount: sign * value }, ...state.entries] });
    setLabel(''); setAmount('');
  };
  return (
    <div className="todo">
      <div className="money-total" aria-label="Saldo">{euro(t.balance)}<small> entrate {euro(t.income)} · uscite {euro(t.spent)}</small></div>
      <div className="money-add">
        <input value={label} placeholder="Per cosa" aria-label="Descrizione" onChange={(e) => setLabel(e.target.value)} />
        <input value={amount} inputMode="decimal" placeholder="€" aria-label="Importo" onChange={(e) => setAmount(e.target.value)} />
        <button className="chip" onClick={() => add(-1)}>− Spesa</button>
        <button className="chip" onClick={() => add(1)}>+ Entrata</button>
      </div>
      <ul className="todo-list">
        {state.entries.map((e) => (
          <li key={e.id}>
            <span>{e.label}</span>
            <b className={e.amount < 0 ? 'neg' : 'pos'}>{euro(e.amount)}</b>
            <button className="icon-btn" aria-label="Elimina" onClick={() => onChange({ entries: state.entries.filter((x) => x.id !== e.id) })}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

registerWidget({
  type: 'expenses',
  label: 'Spese',
  icon: '💶',
  category: 'numbers',
  defaultSize: { w: 300, h: 340 },
  initialState: () => ({ entries: [] }),
  Component: Expenses,
});
