import { useState } from 'react';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface WheelState { options: string; /** Ultimo estratto. */ result: string }

const COLORS = ['#e9a23b', '#c8693f', '#7a9e6b', '#5b8a9e', '#a37fb0', '#d97a8a'];
const SPIN_MS = 3200;

function Wheel({ state, onChange }: WidgetProps<WheelState>) {
  const t = useT();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const opts = state.options.split('\n').map((o) => o.trim()).filter(Boolean);
  const n = opts.length;

  const spin = () => {
    if (n < 2 || spinning) return;
    const pick = Math.floor(Math.random() * n);
    // Il puntatore sta in alto: il centro dello spicchio estratto deve finire a 0°.
    const target = 360 * 5 + (360 - ((pick + 0.5) * 360) / n) + (Math.random() - 0.5) * (300 / n);
    setSpinning(true);
    setAngle(angle - (angle % 360) + target);
    setTimeout(() => { setSpinning(false); onChange({ ...state, result: opts[pick]! }); }, SPIN_MS);
  };

  const slice = (i: number) => {
    const a0 = ((i / n) * 2 - 0.5) * Math.PI, a1 = (((i + 1) / n) * 2 - 0.5) * Math.PI;
    const p = (a: number) => `${50 + 48 * Math.cos(a)} ${50 + 48 * Math.sin(a)}`;
    return `M50 50 L${p(a0)} A48 48 0 ${n === 1 ? 1 : 0} 1 ${p(a1)} Z`;
  };

  return (
    <div className="wheel">
      <div className="wheel-disc-wrap">
        <div className="wheel-pointer">▼</div>
        <svg viewBox="0 0 100 100" className="wheel-disc" style={{ transform: `rotate(${angle}deg)`, transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(.1,.7,.1,1)` : 'none' }} aria-hidden>
          {n >= 2 ? opts.map((o, i) => (
            <g key={i}>
              <path d={slice(i)} fill={COLORS[i % COLORS.length]} />
              <text x="50" y="14" fontSize="5" textAnchor="middle" fill="#fff" transform={`rotate(${((i + 0.5) / n) * 360} 50 50)`}>{o.slice(0, 10)}</text>
            </g>
          )) : <circle cx="50" cy="50" r="48" fill="var(--bar)" />}
        </svg>
      </div>
      <div className="wheel-result" aria-live="polite">{state.result ? `👉 ${state.result}` : ' '}</div>
      <button className="btn primary" disabled={n < 2 || spinning} onClick={spin}>{t('Spin')}</button>
      <textarea value={state.options} aria-label={t('Options, one per line')} placeholder={t('One option per line\nPizza\nSushi')} onChange={(e) => onChange({ ...state, options: e.target.value })} />
    </div>
  );
}

registerWidget({
  type: 'wheel',
  label: 'Wheel of fortune',
  icon: '🎡',
  category: 'fun',
  defaultSize: { w: 270, h: 410 },
  initialState: () => ({ options: 'Pizza\nSushi\nSalad\nPasta', result: '' }),
  Component: Wheel,
});
