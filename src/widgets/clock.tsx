import { useEffect, useState } from 'react';
import { registerWidget } from './registry';
import { useLocale } from '../core/i18n';

function Clock() {
  const locale = useLocale();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="clock">
      <div className="clock-time">{now.toLocaleTimeString(locale)}</div>
      <div className="clock-date">{now.toLocaleDateString(locale, { dateStyle: 'full' })}</div>
    </div>
  );
}

registerWidget({
  type: 'clock',
  label: 'Clock',
  icon: '🕒',
  category: 'time',
  defaultSize: { w: 260, h: 120 },
  initialState: () => ({}),
  Component: Clock,
});
