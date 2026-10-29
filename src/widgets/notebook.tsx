import { parseBlocks, parseInline, toggleTask } from './markdown';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface NotebookState { text: string; preview: boolean }

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((p, i) =>
        p.kind === 'bold' ? <strong key={i}>{p.text}</strong>
        : p.kind === 'italic' ? <em key={i}>{p.text}</em>
        : p.kind === 'code' ? <code key={i}>{p.text}</code>
        : <span key={i}>{p.text}</span>,
      )}
    </>
  );
}

function Notebook({ state, onChange }: WidgetProps<NotebookState>) {
  const t = useT();
  return (
    <div className="notebook">
      <div className="notebook-bar">
        <button className={`chip${!state.preview ? ' on' : ''}`} onClick={() => onChange({ ...state, preview: false })}>{t('Write')}</button>
        <button className={`chip${state.preview ? ' on' : ''}`} onClick={() => onChange({ ...state, preview: true })}>{t('Read')}</button>
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
          className="notebook-text"
          value={state.text}
          placeholder={t('# Title\n- [ ] to do\n**bold**, *italic*')}
          onChange={(e) => onChange({ ...state, text: e.target.value })}
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
