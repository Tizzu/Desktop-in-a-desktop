import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { normalizeUrl, placeItem } from './links';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface Link { id: string; title: string; url: string }
interface LinksState { links: Link[] }

function QuickLinks({ state, onChange }: WidgetProps<LinksState>) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [bad, setBad] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const listEl = useRef<HTMLUListElement>(null);

  // Posizione di caduta: tra gli altri link (senza quello trascinato), in base alla metà verticale di ciascuno.
  const indexAt = (y: number, id: string) =>
    [...(listEl.current?.querySelectorAll<HTMLElement>('li') ?? [])]
      .filter((li) => li.dataset.id !== id)
      .filter((li) => { const r = li.getBoundingClientRect(); return y > r.top + r.height / 2; }).length;

  // Durante il trascinamento una riga segna dove cadrà: sopra quella che le starà dopo, o sotto l'ultima.
  const rowClass = (id: string) => {
    if (!dragId || dropAt === null) return '';
    if (id === dragId) return 'dragging';
    const rest = state.links.filter((x) => x.id !== dragId);
    const r = rest.findIndex((x) => x.id === id);
    return r === dropAt ? 'drop-before' : r === rest.length - 1 && dropAt >= rest.length ? 'drop-after' : '';
  };

  const startDrag = (e: ReactPointerEvent<HTMLElement>, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation(); // niente trascinamento del widget
    let target = state.links.findIndex((l) => l.id === id);
    setDragId(id);
    setDropAt(target);
    const move = (ev: PointerEvent) => { target = indexAt(ev.clientY, id); setDropAt(target); };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setDragId(null);
      setDropAt(null);
      onChange({ links: placeItem(state.links, id, target) });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  const keyMove = (e: KeyboardEvent, id: string, i: number) => {
    const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    onChange({ links: placeItem(state.links, id, i + step) });
  };

  const add = () => {
    const href = normalizeUrl(url);
    if (!href) return setBad(true);
    onChange({ links: [...state.links, { id: crypto.randomUUID(), title: title.trim() || new URL(href).hostname.replace(/^www\./, ''), url: href }] });
    setTitle('');
    setUrl('');
    setBad(false);
  };

  return (
    <div className="links">
      <ul ref={listEl}>
        {state.links.map((l, i) => (
          <li key={l.id} data-id={l.id} className={rowClass(l.id)}>
            <span
              className="link-grip"
              role="button"
              tabIndex={0}
              aria-label={t('Reorder {city}', { city: l.title })}
              title={t('Drag to reorder')}
              onPointerDown={(e) => startDrag(e, l.id)}
              onKeyDown={(e) => keyMove(e, l.id, i)}
            >⋮⋮</span>
            <a href={l.url} target="_blank" rel="noopener noreferrer" title={l.url}>
              <span className="link-letter">{l.title.charAt(0).toUpperCase()}</span>
              {l.title}
            </a>
            <button className="icon-btn" aria-label={t('Remove {city}', { city: l.title })} onClick={() => onChange({ links: state.links.filter((x) => x.id !== l.id) })}>×</button>
          </li>
        ))}
      </ul>
      <div className="links-add">
        <input value={title} placeholder={t('Name (optional)')} onChange={(e) => setTitle(e.target.value)} />
        <input
          value={url}
          className={bad ? 'bad' : ''}
          placeholder={t('example.com')}
          onChange={(e) => { setUrl(e.target.value); setBad(false); }}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="chip" onClick={add}>{t('Add')}</button>
      </div>
    </div>
  );
}

registerWidget({
  type: 'links',
  label: 'Quick links',
  icon: '🔗',
  category: 'media',
  defaultSize: { w: 280, h: 280 },
  initialState: () => ({ links: [] }),
  Component: QuickLinks,
});
