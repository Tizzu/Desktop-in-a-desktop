import { useLayoutEffect, useRef } from 'react';
import { parseBlocks, parseInline, setLinePrefix, toggleTask, wrapSelection, type Edit, type LineKind } from './markdown';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface NotebookState { text: string; preview: boolean }

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((p, i) =>
        p.kind === 'bold' ? <strong key={i}>{p.text}</strong>
        : p.kind === 'italic' ? <em key={i}>{p.text}</em>
        : p.kind === 'strike' ? <s key={i}>{p.text}</s>
        : p.kind === 'code' ? <code key={i}>{p.text}</code>
        : <span key={i}>{p.text}</span>,
      )}
    </>
  );
}

function Notebook({ state, onChange }: WidgetProps<NotebookState>) {
  const t = useT();
  const area = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<Edit | null>(null); // selezione da ripristinare dopo la modifica

  // Dopo ogni modifica dalla barra il testo cambia: la selezione si rimette sul testo nuovo.
  useLayoutEffect(() => {
    const e = pending.current, el = area.current;
    if (!e || !el) return;
    pending.current = null;
    el.focus();
    el.setSelectionRange(e.start, e.end);
  }, [state.text]);

  const run = (make: (text: string, s: number, e: number) => Edit) => {
    const el = area.current;
    if (!el) return;
    const edit = make(state.text, el.selectionStart, el.selectionEnd);
    pending.current = edit;
    onChange({ ...state, text: edit.text });
  };
  const wrap = (marker: string) => run((tx, s, e) => wrapSelection(tx, s, e, marker));
  const line = (kind: LineKind) => run((tx, s, e) => setLinePrefix(tx, s, e, kind));
  const tools: { label: string; face: React.ReactNode; act: () => void }[] = [
    { label: t('Bold'), face: <b>B</b>, act: () => wrap('**') },
    { label: t('Italic'), face: <i>I</i>, act: () => wrap('*') },
    { label: t('Strikethrough'), face: <s>S</s>, act: () => wrap('~~') },
    { label: t('Code'), face: <code>{'</>'}</code>, act: () => wrap('`') },
    { label: t('Heading'), face: 'H', act: () => line('heading') },
    { label: t('Bullet list'), face: '•', act: () => line('bullet') },
    { label: t('Checklist'), face: '☑', act: () => line('task') },
  ];

  return (
    <div className="notebook">
      <div className="notebook-bar">
        <button className={`chip${!state.preview ? ' on' : ''}`} onClick={() => onChange({ ...state, preview: false })}>{t('Write')}</button>
        <button className={`chip${state.preview ? ' on' : ''}`} onClick={() => onChange({ ...state, preview: true })}>{t('Read')}</button>
        {!state.preview && (
          <div className="fmt" role="toolbar" aria-label={t('Formatting')}>
            {tools.map((b) => (
              // mousedown non deve togliere il focus (e la selezione) al testo
              <button key={b.label} className="fmt-btn" aria-label={b.label} title={b.label} onMouseDown={(e) => e.preventDefault()} onClick={b.act}>{b.face}</button>
            ))}
          </div>
        )}
      </div>
      {state.preview ? (
        <div className="md">
          {state.text.trim() === '' && <p className="md-empty">{t('Nothing here yet. Switch to “Write”.')}</p>}
          {parseBlocks(state.text).map((b) => {
            if (b.kind === 'blank') return <div key={b.line} className="md-gap" />;
            if (b.kind === 'heading') {
              const H = (`h${b.level}`) as 'h1' | 'h2' | 'h3';
              return <H key={b.line}><Inline text={b.text} /></H>;
            }
            if (b.kind === 'item') {
              return (
                <div key={b.line} className="md-item">
                  {b.checked === undefined ? <span>•</span> : (
                    <input type="checkbox" checked={b.checked} onChange={() => onChange({ ...state, text: toggleTask(state.text, b.line) })} />
                  )}
                  <span className={b.checked ? 'md-done' : ''}><Inline text={b.text} /></span>
                </div>
              );
            }
            return <p key={b.line}><Inline text={b.text} /></p>;
          })}
        </div>
      ) : (
        <textarea
          ref={area}
          className="notebook-text"
          value={state.text}
          placeholder={t('# Title\n- [ ] to do\n**bold**, *italic*')}
          onChange={(e) => onChange({ ...state, text: e.target.value })}
          onKeyDown={(e) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
            const k = e.key.toLowerCase();
            if (k === 'b' || k === 'i') { e.preventDefault(); wrap(k === 'b' ? '**' : '*'); }
          }}
        />
      )}
    </div>
  );
}

registerWidget({
  type: 'notebook',
  label: 'Notebook',
  icon: '📓',
  category: 'notes',
  defaultSize: { w: 340, h: 400 },
  initialState: () => ({ text: '', preview: false }),
  Component: Notebook,
});
