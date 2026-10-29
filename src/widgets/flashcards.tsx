import { useState } from 'react';
import { registerWidget, type WidgetProps } from './registry';

interface Card { id: string; q: string; a: string; known: boolean }
interface FlashState { cards: Card[] }

function Flashcards({ state, onChange }: WidgetProps<FlashState>) {
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
        <input value={q} placeholder="Domanda" aria-label="Domanda" onChange={(e) => setQ(e.target.value)} />
        <input value={a} placeholder="Risposta" aria-label="Risposta" onChange={(e) => setA(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <div className="timer-actions">
          <button className="btn primary" disabled={!q.trim() || !a.trim()} onClick={add}>Aggiungi</button>
          <button className="btn" onClick={() => setAdding(false)}>Ripassa ({state.cards.length})</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flash">
      {card ? (
        <>
          <button className="flash-card" aria-label="Gira la scheda" onClick={() => setShown(!shown)}>{shown ? card.a : card.q}</button>
          <div className="timer-actions">
            <button className="btn" onClick={() => mark(false)}>Da rivedere</button>
            <button className="btn primary" onClick={() => mark(true)}>Lo so</button>
          </div>
          <div className="timer-note">{todo.length} da ripassare</div>
        </>
      ) : (
        <div className="timer-note">{state.cards.length ? 'Le sai tutte 🎉' : 'Nessuna scheda'}</div>
      )}
      <div className="timer-actions">
        <button className="chip" onClick={() => setAdding(true)}>Aggiungi</button>
        {state.cards.some((c) => c.known) && <button className="chip" onClick={() => onChange({ cards: state.cards.map((c) => ({ ...c, known: false })) })}>Ricomincia</button>}
      </div>
    </div>
  );
}

registerWidget({
  type: 'flashcards',
  label: 'Schede di ripasso',
  icon: '🃏',
  category: 'notes',
  defaultSize: { w: 280, h: 260 },
  initialState: () => ({ cards: [] }),
  Component: Flashcards,
});
