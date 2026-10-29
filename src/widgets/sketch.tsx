import { DrawLayer, type Stroke } from './DrawLayer';
import { registerWidget, type WidgetProps } from './registry';

interface SketchState { strokes: Stroke[]; ink: string; size: number }

const BOARD = '#2f4a3c';
const CHALKS = ['#f5f1e6', '#ffd966', '#f4a6c0', '#8ecae6'];
const SIZES = [2.6, 6];
const ERASER = { color: BOARD, width: 20 };

function Sketch({ state, onChange }: WidgetProps<SketchState>) {
  const erasing = state.ink === BOARD;
  const width = erasing ? ERASER.width : state.size;
  return (
    <div className="sketch" style={{ background: BOARD }}>
      <DrawLayer
        strokes={state.strokes}
        color={state.ink}
        width={width}
        active
        onStroke={(s) => onChange({ ...state, strokes: [...state.strokes, s] })}
      />
      <div className="sketch-tools">
        {CHALKS.map((c) => (
          <button key={c} className={`dot${c === state.ink ? ' on' : ''}`} style={{ background: c }} aria-label={`Gesso ${c}`} onClick={() => onChange({ ...state, ink: c })} />
        ))}
        <button className={`chip${erasing ? ' on' : ''}`} onClick={() => onChange({ ...state, ink: BOARD })}>Gomma</button>
        {SIZES.map((s) => (
          <button key={s} className={`chip${state.size === s && !erasing ? ' on' : ''}`} onClick={() => onChange({ ...state, size: s, ink: erasing ? CHALKS[0]! : state.ink })}>
            {s < 4 ? 'Fine' : 'Spesso'}
          </button>
        ))}
        <button className="chip" disabled={state.strokes.length === 0} aria-label="Annulla" onClick={() => onChange({ ...state, strokes: state.strokes.slice(0, -1) })}>↶</button>
        <button className="chip" disabled={state.strokes.length === 0} aria-label="Pulisci" onClick={() => onChange({ ...state, strokes: [] })}>🗑</button>
      </div>
    </div>
  );
}

registerWidget({
  type: 'sketch',
  label: 'Lavagna',
  icon: '🖍️',
  category: 'notes',
  defaultSize: { w: 380, h: 290 },
  initialState: () => ({ strokes: [], ink: CHALKS[0]!, size: SIZES[0]! }),
  Component: Sketch,
});
