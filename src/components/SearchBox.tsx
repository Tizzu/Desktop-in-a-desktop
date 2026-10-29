import { useEffect, useRef, useState } from 'react';
import { runSearch } from '../core/search';

interface Props {
  /** Barra fissa: i tasti "\" e "/" portano il focus qui. */
  hotkey?: boolean;
  /** Barra fissa coperta da dei widget: mostra l'invito a spostarli o a usare il tasto. */
  covered?: boolean;
  /** Notifica quando il campo prende o perde il focus. */
  onActiveChange?: (active: boolean) => void;
}

/** Campo di ricerca condiviso dal widget e dalla barra fissa. */
export function SearchBox({ hotkey = false, covered = false, onActiveChange }: Props) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if ((e.key !== '\\' && e.key !== '/') || t?.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hotkey]);

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
        placeholder={covered ? 'Sposta i widget o premi \\ per cercare' : hotkey ? 'Cerca sul web…  ( \\ )' : 'Cerca sul web…'}
        aria-label="Cerca"
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
