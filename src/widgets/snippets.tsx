import { useState } from 'react';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface Snippet { id: string; title: string; text: string }
interface SnippetsState { items: Snippet[] }

/** Copia negli appunti; se il browser non lo consente a questa pagina, ripiega sul vecchio metodo con un campo temporaneo. */
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

function Snippets({ state, onChange }: WidgetProps<SnippetsState>) {
  const t = useT();
  const [draft, setDraft] = useState({ title: '', text: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const save = () => {
    const text = draft.text.trim();
    if (!text) return;
    const title = draft.title.trim();
    onChange({
      items: editing
        ? state.items.map((i) => (i.id === editing ? { ...i, title, text } : i))
        : [...state.items, { id: crypto.randomUUID(), title, text }],
    });
    setDraft({ title: '', text: '' });
    setEditing(null);
  };
  const edit = (i: Snippet) => { setEditing(i.id); setDraft({ title: i.title, text: i.text }); };
  const cancel = () => { setEditing(null); setDraft({ title: '', text: '' }); };
  const flash = async (i: Snippet) => {
    if (await copy(i.text)) {
      setCopied(i.id);
      setTimeout(() => setCopied((c) => (c === i.id ? null : c)), 1200);
    }
  };

  return (
    <div className="snippets">
      {state.items.length === 0 ? (
        <p className="snip-empty">{t('Keep the text you paste often here, and copy it with one click.')}</p>
      ) : (
        <ul className="snip-list">
          {state.items.map((i) => (
            <li key={i.id} className={editing === i.id ? 'editing' : ''}>
              <button className="snip" title={t('Click to copy')} onClick={() => void flash(i)}>
                {i.title && <b>{i.title}</b>}
                <span>{i.text}</span>
                {copied === i.id && <em className="snip-copied" role="status">{t('Copied!')}</em>}
              </button>
              <button className="icon-btn" aria-label={t('Edit')} onClick={() => edit(i)}>✎</button>
              <button className="icon-btn" aria-label={t('Delete')} onClick={() => { onChange({ items: state.items.filter((x) => x.id !== i.id) }); if (editing === i.id) cancel(); }}>×</button>
            </li>
          ))}
        </ul>
      )}
      <form className="snip-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <input value={draft.title} placeholder={t('Title (optional)')} aria-label={t('Title')} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <textarea value={draft.text} placeholder={t('Text to copy…')} aria-label={t('Text')} rows={2} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
        <div className="snip-actions">
          <button className="btn primary" type="submit" disabled={!draft.text.trim()}>{editing ? t('Save') : t('Add')}</button>
          {editing && <button className="btn" type="button" onClick={cancel}>{t('Cancel')}</button>}
        </div>
      </form>
    </div>
  );
}

registerWidget({
  type: 'snippets',
  label: 'Snippets',
  icon: '📋',
  category: 'notes',
  defaultSize: { w: 290, h: 360 },
  initialState: () => ({ items: [] }),
  Component: Snippets,
});
