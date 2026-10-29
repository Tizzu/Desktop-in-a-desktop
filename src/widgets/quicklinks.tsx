import { useState } from 'react';
import { normalizeUrl } from './links';
import { registerWidget, type WidgetProps } from './registry';

interface Link { id: string; title: string; url: string }
interface LinksState { links: Link[] }

function QuickLinks({ state, onChange }: WidgetProps<LinksState>) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [bad, setBad] = useState(false);

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
      <ul>
        {state.links.map((l) => (
          <li key={l.id}>
            <a href={l.url} target="_blank" rel="noopener noreferrer" title={l.url}>
              <span className="link-letter">{l.title.charAt(0).toUpperCase()}</span>
              {l.title}
            </a>
            <button className="icon-btn" aria-label={`Rimuovi ${l.title}`} onClick={() => onChange({ links: state.links.filter((x) => x.id !== l.id) })}>×</button>
          </li>
        ))}
      </ul>
      <div className="links-add">
        <input value={title} placeholder="Nome (facoltativo)" onChange={(e) => setTitle(e.target.value)} />
        <input
          value={url}
          className={bad ? 'bad' : ''}
          placeholder="indirizzo.it"
          onChange={(e) => { setUrl(e.target.value); setBad(false); }}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="chip" onClick={add}>Aggiungi</button>
      </div>
    </div>
  );
}

registerWidget({
  type: 'links',
  label: 'Link rapidi',
  icon: '🔗',
  category: 'media',
  defaultSize: { w: 260, h: 280 },
  initialState: () => ({ links: [] }),
  Component: QuickLinks,
});
