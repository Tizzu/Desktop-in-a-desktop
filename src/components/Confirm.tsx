import { createContext, useCallback, useContext, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useT } from '../core/i18n';

export interface AskOptions {
  /** Testo del pulsante che conferma (predefinito «OK»). */
  confirm?: string;
  /** Azione che toglie qualcosa: il focus parte su «Annulla», non sulla conferma. */
  danger?: boolean;
  /** Solo un avviso (un unico pulsante), al posto di una domanda. */
  notice?: boolean;
}

/** Chiede conferma all'utente con una finestra dell'app (mai quella del browser): risolve `true` se conferma, `false` se annulla. */
export type Ask = (message: string, options?: AskOptions) => Promise<boolean>;

// Senza il provider (es. un widget mostrato fuori dall'app) non si fa nulla: meglio non agire che agire senza chiedere.
const AskContext = createContext<Ask>(() => Promise.resolve(false));

export const useConfirm = () => useContext(AskContext);

interface Pending { message: string; options: AskOptions; resolve: (ok: boolean) => void }

/** Mostra le domande una alla volta; va dentro il fornitore della lingua. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Pending[]>([]);
  const ask = useCallback<Ask>((message, options = {}) => new Promise((resolve) => setQueue((q) => [...q, { message, options, resolve }])), []);
  const current = queue[0];
  const done = (ok: boolean) => {
    current?.resolve(ok);
    setQueue((q) => q.slice(1));
  };
  return (
    <AskContext.Provider value={ask}>
      {children}
      {current && <ConfirmDialog key={queue.length + current.message} {...current} onAnswer={done} />}
    </AskContext.Provider>
  );
}

function ConfirmDialog({ message, options, onAnswer }: Pending & { onAnswer: (ok: boolean) => void }) {
  const t = useT();
  const card = useRef<HTMLDivElement>(null);
  const yes = useRef<HTMLButtonElement>(null);
  const no = useRef<HTMLButtonElement>(null);

  // Il focus va sul pulsante giusto e, a finestra chiusa, torna dov'era.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    (options.danger && !options.notice ? no : yes).current?.focus();
    return () => { if (before?.isConnected) before.focus(); };
  }, [options.danger, options.notice]);

  // Esc annulla senza che altri (le impostazioni, la palette…) lo usino per chiudersi.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onAnswer(!!options.notice);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onAnswer, options.notice]);

  // Il focus resta tra i pulsanti della finestra.
  const trap = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const buttons = [...(card.current?.querySelectorAll<HTMLElement>('button') ?? [])];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  };

  return (
    <div className="confirm">
      <div className="tour-shade dim" onClick={() => onAnswer(!!options.notice)} />
      <div className="confirm-card" ref={card} role="alertdialog" aria-modal="true" aria-describedby="confirm-message" onKeyDown={trap}>
        <p id="confirm-message">{message}</p>
        <div className="confirm-actions">
          {!options.notice && <button ref={no} className="confirm-no" onClick={() => onAnswer(false)}>{t('Cancel')}</button>}
          <button ref={yes} className={`confirm-yes${options.danger ? ' danger' : ''}`} onClick={() => onAnswer(true)}>{options.confirm ?? t('OK')}</button>
        </div>
      </div>
    </div>
  );
}
