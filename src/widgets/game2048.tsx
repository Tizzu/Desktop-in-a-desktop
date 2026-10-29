import { useRef } from 'react';
import { canMove, emptyGrid, slide, spawn, type Grid } from './games';
import { registerWidget, type WidgetProps } from './registry';

interface G2048State { grid: Grid; score: number; best: number }

const fresh = (best = 0): G2048State => ({ grid: spawn(spawn(emptyGrid())), score: 0, best });
const KEYS: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

function Game2048({ state, onChange }: WidgetProps<G2048State>) {
  const over = !canMove(state.grid);

  const play = (dir: 'left' | 'right' | 'up' | 'down') => {
    const r = slide(state.grid, dir);
    if (!r.moved) return;
    const score = state.score + r.gained;
    onChange({ grid: spawn(r.grid), score, best: Math.max(state.best, score) });
  };
  const touch = useRef<{ x: number; y: number } | null>(null);

  return (
    <div className="g2048">
      <div className="g2048-head">
        <span>Punti <b>{state.score}</b> · record <b>{state.best}</b></span>
        <button className="chip" onClick={() => onChange(fresh(state.best))}>Nuova</button>
      </div>
      <div
        className="g2048-grid"
        tabIndex={0}
        role="application"
        aria-label="2048: usa le frecce o trascina"
        onKeyDown={(e) => { const d = KEYS[e.key]; if (d) { e.preventDefault(); play(d); } }}
        onPointerDown={(e) => { touch.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => {
          const s = touch.current; touch.current = null;
          if (!s) return;
          const dx = e.clientX - s.x, dy = e.clientY - s.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        }}
      >
        {state.grid.flat().map((v, i) => <div key={i} className={`t t${Math.min(v, 2048)}`}>{v || ''}</div>)}
        {over && <div className="g2048-over">Finita! <button className="btn primary" onClick={() => onChange(fresh(state.best))}>Ancora</button></div>}
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
