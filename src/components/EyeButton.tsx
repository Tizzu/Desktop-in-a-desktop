import { useT } from '../core/i18n';
import { shortcutLabel } from '../core/shortcut';

export const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Pulsante accanto alle impostazioni che nasconde la pagina (modalità privacy). */
export function EyeButton({ shortcut, onClick }: { shortcut: string; onClick: () => void }) {
  const t = useT();
  return (
    <button className="eye-btn" aria-label={t('Hide the page')} title={`${t('Hide the page')} (${shortcutLabel(shortcut)})`} onClick={onClick}>
      <EyeIcon />
    </button>
  );
}
