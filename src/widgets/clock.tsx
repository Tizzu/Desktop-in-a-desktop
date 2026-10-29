import { useEffect, useState } from 'react';
import { registerWidget } from './registry';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="clock">
      <div className="clock-time">{now.toLocaleTimeString('it-IT')}</div>
      <div className="clock-date">{now.toLocaleDateString('it-IT', { dateStyle: 'full' })}</div>
    </div>
  );
}

registerWidget({
  type: 'clock',
  label: 'Orologio',
  icon: '🕒',
  category: 'time',
  defaultSize: { w: 260, h: 120 },
  initialState: () => ({}),
  Component: Clock,
});
