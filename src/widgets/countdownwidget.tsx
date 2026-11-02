import { remaining } from './countdown';
import { periods, type PeriodId } from './timeleft';
import { useTick } from './timerCore';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface CountdownState {
  label: string;
  /** Data e ora, come "2026-12-24T18:00" (vuoto se non scelta). */
  at: string;
  /** Vista: il conto alla rovescia, oppure quanto è trascorso di giorno, settimana, mese e anno. */
  view?: 'countdown' | 'timeleft';
}

const PERIOD_LABELS: Record<PeriodId, string> = { day: 'Day', week: 'Week', month: 'Month', year: 'Year' };

function Countdown({ state, onChange }: WidgetProps<CountdownState>) {
  const t = useT();
  const timeLeft = state.view === 'timeleft';
  useTick(timeLeft || !!state.at, timeLeft ? 30_000 : 15_000);
  const target = state.at ? new Date(state.at).getTime() : NaN;
  const r = Number.isNaN(target) ? null : remaining(target, Date.now());
  const views = (
    <div className="cd-views" role="tablist">
      <button role="tab" aria-selected={!timeLeft} className={`chip${!timeLeft ? ' on' : ''}`} onClick={() => onChange({ ...state, view: 'countdown' })}>{t('Countdown')}</button>
      <button role="tab" aria-selected={timeLeft} className={`chip${timeLeft ? ' on' : ''}`} onClick={() => onChange({ ...state, view: 'timeleft' })}>{t('Time left')}</button>
    </div>
  );

  if (timeLeft) {
    const now = new Date();
    return (
      <div className="countdown timeleft">
        {views}
        <ul className="tl-list">
          {periods(now).map((p) => {
            const left = remaining(p.end, now.getTime());
            const text = left.days > 0 ? `${left.days} ${t('days')} ${left.hours} ${t('hours')}` : `${left.hours} ${t('hours')} ${left.minutes} ${t('min')}`;
            return (
              <li key={p.id}>
                <div className="tl-head"><span>{t(PERIOD_LABELS[p.id])}</span><b>{Math.floor(p.fraction * 100)}%</b></div>
                <div className="timer-bar" role="progressbar" aria-label={t(PERIOD_LABELS[p.id])} aria-valuenow={Math.floor(p.fraction * 100)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${p.fraction * 100}%` }} /></div>
                <small>{text} {t('to go')}</small>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="countdown">
      {views}
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
  defaultSize: { w: 310, h: 300 },
  initialState: () => ({ label: '', at: '', view: 'countdown' }),
  Component: Countdown,
});
