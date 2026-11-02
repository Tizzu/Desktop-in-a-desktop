import { useEffect, useRef } from 'react';
import { CHANGELOG } from '../changelog';
import { useT } from '../core/i18n';
import { appVersion } from '../core/version';

/** Novità delle versioni: si apre da sola dopo un aggiornamento, e dal numero di versione nelle impostazioni. */
export function Changelog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="changelog" role="dialog" aria-modal="true" aria-label={t('What\'s new')}>
      <div className="tour-shade dim" onClick={onClose} />
      <div className="changelog-card">
        <h2>{t('What\'s new')}</h2>
        <div className="changelog-body">
          {CHANGELOG.map((r) => (
            <section key={r.version}>
              <h3>v{r.version}{r.version === appVersion() && <em>{t('current')}</em>}</h3>
              <ul>{r.items.map((item) => <li key={item}>{t(item)}</li>)}</ul>
            </section>
          ))}
        </div>
        <div className="tour-actions">
          <span />
          <button ref={close} className="tour-btn primary" onClick={onClose}>{t('Close')}</button>
        </div>
      </div>
    </div>
  );
}
