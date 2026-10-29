import { useState } from 'react';
import { euro } from './money';
import { registerWidget, type WidgetProps } from './registry';
import { useT, useLocale } from '../core/i18n';

interface PiggyState { label: string; goal: number; saved: number }

function Piggy({ state, onChange }: WidgetProps<PiggyState>) {
  const t = useT();
  const locale = useLocale();
  const [amount, setAmount] = useState('');
  const value = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(value) && value > 0;
  const move = (sign: 1 | -1) => {
    if (!valid) return;
    onChange({ ...state, saved: Math.max(0, Math.round((state.saved + sign * value) * 100) / 100) });
    setAmount('');
  };
  const pct = state.goal > 0 ? Math.min(100, (state.saved / state.goal) * 100) : 0;
  return (
    <div className="counter">
      <input className="counter-label" value={state.label} placeholder={t('What are you saving for?')} aria-label={t('Name')} onChange={(e) => onChange({ ...state, label: e.target.value })} />
      <div className="counter-value">🐷 {euro(state.saved, locale)}</div>
      <div className="timer-bar"><div style={{ width: `${pct}%` }} /></div>
      <div className="timer-note">{state.goal > 0 ? (state.saved >= state.goal ? t('Goal reached 🎉') : t('{amount} to go', { amount: euro(state.goal - state.saved, locale) })) : ''}</div>
      <div className="counter-opts">
        <input value={amount} inputMode="decimal" placeholder="€" aria-label={t('Amount')} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && move(1)} />
        <button className="chip" disabled={!valid} onClick={() => move(-1)}>{t('Withdraw')}</button>
        <button className="chip on" disabled={!valid} onClick={() => move(1)}>{t('Deposit')}</button>
      </div>
      <div className="counter-opts">
        <label>{t('goal')} € <input type="number" min={0} value={state.goal} onChange={(e) => onChange({ ...state, goal: Math.max(0, Number(e.target.value) || 0) })} /></label>
      </div>
    </div>
  );
}

registerWidget({
  type: 'piggy',
  label: 'Piggy bank',
  icon: '🐷',
  category: 'numbers',
  defaultSize: { w: 260, h: 280 },
  initialState: () => ({ label: '', goal: 0, saved: 0 }),
  Component: Piggy,
});
