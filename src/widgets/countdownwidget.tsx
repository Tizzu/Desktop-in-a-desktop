import { remaining } from './countdown';
import { useTick } from './timerCore';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface CountdownState { label: string; /** Data e ora, come "2026-12-24T18:00" (vuoto se non scelta). */ at: string }

function Countdown({ state, onChange }: WidgetProps<CountdownState>) {
  const t = useT();
  useTick(!!state.at, 15_000);
  const target = state.at ? new Date(state.at).getTime() : NaN;
  const r = Number.isNaN(target) ? null : remaining(target, Date.now());
  return (
    <div className="countdown">
      <input className="counter-label" value={state.label} placeholder={t('Counting down to…')} aria-label={t('Name')} onChange={(e) => onChange({ ...state, label: e.target.value })} />
      {r ? (
        <div className="countdown-value" aria-live="off">
          <b>{r.days}</b><small>{t('days')}</small> <b>{r.hours}</b><small>{t('hours')}</small> <b>{r.minutes}</b><small>{t('min')}</small>
        </div>
      ) : (
        <div className="timer-note">{t('Pick a date')}</div>
      )}
      <div className="timer-note">{r?.past ? t('ago') : r ? t('to go') : ''}</div>
      <input type="datetime-local" value={state.at} aria-label={t('Date')} onChange={(e) => onChange({ ...state, at: e.target.value })} />
    </div>
  );
}

registerWidget({
  type: 'countdown',
  label: 'Countdown',
  icon: '📅',
  category: 'time',
  defaultSize: { w: 260, h: 200 },
  initialState: () => ({ label: '', at: '' }),
  Component: Countdown,
});
