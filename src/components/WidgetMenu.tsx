import { useEffect, useRef, type Dispatch } from 'react';
import type { Action } from '../core/store';
import { TINT_IDS, type WidgetInstance } from '../core/types';
import { useT } from '../core/i18n';

const MENU_W = 210;

export const TINT_LABELS: Record<(typeof TINT_IDS)[number], string> = {
  red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', pink: 'Pink',
};

interface Props {
  widget: WidgetInstance;
  anchor: DOMRect;
  /** Gli altri spazi, dove si può mandare il widget. */
  spaces: { id: string; name: string }[];
  /** Spazio bloccato: non si aggiungono widget. */
  locked: boolean;
  selected: boolean;
  dispatch: Dispatch<Action>;
  onSelect: () => void;
  onClose: () => void;
}

/** Menu di un widget: duplica, tinta, sposta in un altro spazio, scegli per spostare in blocco. */
export function WidgetMenu({ widget, anchor, spaces, locked, selected, dispatch, onSelect, onClose }: Props) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!box.current?.contains(target) && !target.closest('.widget-menu-btn')) onClose();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true); };
  }, [onClose]);

  const done = (a: Action) => { dispatch(a); onClose(); };
  const style = {
    left: Math.max(8, Math.min(window.innerWidth - MENU_W - 8, anchor.right - MENU_W)),
    top: Math.min(window.innerHeight - 8, anchor.bottom + 6),
    width: MENU_W,
  };
  const movable = !locked && !widget.parent && spaces.length > 0;

  return (
    <div className="widget-menu" ref={box} style={style} role="menu" aria-label={t('Widget options')}>
      <button role="menuitem" disabled={locked} onClick={() => done({ type: 'duplicateWidget', id: widget.id })}>⧉ {t('Duplicate')}</button>
      <button role="menuitem" onClick={() => { onSelect(); onClose(); }}>{selected ? '☑' : '☐'} {t(selected ? 'Selected to move together' : 'Select to move together')}</button>
      <div className="wm-tints" role="radiogroup" aria-label={t('Colour')}>
        <button
          role="radio"
          aria-checked={!widget.tint}
          aria-label={t('No colour')}
          title={t('No colour')}
          className={`wm-tint none${!widget.tint ? ' on' : ''}`}
          onClick={() => done({ type: 'updateWidget', id: widget.id, patch: { tint: undefined } })}
        />
        {TINT_IDS.map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={widget.tint === id}
            aria-label={t(TINT_LABELS[id])}
            title={t(TINT_LABELS[id])}
            data-tint={id}
            className={`wm-tint${widget.tint === id ? ' on' : ''}`}
            onClick={() => done({ type: 'updateWidget', id: widget.id, patch: { tint: id } })}
          />
        ))}
      </div>
      {movable && (
        <div className="wm-move" role="group" aria-label={t('Move to space')}>
          <span>{t('Move to space')}</span>
          {spaces.map((s) => (
            <button key={s.id} role="menuitem" onClick={() => done({ type: 'moveWidgetToSpace', id: widget.id, to: s.id })}>→ {s.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}
