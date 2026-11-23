import { useEffect, useRef, useState } from 'react';
import { useT } from '../core/i18n';
import { ItemList, useCommands, useItems } from './commands';

/** Palette dei comandi: cerca nei widget di tutti gli spazi, aggiunge tool, cambia spazio, annulla/ripeti. */
export function Palette({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => { input.current?.focus(); }, []);

  const items = useItems(query, onClose, useCommands());
  const current = Math.min(at, Math.max(0, items.length - 1));
  // `scrollIntoView` non ritorna nulla, ma un effetto non deve restituire altro che una funzione: le graffe lo garantiscono.
  useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' }); }, [current, items]);

  return (
    <div className="palette" role="dialog" aria-modal="true" aria-label={t('Command palette')}>
      <div className="tour-shade dim" onClick={onClose} />
      <div className="palette-card">
        <input
          ref={input}
          value={query}
          placeholder={t('Find a widget, add a tool, go to a space…')}
          aria-label={t('Command palette')}
          role="combobox"
          aria-expanded
          aria-controls="palette-list"
          aria-activedescendant={items[current] ? `pal-${items[current]!.key}` : undefined}
          onChange={(e) => { setQuery(e.target.value); setAt(0); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowDown') { e.preventDefault(); setAt((current + 1) % Math.max(1, items.length)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setAt((current - 1 + items.length) % Math.max(1, items.length)); }
            else if (e.key === 'Enter') { e.preventDefault(); items[current]?.run(); }
          }}
        />
        <ul id="palette-list" role="listbox" ref={list}>
          {items.length === 0 && <li className="palette-empty" role="presentation">{t('Nothing found')}</li>}
          <ItemList items={items} current={current} idPrefix="pal-" onHover={setAt} />
        </ul>
      </div>
    </div>
  );
}
