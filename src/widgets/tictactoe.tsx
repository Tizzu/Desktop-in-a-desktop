import { ticTacToe, type Mark } from './games';
import { registerWidget, type WidgetProps } from './registry';

interface TttState { cells: Mark[]; turn: 'X' | 'O' }

const fresh = (): TttState => ({ cells: Array(9).fill('') as Mark[], turn: 'X' });

function TicTacToe({ state, onChange }: WidgetProps<TttState>) {
  const result = ticTacToe(state.cells);
  const play = (i: number) => {
    if (result || state.cells[i]) return;
    onChange({ cells: state.cells.map((c, j) => (j === i ? state.turn : c)), turn: state.turn === 'X' ? 'O' : 'X' });
  };
  return (
    <div className="memory">
      <div className="g2048-head">
        <span>{result === 'draw' ? 'Pareggio' : result ? `Vince ${result} 🎉` : `Tocca a ${state.turn}`}</span>
        <button className="chip" onClick={() => onChange(fresh())}>Nuova</button>
      </div>
      <div className="ttt-grid">
        {state.cells.map((c, i) => <button key={i} className={`memory-card up ttt-${c}`} aria-label={`Casella ${i + 1}${c ? `: ${c}` : ''}`} onClick={() => play(i)}>{c}</button>)}
      </div>
    </div>
  );
}

registerWidget({
  type: 'tictactoe',
  label: 'Tris',
  icon: '❌',
  category: 'fun',
  defaultSize: { w: 240, h: 290 },
  initialState: fresh,
  Component: TicTacToe,
});
