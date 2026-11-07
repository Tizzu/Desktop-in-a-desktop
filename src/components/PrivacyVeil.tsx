import { useEffect, useRef } from 'react';
import { useT } from '../core/i18n';
import { shortcutLabel } from '../core/shortcut';
import type { Settings } from '../core/types';
import { EyeIcon } from './EyeButton';

interface Props {
  /** Dove sta l'avviso: al centro (con un grosso pulsante) o discreto in basso a destra (tasto e occhio). */
  notice: Settings['privacyNotice'];
  shortcut: string;
  onShow: () => void;
}

/** Velo trasparente e molto sfocato sopra tutta la pagina (modalità privacy). */
export function PrivacyVeil({ notice, shortcut, onShow }: Props) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  // Il focus passa al velo: i tasti non arrivano più ai widget nascosti.
  useEffect(() => { (root.current?.querySelector<HTMLElement>('button') ?? root.current)?.focus(); }, []);

  return (
    <div className={`privacy-veil ${notice}`} ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t('Privacy mode')}>
      {notice === 'center' ? (
        <div className="privacy-card">
          <div className="privacy-icon" aria-hidden>🔒</div>
          <p>{t('Privacy mode is on')}</p>
          <button className="privacy-show" onClick={onShow}>{t('Show my desk')}</button>
          <small>{t('or press {key}', { key: shortcutLabel(shortcut) })}</small>
        </div>
      ) : (
        <div className="privacy-corner">
          <kbd>{shortcutLabel(shortcut)}</kbd>
          <button className="eye-btn" aria-label={t('Show my desk')} title={t('Show my desk')} onClick={onShow}><EyeIcon /></button>
        </div>
      )}
    </div>
  );
}
