import { useTick } from './timerCore';
import { registerWidget, type WidgetProps } from './registry';
import { useT, useLocale } from '../core/i18n';

interface WorldState { zones: string[] }

const PRESETS: Record<string, string> = {
  'Europe/Rome': 'Rome',
  'Europe/London': 'London',
  'America/New_York': 'New York',
  'America/Los_Angeles': 'Los Angeles',
  'America/Sao_Paulo': 'São Paulo',
  'Africa/Cairo': 'Cairo',
  'Asia/Dubai': 'Dubai',
  'Asia/Kolkata': 'Mumbai',
  'Asia/Shanghai': 'Shanghai',
  'Asia/Tokyo': 'Tokyo',
  'Australia/Sydney': 'Sydney',
  'Pacific/Auckland': 'Auckland',
};

function WorldClock({ state, onChange }: WidgetProps<WorldState>) {
  const t = useT();
  const locale = useLocale();
  useTick(true, 1000);
  const now = new Date();
  const free = Object.keys(PRESETS).filter((z) => !state.zones.includes(z));
  return (
    <div className="world">
      <ul>
        {state.zones.map((z) => (
          <li key={z}>
            <span>{t(PRESETS[z] ?? z)}</span>
            <span className="muted">{now.toLocaleDateString(locale, { timeZone: z, weekday: 'short' })}</span>
            <strong>{now.toLocaleTimeString(locale, { timeZone: z, hour: '2-digit', minute: '2-digit' })}</strong>
            <button className="icon-btn" aria-label={t('Remove {city}', { city: t(PRESETS[z] ?? z) })} onClick={() => onChange({ zones: state.zones.filter((x) => x !== z) })}>×</button>
          </li>
        ))}
      </ul>
      {free.length > 0 && (
        <select value="" aria-label={t('Add city')} onChange={(e) => e.target.value && onChange({ zones: [...state.zones, e.target.value] })}>
          <option value="">{t('+ Add city…')}</option>
          {free.map((z) => <option key={z} value={z}>{t(PRESETS[z]!)}</option>)}
        </select>
      )}
    </div>
  );
}

registerWidget({
  type: 'worldclock',
  label: 'World clock',
  icon: '🌍',
  category: 'time',
  defaultSize: { w: 270, h: 230 },
  initialState: () => ({ zones: ['Europe/Rome', 'America/New_York', 'Asia/Tokyo'] }),
  Component: WorldClock,
});
