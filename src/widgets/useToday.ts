import { useEffect, useState } from 'react';
import { dayKey } from './dates';

/** Chiave del giorno corrente, che si aggiorna da sola a mezzanotte e al risveglio della scheda. */
export function useToday() {
  const [day, setDay] = useState(() => dayKey());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => { setDay(dayKey()); arm(); }, nextMidnight.getTime() - now.getTime());
    };
    arm();
    // Una scheda in background o un computer sospeso possono saltare il timer: ricontrolla quando torna visibile.
    const onVisible = () => document.visibilityState === 'visible' && setDay(dayKey());
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  return day;
}
