import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { runSearch } from '../core/search';
import { useT } from '../core/i18n';
import { DEFAULT_SHORTCUT, matchesShortcut, shortcutLabel } from '../core/shortcut';
import { ItemList, useCommands, useItems } from './commands';

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

const MENU_MAX = 340;

/**
 * Campo di ricerca condiviso dal widget e dalla barra fissa. Scrivendo, oltre alla ricerca sul web (la prima voce, quella
 * che parte con Invio) propone le stesse voci della palette dei comandi: widget trovati, spazi, comandi, tool da aggiungere.
 * Con le frecce si sceglie una voce; Invio senza averla scelta cerca sul web, come sempre.
 */
export function SearchBox({ hotkey = false, shortcut = DEFAULT_SHORTCUT, covered = false, onActiveChange }: Props) {
  const t = useT();
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const cmds = useCommands();
  const [focused, setFocused] = useState(false);
  const [at, setAt] = useState(0); // riga evidenziata: con testo la 0 è «cerca sul web»
  const [openEmpty, setOpenEmpty] = useState(false); // a campo vuoto il menu si apre solo con la freccia in giù
  const [rect, setRect] = useState<DOMRect | null>(null);

  const trimmed = text.trim();
  const finish = useCallback(() => { setText(''); setOpenEmpty(false); input.current?.blur(); }, []);
  const items = useItems(trimmed, finish, cmds);
  const offset = trimmed ? 1 : 0; // la riga «cerca sul web» è davanti alle voci
  const rows = items.length + offset;
  const visible = !!cmds && focused && rows > 0 && (trimmed !== '' || openEmpty);
  const current = Math.min(at, Math.max(0, rows - 1));

  useLayoutEffect(() => { if (visible) setRect(form.current?.getBoundingClientRect() ?? null); }, [visible, text, rows]);
  useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' }); }, [current, visible, rows]);

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
      ref={form}
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
        role={cmds ? 'combobox' : undefined}
        aria-expanded={cmds ? visible : undefined}
        aria-autocomplete={cmds ? 'list' : undefined}
        aria-controls={cmds ? 'search-results' : undefined}
        aria-activedescendant={visible ? (current < offset ? 'sr-web' : `sr-${items[current - offset]?.key}`) : undefined}
        onChange={(e) => { setText(e.target.value); setAt(0); setOpenEmpty(false); }}
        onFocus={() => { setFocused(true); onActiveChange?.(true); }}
        onBlur={() => { setFocused(false); setOpenEmpty(false); onActiveChange?.(false); }}
        // Ctrl/Cmd+Invio apre in una nuova scheda; Esc esce dal campo; le frecce scorrono le voci, Invio esegue quella scelta.
        onKeyDown={(e) => {
          if (e.key === 'Escape') input.current?.blur();
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            runSearch(text, true);
          } else if (e.key === 'Enter' && visible && current >= offset) {
            e.preventDefault();
            items[current - offset]?.run();
          } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && cmds) {
            e.preventDefault();
            if (!trimmed && !openEmpty) { setOpenEmpty(true); setAt(0); return; }
            if (rows > 0) setAt((current + (e.key === 'ArrowDown' ? 1 : -1) + rows) % rows);
          }
        }}
      />
      {visible && rect && createPortal(
        // Sta nel body: dentro un widget (che può essere inclinato e ritaglia ciò che esce) il menu verrebbe tagliato.
        <ul
          id="search-results"
          ref={list}
          className="search-results"
          role="listbox"
          style={menuStyle(rect)}
          onMouseDown={(e) => e.preventDefault()} // il campo non perde il focus cliccando una voce
        >
          {trimmed && (
            <li role="presentation">
              <div id="sr-web" role="option" aria-selected={current === 0} className={`palette-item${current === 0 ? ' on' : ''}`} onMouseMove={() => setAt(0)} onClick={() => runSearch(text)}>
                <span aria-hidden>🔍</span>
                <span className="palette-text">{t('Search the web for “{text}”', { text: trimmed })}</span>
              </div>
            </li>
          )}
          <ItemList items={items} current={current - offset} idPrefix="sr-" onHover={(i) => setAt(i + offset)} />
        </ul>,
        document.body,
      )}
    </form>
  );
}

/** Il menu sotto il campo; se sotto non c'è posto (un widget in basso), sopra. */
function menuStyle(r: DOMRect): CSSProperties {
  const below = window.innerHeight - r.bottom - 14, above = r.top - 14;
  const up = below < 200 && above > below;
  const width = Math.max(r.width, 280);
  return {
    left: Math.max(8, Math.min(window.innerWidth - width - 8, r.left)),
    width,
    maxHeight: Math.min(MENU_MAX, up ? above : below),
    ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
  };
}
