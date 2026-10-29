import { useTick } from './timerCore';
import { registerWidget, type WidgetProps } from './registry';

interface WorldState { zones: string[] }

const PRESETS: Record<string, string> = {
  'Europe/Rome': 'Roma',
  'Europe/London': 'Londra',
  'America/New_York': 'New York',
  'America/Los_Angeles': 'Los Angeles',
  'America/Sao_Paulo': 'San Paolo',
  'Africa/Cairo': 'Il Cairo',
  'Asia/Dubai': 'Dubai',
  'Asia/Kolkata': 'Mumbai',
  'Asia/Shanghai': 'Shanghai',
  'Asia/Tokyo': 'Tokyo',
  'Australia/Sydney': 'Sydney',
  'Pacific/Auckland': 'Auckland',
};

function WorldClock({ state, onChange }: WidgetProps<WorldState>) {
  useTick(true, 1000);
  const now = new Date();
  const free = Object.keys(PRESETS).filter((z) => !state.zones.includes(z));
  return (
    <div className="world">
      <ul>
        {state.zones.map((z) => (
          <li key={z}>
            <span>{PRESETS[z] ?? z}</span>
            <span className="muted">{now.toLocaleDateString('it-IT', { timeZone: z, weekday: 'short' })}</span>
            <strong>{now.toLocaleTimeString('it-IT', { timeZone: z, hour: '2-digit', minute: '2-digit' })}</strong>
            <button className="icon-btn" aria-label={`Rimuovi ${PRESETS[z] ?? z}`} onClick={() => onChange({ zones: state.zones.filter((x) => x !== z) })}>×</button>
          </li>
        ))}
      </ul>
      {free.length > 0 && (
        <select value="" aria-label="Aggiungi città" onChange={(e) => e.target.value && onChange({ zones: [...state.zones, e.target.value] })}>
          <option value="">+ Aggiungi città…</option>
          {free.map((z) => <option key={z} value={z}>{PRESETS[z]}</option>)}
        </select>
      )}
    </div>
  );
}

registerWidget({
  type: 'worldclock',
  label: 'Fusi orari',
  icon: '🌍',
  category: 'time',
  defaultSize: { w: 270, h: 230 },
  initialState: () => ({ zones: ['Europe/Rome', 'America/New_York', 'Asia/Tokyo'] }),
  Component: WorldClock,
});
