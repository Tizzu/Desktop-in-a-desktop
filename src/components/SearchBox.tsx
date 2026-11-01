import { useEffect, useRef, useState } from 'react';
import { runSearch } from '../core/search';
import { useT } from '../core/i18n';
import { DEFAULT_SHORTCUT, matchesShortcut, shortcutLabel } from '../core/shortcut';

interface Props {
  /** Barra fissa: i tasti "\" e "/" portano il focus qui. */
  hotkey?: boolean;
  /** Scorciatoia che porta il focus qui (vedi shortcut.ts). */
  shortcut?: string;
  /** Barra fissa coperta da dei widget: mostra l'invito a spostarli o a usare il tasto. */
  covered?: boolean;
  /** Notifica quando il campo prende o perde il focus. */
  onActiveChange?: (active: boolean) => void;
}

/** Campo di ricerca condiviso dal widget e dalla barra fissa. */
export function SearchBox({ hotkey = false, shortcut = DEFAULT_SHORTCUT, covered = false, onActiveChange }: Props) {
  const t = useT();
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if (!matchesShortcut(shortcut, e)) return;
      // Un tasto semplice si scrive: non vale mentre si digita in un campo. Con Ctrl/Alt/Cmd vale sempre.
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]');
      if (typing && !(e.ctrlKey || e.altKey || e.metaKey)) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hotkey, shortcut]);

  return (
    <form
      className="searchbox"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        runSearch(text);
      }}
    >
      <span aria-hidden>🔍</span>
      <input
        ref={input}
        type="search"
        value={text}
        placeholder={covered ? t('Move the widgets or press {key} to search', { key: shortcutLabel(shortcut) }) : hotkey ? t('Search the web…  ( {key} )', { key: shortcutLabel(shortcut) }) : t('Search the web…')}
        aria-label={t('Search')}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => onActiveChange?.(true)}
        onBlur={() => onActiveChange?.(false)}
        // Ctrl/Cmd+Invio apre in una nuova scheda; Esc esce dal campo.
        onKeyDown={(e) => {
          if (e.key === 'Escape') input.current?.blur();
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            runSearch(text, true);
          }
        }}
      />
    </form>
  );
}
