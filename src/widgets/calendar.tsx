import { useState } from 'react';
import { dayKey } from './dates';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';

interface CalendarState { marked: string[] }

const WEEK = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

function Calendar({ state, onChange }: WidgetProps<CalendarState>) {
  useToday(); // ridisegna allo scoccare della mezzanotte
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7; // settimana da lunedì
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const today = dayKey();
  const shift = (n: number) => { const d = new Date(view.y, view.m + n, 1); setView({ y: d.getFullYear(), m: d.getMonth() }); };

  const toggle = (key: string) =>
    onChange({ marked: state.marked.includes(key) ? state.marked.filter((k) => k !== key) : [...state.marked, key] });

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="icon-btn" aria-label="Mese precedente" onClick={() => shift(-1)}>‹</button>
        <button className="cal-title" title="Torna a oggi" onClick={() => setView({ y: now.getFullYear(), m: now.getMonth() })}>
          {first.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </button>
        <button className="icon-btn" aria-label="Mese successivo" onClick={() => shift(1)}>›</button>
      </div>
      <div className="cal-grid">
        {WEEK.map((d, i) => <span key={i} className="cal-wd">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const key = dayKey(new Date(view.y, view.m, i + 1));
          return (
            <button key={key} className={`cal-day${key === today ? ' today' : ''}${state.marked.includes(key) ? ' marked' : ''}`} onClick={() => toggle(key)}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

registerWidget({
  type: 'calendar',
  label: 'Calendario',
  icon: '📅',
  category: 'time',
  defaultSize: { w: 270, h: 280 },
  initialState: () => ({ marked: [] }),
  Component: Calendar,
});
