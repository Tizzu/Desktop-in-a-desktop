import { useState } from 'react';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface Card { id: string; q: string; a: string; known: boolean }
interface FlashState { cards: Card[] }

function Flashcards({ state, onChange }: WidgetProps<FlashState>) {
  const t = useT();
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [shown, setShown] = useState(false);
  const [adding, setAdding] = useState(state.cards.length === 0);
  const [skip, setSkip] = useState(0);

  const todo = state.cards.filter((c) => !c.known);
  const card = todo.length ? todo[skip % todo.length] : undefined;
  const mark = (known: boolean) => {
    if (!card) return;
    setShown(false);
    if (known) onChange({ cards: state.cards.map((c) => (c.id === card.id ? { ...c, known } : c)) });
    else setSkip(skip + 1);
  };
  const add = () => {
    if (!q.trim() || !a.trim()) return;
    onChange({ cards: [...state.cards, { id: crypto.randomUUID(), q: q.trim(), a: a.trim(), known: false }] });
    setQ(''); setA('');
  };

  if (adding) {
    return (
      <div className="todo">
        <input value={q} placeholder={t('Question')} aria-label={t('Question')} onChange={(e) => setQ(e.target.value)} />
        <input value={a} placeholder={t('Answer')} aria-label={t('Answer')} onChange={(e) => setA(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <div className="timer-actions">
          <button className="btn primary" disabled={!q.trim() || !a.trim()} onClick={add}>{t('Add')}</button>
          <button className="btn" onClick={() => setAdding(false)}>{t('Review')} ({state.cards.length})</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flash">
      {card ? (
        <>
          <button className="flash-card" aria-label={t('Flip the card')} onClick={() => setShown(!shown)}>{shown ? card.a : card.q}</button>
          <div className="timer-actions">
            <button className="btn" onClick={() => mark(false)}>{t('Review again')}</button>
            <button className="btn primary" onClick={() => mark(true)}>{t('I know it')}</button>
          </div>
          <div className="timer-note">{t('{n} to review', { n: todo.length })}</div>
        </>
      ) : (
        <div className="timer-note">{state.cards.length ? t('You know them all 🎉') : t('No cards')}</div>
      )}
      <div className="timer-actions">
        <button className="chip" onClick={() => setAdding(true)}>{t('Add')}</button>
        {state.cards.some((c) => c.known) && <button className="chip" onClick={() => onChange({ cards: state.cards.map((c) => ({ ...c, known: false })) })}>{t('Start over')}</button>}
      </div>
    </div>
  );
}

registerWidget({
  type: 'flashcards',
  label: 'Flashcards',
  icon: '🃏',
  category: 'notes',
  defaultSize: { w: 280, h: 260 },
  initialState: () => ({ cards: [] }),
  Component: Flashcards,
});
