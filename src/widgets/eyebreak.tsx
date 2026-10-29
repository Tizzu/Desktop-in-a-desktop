import { useEffect } from 'react';
import { clearReminder, formatClock, setReminder, useTick } from './timerCore';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

// Regola 20-20-20: ogni 20 minuti, 20 secondi guardando a 20 piedi (~6 m) di distanza.
const WORK = 20 * 60_000;
const LOOK = 20_000;
const TEXT = 'Eye break: look away for 20 seconds';

interface EyeState { /** Fine del periodo di lavoro, se attivo. */ endsAt: number | null }

function EyeBreak({ state, onChange }: WidgetProps<EyeState>) {
  const t = useT();
  const on = state.endsAt !== null;
  useTick(on, 500);
  const now = Date.now();
  const looking = on && now >= state.endsAt!;
  const lookLeft = looking ? state.endsAt! + LOOK - now : 0;

  const restart = (from: number) => {
    const endsAt = from + WORK;
    setReminder(endsAt, TEXT);
    onChange({ endsAt });
  };
  // Finita la pausa si riparte da soli.
  const over = looking && lookLeft <= 0;
  useEffect(() => { if (over) restart(Date.now()); }, [over]); // eslint-disable-line react-hooks/exhaustive-deps
  const stop = () => { clearReminder(state.endsAt!, TEXT); onChange({ endsAt: null }); };

  return (
    <div className="timer">
      <div className="timer-note">{!on ? t('Off') : looking ? t('Look into the distance 👀') : t('Next break in')}</div>
      <div className={`timer-time${looking ? ' done' : ''}`}>{on ? formatClock(looking ? lookLeft : state.endsAt! - now) : formatClock(WORK)}</div>
      <div className="timer-actions">
        <button className="btn primary" onClick={on ? stop : () => restart(Date.now())}>{on ? t('Stop') : t('Start')}</button>
      </div>
    </div>
  );
}

registerWidget({
  type: 'eyebreak',
  label: 'Eye break',
  icon: '👀',
  category: 'wellbeing',
  defaultSize: { w: 230, h: 200 },
  initialState: () => ({ endsAt: null }),
  Component: EyeBreak,
});
