import { useEffect, useState } from 'react';
import { registerWidget, type WidgetProps } from './registry';

interface BreathingState { pattern: string }
interface Step { label: string; secs: number; scale: number }

const FULL = 1, SMALL = 0.45;
const PATTERNS: Record<string, { label: string; steps: Step[] }> = {
  calm: { label: 'Calma 5-5', steps: [{ label: 'Inspira', secs: 5, scale: FULL }, { label: 'Espira', secs: 5, scale: SMALL }] },
  box: { label: 'Quadrato 4-4-4-4', steps: [
    { label: 'Inspira', secs: 4, scale: FULL }, { label: 'Trattieni', secs: 4, scale: FULL },
    { label: 'Espira', secs: 4, scale: SMALL }, { label: 'Trattieni', secs: 4, scale: SMALL },
  ] },
  relax: { label: 'Rilassante 4-7-8', steps: [
    { label: 'Inspira', secs: 4, scale: FULL }, { label: 'Trattieni', secs: 7, scale: FULL }, { label: 'Espira', secs: 8, scale: SMALL },
  ] },
};

function Breathing({ state, onChange }: WidgetProps<BreathingState>) {
  const pattern = PATTERNS[state.pattern] ?? PATTERNS.calm!;
  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(0);
  const step = pattern.steps[idx % pattern.steps.length]!;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % pattern.steps.length), step.secs * 1000);
    return () => clearTimeout(t);
  }, [running, idx, pattern, step.secs]);

  const toggle = () => { setIdx(0); setRunning(!running); };

  return (
    <div className="breath">
      <div className="breath-stage">
        <div
          className="breath-orb"
          style={{ transform: `scale(${running ? step.scale : 0.7})`, transitionDuration: running ? `${step.secs}s` : '.5s' }}
        />
        <span className="breath-label">{running ? step.label : 'Pronto'}</span>
      </div>
      <select value={state.pattern} aria-label="Schema" onChange={(e) => { setRunning(false); onChange({ pattern: e.target.value }); }}>
        {Object.entries(PATTERNS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
      </select>
      <button className="btn primary" onClick={toggle}>{running ? 'Ferma' : 'Respira'}</button>
    </div>
  );
}

registerWidget({
  type: 'breathing',
  label: 'Respiro',
  icon: '🫧',
  category: 'wellbeing',
  defaultSize: { w: 230, h: 290 },
  initialState: () => ({ pattern: 'calm' }),
  Component: Breathing,
});
