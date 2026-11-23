import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Dispatch, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../core/i18n';
import type { Action } from '../core/store';
import { listTemplates } from '../core/templates';
import { MAX_CUSTOM_TEMPLATES, type AppData } from '../core/types';
import { useConfirm } from './Confirm';

const POP_W = 292; // larghezza del riquadro (px), come nel CSS
const HIDE_DELAY = 250; // ms: il tempo di andare con il mouse dal ＋ al riquadro senza che sparisca

interface Props {
  data: AppData;
  dispatch: Dispatch<Action>;
  /** Crea uno spazio: vuoto, o dal modello `templateId`. */
  onNewSpace: (templateId?: string) => void;
  /** Salva lo spazio attivo come modello. */
  onSaveTemplate: (name: string, keepContent: boolean) => void;
  /** Nome dello spazio attivo (proposto come nome del modello) e se è vuoto (allora non si può salvare). */
  activeName: string;
  activeEmpty: boolean;
}

/**
 * Il pulsante ＋ per creare uno spazio: un clic ne crea uno vuoto; passandoci sopra compare un riquadro con «Blank» e
 * «From a template», che mostra i modelli (si possono togliere) e permette di salvare lo spazio attivo come modello.
 */
export function NewSpaceMenu({ data, dispatch, onNewSpace, onSaveTemplate, activeName, activeEmpty }: Props) {
  const t = useT();
  const ask = useConfirm();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'main' | 'list'>('main');
  const [saving, setSaving] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = () => { clearTimeout(timer.current); setOpen(true); };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setOpen(false); setView('main'); }, HIDE_DELAY);
  };
  const close = () => { clearTimeout(timer.current); setOpen(false); setView('main'); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => { if (open) setRect(button.current?.getBoundingClientRect() ?? null); }, [open, view]);

  const entries = listTemplates(data, t);
  const custom = data.templates?.length ?? 0;

  const remove = async (id: string, name: string, isCustom: boolean) => {
    // Un modello proprio, tolto, non torna; uno di serie si rimette dalle impostazioni.
    if (isCustom && !(await ask(t('Delete the template “{name}”? This cannot be undone.', { name }), { confirm: t('Delete'), danger: true }))) return;
    dispatch({ type: 'deleteTemplate', id });
  };
  const startSave = async () => {
    close();
    if (custom >= MAX_CUSTOM_TEMPLATES) return void (await ask(t('You already have {n} templates: delete one first.', { n: MAX_CUSTOM_TEMPLATES }), { notice: true }));
    setSaving(true);
  };

  return (
    <div
      className="tab-add-wrap"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={(e) => { if ((e.target as HTMLElement).matches(':focus-visible')) show(); }} // da tastiera sì, dopo un clic no
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hide(); }}
      onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); close(); button.current?.focus(); } }}
    >
      <button ref={button} className="tab-add" aria-label={t('New space')} aria-haspopup="menu" aria-expanded={open} onClick={() => { close(); onNewSpace(); }}>＋</button>
      {open && rect && (() => {
        const left = Math.max(8, Math.min(window.innerWidth - POP_W - 8, rect.left));
        return (
          <div className="newspace-pop" style={{ left, bottom: window.innerHeight - rect.top, '--arrow-x': `${rect.left + rect.width / 2 - left}px` } as CSSProperties}>
            <div className="newspace-card" role="menu" aria-label={view === 'main' ? t('New space') : t('From a template')}>
              {view === 'main' ? (
                <div className="np-tiles">
                  <button className="np-tile" role="menuitem" onClick={() => { close(); onNewSpace(); }}>
                    <PageIcon />
                    <span>{t('Blank')}</span>
                  </button>
                  <button className="np-tile" role="menuitem" aria-haspopup="menu" onClick={() => setView('list')}>
                    <PageIcon lines />
                    <span>{t('From a template')}</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="np-head">
                    <button className="icon-btn" aria-label={t('Back')} title={t('Back')} onClick={() => setView('main')}>‹</button>
                    <span>{t('From a template')}</span>
                  </div>
                  {entries.length === 0 && <p className="np-empty">{t('No templates. The default ones can be restored in Settings → Data.')}</p>}
                  <div className="np-grid">
                    {entries.map((e) => (
                      <div key={e.id} className="np-tile-wrap">
                        <button className="np-tile" role="menuitem" onClick={() => { close(); onNewSpace(e.id); }}>
                          <span className="np-ico" aria-hidden>{e.icon}</span>
                          <span className="np-name">{e.name}</span>
                          <small>{e.count === 1 ? t('1 widget') : t('{n} widgets', { n: e.count })}</small>
                        </button>
                        <button className="icon-btn np-del" aria-label={t('Delete template {name}', { name: e.name })} title={t('Delete template {name}', { name: e.name })} onClick={() => void remove(e.id, e.name, e.custom)}>✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <button className="np-save" role="menuitem" disabled={activeEmpty} title={activeEmpty ? t('This space is empty') : undefined} onClick={() => void startSave()}>＋ {t('Save this space as a template…')}</button>
            </div>
          </div>
        );
      })()}
      {saving && createPortal(<SaveTemplateDialog defaultName={activeName} onSave={(name, keep) => { setSaving(false); onSaveTemplate(name, keep); }} onClose={() => setSaving(false)} />, document.body)}
    </div>
  );
}

function SaveTemplateDialog({ defaultName, onSave, onClose }: { defaultName: string; onSave: (name: string, keepContent: boolean) => void; onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState(defaultName);
  const [keep, setKeep] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    input.current?.focus();
    input.current?.select();
    return () => { if (before?.isConnected) before.focus(); };
  }, []);
  // Esc chiude solo questa finestra.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSave(name.trim(), keep);
  };

  return (
    <div className="confirm">
      <div className="tour-shade dim" onClick={onClose} />
      <form className="confirm-card save-template" role="dialog" aria-modal="true" aria-label={t('Save as a template')} onSubmit={submit}>
        <label className="st-field">
          {t('Template name')}
          <input ref={input} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="set-check">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
          {t('Also keep what is written in the widgets')}
        </label>
        <small className="set-hint">{t('The widgets, their sizes and places (and what is stuck together) are saved. Without the box ticked, each new widget starts empty.')}</small>
        <div className="confirm-actions">
          <button type="button" className="confirm-no" onClick={onClose}>{t('Cancel')}</button>
          <button type="submit" className="confirm-yes" disabled={!name.trim()}>{t('Save')}</button>
        </div>
      </form>
    </div>
  );
}

/** Una pagina (vuota, o a righe come un modello), per le due carte del riquadro. */
function PageIcon({ lines = false }: { lines?: boolean }) {
  return (
    <svg viewBox="0 0 40 48" width="34" height="41" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="4" width="28" height="40" rx="4" />
      {lines && <path d="M13 15h14M13 23h14M13 31h9" />}
    </svg>
  );
}
