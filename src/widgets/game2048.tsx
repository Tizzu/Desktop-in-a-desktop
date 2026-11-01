import { useRef } from 'react';
import { canMove, emptyGrid, slide, spawn, type Grid } from './games';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface G2048State { grid: Grid; score: number; best: number }

const fresh = (best = 0): G2048State => ({ grid: spawn(spawn(emptyGrid())), score: 0, best });
const SWIPE = 18; // px
const KEYS: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

function Game2048({ state, onChange }: WidgetProps<G2048State>) {
  const t = useT();
  const over = !canMove(state.grid);

  const play = (dir: 'left' | 'right' | 'up' | 'down') => {
    const r = slide(state.grid, dir);
    if (!r.moved) return;
    const score = state.score + r.gained;
    onChange({ grid: spawn(r.grid), score, best: Math.max(state.best, score) });
  };
  // Un gesto = una mossa: scatta appena il dito/mouse si è spostato abbastanza, e il resto del trascinamento è ignorato.
  const drag = useRef<{ id: number; x: number; y: number; done: boolean } | null>(null);

  return (
    <div className="g2048">
      <div className="g2048-head">
        <span>{t('Score')} <b>{state.score}</b> · {t('best')} <b>{state.best}</b></span>
        <button className="chip" onClick={() => onChange(fresh(state.best))}>{t('New')}</button>
      </div>
      <div
        className="g2048-grid"
        tabIndex={0}
        role="application"
        aria-label={t('2048: use the arrow keys or drag')}
        onKeyDown={(e) => { const d = KEYS[e.key]; if (d) { e.preventDefault(); play(d); } }}
        onPointerDown={(e) => {
          e.preventDefault(); // niente selezione dei numeri né trascinamento del testo
          e.currentTarget.focus();
          e.currentTarget.setPointerCapture(e.pointerId); // il gesto continua anche fuori dalla griglia
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
        }}
        onPointerMove={(e) => {
          const s = drag.current;
          if (!s || s.id !== e.pointerId || s.done) return;
          const dx = e.clientX - s.x, dy = e.clientY - s.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
          s.done = true;
          play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        {state.grid.flat().map((v, i) => <div key={i} className={`t t${Math.min(v, 2048)}`}>{v || ''}</div>)}
        {over && <div className="g2048-over">{t('Game over!')} <button className="btn primary" onClick={() => onChange(fresh(state.best))}>{t('Again')}</button></div>}
      </div>
    </div>
  );
}

registerWidget({
  type: 'game2048',
  label: '2048',
  icon: '🔢',
  category: 'fun',
  defaultSize: { w: 280, h: 340 },
  initialState: () => fresh(),
  Component: Game2048,
});
