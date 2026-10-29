import { registerWidget, type WidgetProps } from './registry';

interface BubblesState { popped: boolean[] }

const COUNT = 48;
const fresh = () => Array<boolean>(COUNT).fill(false);

let audio: AudioContext | undefined;
function popSound() {
  try {
    const ctx = (audio ??= new AudioContext());
    const len = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 700 + Math.random() * 500;
    const g = ctx.createGain();
    g.gain.value = 0.6;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
  } catch { /* audio non disponibile */ }
}

function Bubbles({ state, onChange }: WidgetProps<BubblesState>) {
  const popped = state.popped.length === COUNT ? state.popped : fresh();
  const left = popped.filter((p) => !p).length;
  return (
    <div className="bubbles">
      <div className="bubble-grid">
        {popped.map((p, i) => (
          <button
            key={i}
            className={`bubble${p ? ' popped' : ''}`}
            aria-label={p ? 'Bolla scoppiata' : 'Scoppia la bolla'}
            onClick={() => { if (p) return; popSound(); onChange({ popped: popped.map((x, j) => x || j === i) }); }}
          />
        ))}
      </div>
      <footer className="todo-foot">
        <span>{left === 0 ? 'Tutte scoppiate 🎉' : `${left} rimaste`}</span>
        <button className="chip" onClick={() => onChange({ popped: fresh() })}>Rigenera</button>
      </footer>
    </div>
  );
}

registerWidget({
  type: 'bubbles',
  label: 'Bolle',
  icon: '🫧',
  category: 'fun',
  defaultSize: { w: 290, h: 240 },
  initialState: () => ({ popped: fresh() }),
  Component: Bubbles,
});
