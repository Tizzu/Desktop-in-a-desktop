import { useEffect, useRef, useState } from 'react';
import { CHANGELOG, type Release } from '../changelog';
import { useT } from '../core/i18n';
import { appVersion, compareVersions } from '../core/version';

/**
 * Novità delle versioni: si apre da sola dopo un aggiornamento, e dal pulsante nelle impostazioni. Si vedono le versioni
 * uscite dopo l'ultima già vista (almeno l'ultima); le più vecchie stanno dietro un pulsante.
 */
export function Changelog({ since, onClose }: { since: string; onClose: () => void }) {
  const t = useT();
  const close = useRef<HTMLButtonElement>(null);
  const [older, setOlder] = useState(false);
  useEffect(() => close.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fresh = CHANGELOG.filter((r) => compareVersions(r.version, since) > 0);
  const shown = fresh.length ? fresh : CHANGELOG.slice(0, 1);
  const hidden = CHANGELOG.filter((r) => !shown.includes(r));

  const block = (r: Release) => (
    <section key={r.version}>
      <h3>v{r.version}{r.version === appVersion() && <em>{t('current')}</em>}</h3>
      <ul>{r.items.map((item) => <li key={item}>{t(item)}</li>)}</ul>
    </section>
  );

  return (
    <div className="changelog" role="dialog" aria-modal="true" aria-label={t('What\'s new')}>
      <div className="tour-shade dim" onClick={onClose} />
      <div className="changelog-card">
        <h2>{t('What\'s new')}</h2>
        <div className="changelog-body">
          {shown.map(block)}
          {hidden.length > 0 && (
            <>
              <button className="older-toggle" aria-expanded={older} onClick={() => setOlder(!older)}>
                {older ? t('Hide older versions') : t('Show older versions')}
              </button>
              {older && hidden.map(block)}
            </>
          )}
        </div>
        <div className="tour-actions">
          <span />
          <button ref={close} className="tour-btn primary" onClick={onClose}>{t('Close')}</button>
        </div>
      </div>
    </div>
  );
}
