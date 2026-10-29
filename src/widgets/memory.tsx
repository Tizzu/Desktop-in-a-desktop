import { useEffect } from 'react';
import { deck } from './games';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface MemoryState { cards: string[]; matched: number[]; open: number[]; moves: number }

const fresh = (): MemoryState => ({ cards: deck(), matched: [], open: [], moves: 0 });

function Memory({ state, onChange }: WidgetProps<MemoryState>) {
  const t = useT();
  const won = state.matched.length === state.cards.length;
  const pair = state.open.length === 2;

  // Due carte scoperte: dopo un attimo si accoppiano o si rigirano.
  useEffect(() => {
    if (!pair) return;
    const t = setTimeout(() => {
      const [a, b] = state.open;
      onChange({ ...state, open: [], matched: state.cards[a!] === state.cards[b!] ? [...state.matched, a!, b!] : state.matched });
    }, 700);
    return () => clearTimeout(t);
  }, [pair]); // eslint-disable-line react-hooks/exhaustive-deps

  const flip = (i: number) => {
    if (pair || state.open.includes(i) || state.matched.includes(i)) return;
    onChange({ ...state, open: [...state.open, i], moves: state.open.length === 1 ? state.moves + 1 : state.moves });
  };

  return (
    <div className="memory">
      <div className="g2048-head">
        <span>{won ? t('Done in {n} moves 🎉', { n: state.moves }) : t('Moves {n}', { n: state.moves })}</span>
        <button className="chip" onClick={() => onChange(fresh())}>{t('New')}</button>
      </div>
      <div className="memory-grid">
        {state.cards.map((c, i) => {
          const up = state.open.includes(i) || state.matched.includes(i);
          return <button key={i} className={`memory-card${up ? ' up' : ''}`} aria-label={up ? c : t('Face-down card')} onClick={() => flip(i)}>{up ? c : ''}</button>;
        })}
      </div>
    </div>
  );
}

registerWidget({
  type: 'memory',
  label: 'Memory',
  icon: '🧠',
  category: 'fun',
  defaultSize: { w: 280, h: 330 },
  initialState: fresh,
  Component: Memory,
});
