import { dayKey, daysBetween } from './dates';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface StreakState {
  /** Testo libero dopo "Giorni…": "senza fumare", "dal trasloco"… */
  label: string;
  since: string;
  /** Giorni già contati quando si è iniziato (si può partire da un numero qualsiasi); assente nei dati vecchi. */
  base?: number;
}

function Streak({ state, onChange }: WidgetProps<StreakState>) {
  const t = useT();
  const today = useToday();
  const base = state.base ?? 0;
  const days = base + Math.max(0, daysBetween(state.since, today));
  return (
    <div className="counter">
      <div className="timer-note">{t('Days…')}</div>
      <input className="counter-label" value={state.label} placeholder={t('without… / since…')} aria-label={t('Name')} onChange={(e) => onChange({ ...state, label: e.target.value })} />
      <div className="counter-value">{days}<small> {days === 1 ? t('day') : t('days')}</small></div>
      <div className="counter-opts">
        <label>
          {t('start at')}
          <input
            type="number"
            min={0}
            max={99999}
            value={base}
            aria-label={t('Starting count')}
            onChange={(e) => onChange({ ...state, base: Math.min(99999, Math.max(0, Math.floor(Number(e.target.value)) || 0)) })}
          />
        </label>
        <button className="chip" onClick={() => onChange({ ...state, since: dayKey(), base: 0 })}>{t('Restart from today')}</button>
      </div>
    </div>
  );
}

registerWidget({
  type: 'streak',
  label: 'Day streak',
  icon: '🔥',
  category: 'wellbeing',
  defaultSize: { w: 260, h: 250 },
  initialState: () => ({ label: '', since: dayKey(), base: 0 }),
  hasData: (s: StreakState) => (s.base ?? 0) > 0 || daysBetween(s.since, dayKey()) > 0,
  Component: Streak,
});
