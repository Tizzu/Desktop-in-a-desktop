import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

// L'alarm fa suonare la notifica anche a scheda chiusa (vedi entrypoints/background.ts).
const alarmName = (endsAt: number) => `timer:${endsAt}`;
export const setAlarm = (endsAt: number) => { try { void browser.alarms.create(alarmName(endsAt), { when: endsAt }); } catch { /* fuori dall'estensione */ } };
export const clearAlarm = (endsAt: number) => { try { void browser.alarms.clear(alarmName(endsAt)); } catch { /* idem */ } };


// Promemoria con testo: il testo viaggia nel nome dell'alarm, così il service worker lo mostra senza leggere i dati.
const reminderName = (when: number, text: string) => `reminder:${when}:${text.slice(0, 120)}`;
export const setReminder = (when: number, text: string) => { try { void browser.alarms.create(reminderName(when, text), { when }); } catch { /* fuori dall'estensione */ } };
export const clearReminder = (when: number, text: string) => { try { void browser.alarms.clear(reminderName(when, text)); } catch { /* idem */ } };

export function formatClock(ms: number) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Forza un nuovo render a intervallo regolare finché `active`; i valori si leggono con Date.now(). */
export function useTick(active: boolean, every = 250) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => set((n) => n + 1), every);
    return () => clearInterval(t);
  }, [active, every]);
}
