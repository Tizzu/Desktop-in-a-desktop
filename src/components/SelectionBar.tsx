import { useT } from '../core/i18n';

/** Avviso con i widget scelti (Ctrl+clic sulla barra del titolo, o «Select to move together» nel menu ⋯). */
export function SelectionBar({ count, onClear }: { count: number; onClear: () => void }) {
  const t = useT();
  return (
    <div className="selection-bar" role="toolbar" aria-label={t('Selected widgets')} onPointerDown={(e) => e.stopPropagation()}>
      <span>{t('{n} selected', { n: count })}</span>
      <small>{count > 1 ? t('Drag any of them by its title bar to move them together') : t('Ctrl+click another title bar to add it')}</small>
      <button className="icon-btn" aria-label={t('Clear selection')} title={t('Clear selection')} onClick={onClear}>✕</button>
    </div>
  );
}
