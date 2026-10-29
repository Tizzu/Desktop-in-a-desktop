import { useState } from 'react';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface DiceState { sides: number; count: number; results: number[] }

const SIDES = [2, 4, 6, 8, 10, 12, 20, 100];

function Dice({ state, onChange }: WidgetProps<DiceState>) {
  const t = useT();
  const [roll, setRoll] = useState(0);
  const coin = state.sides === 2;
  const count = coin ? 1 : state.count;

  const throwDice = () => {
    const results = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * state.sides));
    onChange({ ...state, results });
    setRoll((n) => n + 1);
  };
  const sum = state.results.reduce((a, b) => a + b, 0);

  return (
    <div className="dice">
      <div className="dice-opts">
        {!coin && (
          <select value={state.count} aria-label={t('Number of dice')} onChange={(e) => onChange({ ...state, count: Number(e.target.value), results: [] })}>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
        <select value={state.sides} aria-label={t('Sides')} onChange={(e) => onChange({ ...state, sides: Number(e.target.value), results: [] })}>
          {SIDES.map((s) => <option key={s} value={s}>{s === 2 ? t('Coin') : `d${s}`}</option>)}
        </select>
      </div>
      <div className="dice-out" key={roll}>
        {state.results.length === 0 ? <span className="muted">{t('Roll!')}</span> : state.results.map((r, i) => (
          <span key={i} className="die">{coin ? (r === 1 ? t('Heads') : t('Tails')) : r}</span>
        ))}
      </div>
      {!coin && state.results.length > 1 && <div className="muted">{t('Total {sum}', { sum })}</div>}
      <button className="btn primary" onClick={throwDice}>{t('Roll')}</button>
    </div>
  );
}

registerWidget({
  type: 'dice',
  label: 'Dice',
  icon: '🎲',
  category: 'fun',
  defaultSize: { w: 250, h: 220 },
  initialState: () => ({ sides: 6, count: 2, results: [] }),
  Component: Dice,
});
