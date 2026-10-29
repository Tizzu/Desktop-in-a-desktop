import { useState } from 'react';
import { euro, totals, type Entry } from './money';
import { registerWidget, type WidgetProps } from './registry';
import { useT, useLocale } from '../core/i18n';

interface ExpensesState { entries: Entry[] }

function Expenses({ state, onChange }: WidgetProps<ExpensesState>) {
  const t = useT();
  const locale = useLocale();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const sum = totals(state.entries);
  const value = Number(amount.replace(',', '.'));
  const add = (sign: 1 | -1) => {
    if (!Number.isFinite(value) || value <= 0) return;
    onChange({ entries: [{ id: crypto.randomUUID(), label: label.trim() || (sign > 0 ? t('Income') : t('Expense')), amount: sign * value }, ...state.entries] });
    setLabel(''); setAmount('');
  };
  return (
    <div className="todo">
      <div className="money-total" aria-label={t('Balance')}>{euro(sum.balance, locale)}<small> {t('income')} {euro(sum.income, locale)} · {t('expenses')} {euro(sum.spent, locale)}</small></div>
      <div className="money-add">
        <input value={label} placeholder={t('What for')} aria-label={t('Description')} onChange={(e) => setLabel(e.target.value)} />
        <input value={amount} inputMode="decimal" placeholder="€" aria-label={t('Amount')} onChange={(e) => setAmount(e.target.value)} />
        <button className="chip" onClick={() => add(-1)}>{t('− Expense')}</button>
        <button className="chip" onClick={() => add(1)}>{t('+ Income')}</button>
      </div>
      <ul className="todo-list">
        {state.entries.map((e) => (
          <li key={e.id}>
            <span>{e.label}</span>
            <b className={e.amount < 0 ? 'neg' : 'pos'}>{euro(e.amount, locale)}</b>
            <button className="icon-btn" aria-label={t('Delete')} onClick={() => onChange({ entries: state.entries.filter((x) => x.id !== e.id) })}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

registerWidget({
  type: 'expenses',
  label: 'Expenses',
  icon: '💶',
  category: 'numbers',
  defaultSize: { w: 300, h: 340 },
  initialState: () => ({ entries: [] }),
  Component: Expenses,
});
