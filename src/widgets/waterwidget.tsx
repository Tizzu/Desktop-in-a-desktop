import { useId, useState } from 'react';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';
import { addWater, lastDays, ratio, type WaterLog } from './water';

interface WaterState {
  /** Obiettivo giornaliero in ml. */
  goal: number;
  /** Dimensione del bicchiere in ml. */
  glass: number;
  log: WaterLog;
}

// Contorno del bicchiere nel viewBox 100x140; l'acqua lo riempie da y=135 (fondo) a y=10 (bordo).
const GLASS = 'M14 10 H86 L79 130 Q78 135 73 135 H27 Q22 135 21 130 Z';
const TOP = 10, BOTTOM = 135;

function Water({ state, onChange }: WidgetProps<WaterState>) {
  const [editing, setEditing] = useState(false);
  const clipId = useId().replace(/:/g, '');
  const today = useToday();
  const ml = state.log[today] ?? 0;
  const r = ratio(ml, state.goal);
  const add = (n: number) => onChange({ ...state, log: addWater(state.log, today, n) });
  const week = lastDays(state.log, 7);

  return (
    <div className="water">
      <div className="water-main">
        <svg className="water-glass" viewBox="0 0 100 140" role="img" aria-label={`${Math.round(r * 100)}% dell'obiettivo`}>
          <defs><clipPath id={clipId}><path d={GLASS} /></clipPath></defs>
          <g clipPath={`url(#${clipId})`}>
            <g className="water-level" style={{ transform: `translateY(${BOTTOM - r * (BOTTOM - TOP)}px)` }}>
              <path className="water-wave" d="M0 4 Q12.5 0 25 4 T50 4 T75 4 T100 4 T125 4 T150 4 T175 4 T200 4 V140 H0 Z" />
            </g>
          </g>
          <path d={GLASS} className="water-outline" />
        </svg>
        <div className="water-info">
          <div className="water-ml">{ml}<small> ml</small></div>
          <div className="muted">{r >= 1 ? 'Obiettivo raggiunto 💧' : `su ${state.goal} ml · ${Math.round(r * 100)}%`}</div>
          <button className="btn primary" onClick={() => add(state.glass)}>+ {state.glass} ml</button>
          <div className="water-chips">
            {[100, 500].map((n) => <button key={n} className="chip" onClick={() => add(n)}>+{n}</button>)}
            <button className="chip" disabled={ml === 0} aria-label={`Togli ${state.glass} ml`} onClick={() => add(-state.glass)}>−{state.glass}</button>
          </div>
        </div>
      </div>
      <div className="water-week" aria-label="Ultimi 7 giorni">
        {week.map((d) => (
          <div key={d.day} className="water-day" title={`${d.date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}: ${d.ml} ml`}>
            <div className="water-bar"><div className={ratio(d.ml, state.goal) >= 1 ? 'full' : ''} style={{ height: `${ratio(d.ml, state.goal) * 100}%` }} /></div>
            <span className={d.day === today ? 'today' : ''}>{d.date.toLocaleDateString('it-IT', { weekday: 'narrow' }).toUpperCase()}</span>
          </div>
        ))}
        <button className="icon-btn" aria-label="Impostazioni acqua" aria-expanded={editing} onClick={() => setEditing(!editing)}>⚙</button>
      </div>
      {editing && (
        <div className="water-opts">
          <label>obiettivo <input type="number" min={100} step={100} value={state.goal} onChange={(e) => onChange({ ...state, goal: Math.max(100, Number(e.target.value) || 100) })} /> ml</label>
          <label>bicchiere <input type="number" min={50} step={50} value={state.glass} onChange={(e) => onChange({ ...state, glass: Math.max(50, Number(e.target.value) || 50) })} /> ml</label>
        </div>
      )}
    </div>
  );
}

registerWidget({
  type: 'water',
  label: 'Acqua',
  icon: '💧',
  category: 'wellbeing',
  defaultSize: { w: 320, h: 270 },
  initialState: () => ({ goal: 2000, glass: 250, log: {} }),
  Component: Water,
});
