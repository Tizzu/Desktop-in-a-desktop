import { useEffect, useState } from 'react';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface BreathingState { pattern: string }
interface Step { label: string; secs: number; scale: number }

const FULL = 1, SMALL = 0.45;
const PATTERNS: Record<string, { label: string; steps: Step[] }> = {
  calm: { label: 'Calm 5-5', steps: [{ label: 'Breathe in', secs: 5, scale: FULL }, { label: 'Breathe out', secs: 5, scale: SMALL }] },
  box: { label: 'Box 4-4-4-4', steps: [
    { label: 'Breathe in', secs: 4, scale: FULL }, { label: 'Hold', secs: 4, scale: FULL },
    { label: 'Breathe out', secs: 4, scale: SMALL }, { label: 'Hold', secs: 4, scale: SMALL },
  ] },
  relax: { label: 'Relaxing 4-7-8', steps: [
    { label: 'Breathe in', secs: 4, scale: FULL }, { label: 'Hold', secs: 7, scale: FULL }, { label: 'Breathe out', secs: 8, scale: SMALL },
  ] },
};

function Breathing({ state, onChange }: WidgetProps<BreathingState>) {
  const t = useT();
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
        <span className="breath-label">{running ? t(step.label) : t('Ready')}</span>
      </div>
      <select value={state.pattern} aria-label={t('Pattern')} onChange={(e) => { setRunning(false); onChange({ pattern: e.target.value }); }}>
        {Object.entries(PATTERNS).map(([id, p]) => <option key={id} value={id}>{t(p.label)}</option>)}
      </select>
      <button className="btn primary" onClick={toggle}>{running ? t('Stop') : t('Breathe')}</button>
    </div>
  );
}

registerWidget({
  type: 'breathing',
  label: 'Breathing',
  icon: '🫧',
  category: 'wellbeing',
  defaultSize: { w: 230, h: 290 },
  initialState: () => ({ pattern: 'calm' }),
  Component: Breathing,
});
