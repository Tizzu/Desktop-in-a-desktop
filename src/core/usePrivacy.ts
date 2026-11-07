import { useEffect, useState } from 'react';
import { matchesShortcut } from './shortcut';
import type { Settings } from './types';

const ACTIVITY = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Stato della modalità privacy: la pagina è nascosta o no. Non si salva e non si sincronizza tra schede: ricaricando
 * si torna a vedere tutto. Si attiva con la scorciatoia, e da sola se si lascia la scheda o si resta fermi.
 */
export function usePrivacy(s: Pick<Settings, 'privacyKey' | 'privacyOnLeave' | 'privacyIdle'>, enabled: boolean) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!matchesShortcut(s.privacyKey, e)) return;
      // Un tasto semplice si scrive: non vale mentre si digita in un campo. Con Ctrl/Alt/Cmd vale sempre.
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]');
      if (typing && !(e.ctrlKey || e.altKey || e.metaKey)) return;
      e.preventDefault();
      setHidden((h) => !h);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, s.privacyKey]);

  useEffect(() => {
    if (!enabled || !s.privacyOnLeave) return;
    const onVisibility = () => document.visibilityState === 'hidden' && setHidden(true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled, s.privacyOnLeave]);

  // Dopo N minuti senza gesti la pagina si nasconde; ogni gesto fa ripartire il conto.
  useEffect(() => {
    if (!enabled || !s.privacyIdle || hidden) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setHidden(true), s.privacyIdle * 60_000);
    };
    arm();
    for (const ev of ACTIVITY) window.addEventListener(ev, arm, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const ev of ACTIVITY) window.removeEventListener(ev, arm);
    };
  }, [enabled, s.privacyIdle, hidden]);

  return { hidden, setHidden };
}
