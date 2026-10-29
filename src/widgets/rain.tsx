import { registerWidget } from './registry';

// Solo CSS: gocce che scivolano su un vetro. Nessuno stato.
const DROPS = Array.from({ length: 22 }, (_, i) => ({ left: (i * 37) % 100, delay: ((i * 53) % 40) / 10, dur: 1.6 + ((i * 29) % 18) / 10 }));

function Rain() {
  return (
    <div className="rain" aria-label="Pioggia sul vetro" role="img">
      {DROPS.map((d, i) => <i key={i} style={{ left: `${d.left}%`, animationDelay: `-${d.delay}s`, animationDuration: `${d.dur}s` }} />)}
    </div>
  );
}

registerWidget({
  type: 'rain',
  label: 'Pioggia',
  icon: '🌧️',
  category: 'fun',
  defaultSize: { w: 260, h: 200 },
  initialState: () => ({}),
  Component: Rain,
});
