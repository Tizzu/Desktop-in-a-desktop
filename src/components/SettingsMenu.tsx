import { useEffect, useRef, useState, type Dispatch, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { LANGUAGES, isLang, useT } from '../core/i18n';
import type { Action } from '../core/store';
import { THEMES } from '../core/themes';
import { DEFAULT_PRIVACY_KEY, DEFAULT_SHORTCUT } from '../core/shortcut';
import { appVersion } from '../core/version';
import { exportFileName, exportJson, exportText, parseImport, parseImportText } from '../core/backup';
import { PRIVACY_IDLE_MINUTES, type AppData, type Settings } from '../core/types';
import { ShortcutPicker } from './ShortcutPicker';

const REPO = 'https://github.com/Tizzu/Desktop-in-a-desktop';

type Cat = 'appearance' | 'desk' | 'privacy' | 'sounds' | 'data' | 'language' | 'about';

const CATS: { id: Cat; label: string; icon: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'desk', label: 'Desk', icon: '🪑' },
  { id: 'privacy', label: 'Privacy', icon: '🔒' },
  { id: 'sounds', label: 'Sounds', icon: '🔔' },
  { id: 'data', label: 'Data', icon: '💾' },
  { id: 'language', label: 'Language', icon: '🌐' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
];

interface Props {
  data: AppData;
  dispatch: Dispatch<Action>;
  onTour: () => void;
  onChangelog: () => void;
  /** Nasconde la pagina (modalità privacy). */
  onHide: () => void;
}

interface SectionProps { settings: Settings; set: (patch: Partial<Settings>) => void }

const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="set-check">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    {label}
  </label>
);

function Appearance({ settings, set }: SectionProps) {
  const t = useT();
  return (
    <>
      <p className="set-hint">{t('Choose how the desk looks: the colours, how the drawers are shown and how much the widgets lean.')}</p>
      <div className="theme-row" role="radiogroup" aria-label={t('Colours')}>
        <span>{t('Colours')}</span>
        {THEMES.map((th) => (
          <button
            key={th.id}
            role="radio"
            aria-checked={settings.theme === th.id}
            aria-label={t(th.label)}
            title={t(th.label)}
            className={`theme-dot${settings.theme === th.id ? ' on' : ''}`}
            style={{ background: th.swatch }}
            onClick={() => set({ theme: th.id })}
          />
        ))}
      </div>
      <label className="set-row">
        {t('Drawer style')}
        <select value={settings.drawerStyle} onChange={(e) => set({ drawerStyle: e.target.value as Settings['drawerStyle'] })}>
          <option value="tucked">{t('Standing, tucked in')}</option>
          <option value="slanted">{t('Slanted')}</option>
        </select>
      </label>
      <Check label={t('Drawers by category')} checked={settings.categories} onChange={(categories) => set({ categories })} />
      <div className="set-row">
        <span>{t('Tilt')}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          aria-label={t('Tilt')}
          value={Math.round(settings.tilt * 100)}
          onChange={(e) => set({ tilt: Number(e.target.value) / 100 })}
        />
        <output className="set-value">{Math.round(settings.tilt * 100)}%</output>
      </div>
      <p className="set-hint">{t('How much widgets lean, up to the angles they were given. Each space can set its own with the ⚙ next to its name; each widget can be tilted by hand with the small tab at its bottom-left corner.')}</p>
    </>
  );
}

function Desk({ settings, set }: SectionProps) {
  const t = useT();
  return (
    <>
      <p className="set-hint">{t('How the widgets behave on the desk, and the search bar in the middle of the page.')}</p>
      <Check label={t('Throw with momentum')} checked={settings.physics} onChange={(physics) => set({ physics })} />
      <Check label={t('Search bar in the centre')} checked={settings.searchBar} onChange={(searchBar) => set({ searchBar })} />
      <ShortcutPicker
        label={t('Search shortcut')}
        value={settings.searchKey}
        fallback={DEFAULT_SHORTCUT}
        taken={[settings.privacyKey]}
        onChange={(searchKey) => set({ searchKey })}
      />
      <p className="set-hint">{t('The search bar can also be shown or hidden for a single space, with the ⚙ next to its name.')}</p>
    </>
  );
}

function Privacy({ settings, set, onHide }: SectionProps & { onHide: () => void }) {
  const t = useT();
  return (
    <>
      <p className="set-hint">{t('Privacy mode blurs the whole page with one key. It guards against glances, not against someone at your keyboard: anyone can show it again.')}</p>
      <ShortcutPicker
        label={t('Privacy mode shortcut')}
        value={settings.privacyKey}
        fallback={DEFAULT_PRIVACY_KEY}
        taken={[settings.searchKey]}
        onChange={(privacyKey) => set({ privacyKey })}
      />
      <label className="set-row">
        {t('While hidden')}
        <select value={settings.privacyNotice} onChange={(e) => set({ privacyNotice: e.target.value as Settings['privacyNotice'] })}>
          <option value="center">{t('Notice in the centre')}</option>
          <option value="corner">{t('Discreet notice at the bottom right')}</option>
        </select>
      </label>
      <Check label={t('Hide when I leave the tab')} checked={settings.privacyOnLeave} onChange={(privacyOnLeave) => set({ privacyOnLeave })} />
      <label className="set-row">
        {t('Hide after inactivity')}
        <select value={settings.privacyIdle} onChange={(e) => set({ privacyIdle: Number(e.target.value) })}>
          {PRIVACY_IDLE_MINUTES.map((n) => <option key={n} value={n}>{n === 0 ? t('Never') : t('{n} min', { n })}</option>)}
        </select>
      </label>
      <button className="set-btn" onClick={onHide}>{t('Hide now')}</button>
    </>
  );
}

function Data({ data, dispatch }: { data: AppData; dispatch: Dispatch<Action> }) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null); // area di testo aperta (per incollare, o per copiare a mano)
  const [note, setNote] = useState('');

  const exportData = () => {
    const url = URL.createObjectURL(new Blob([exportJson(data)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: exportFileName() });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const apply = (imported: AppData | undefined) => {
    if (!imported) return void alert(t('That is not a valid backup.'));
    if (!confirm(t('Replace everything with this backup? The current data will be lost: export it first if you need it.'))) return false;
    dispatch({ type: 'import', data: imported });
    return true;
  };
  const importData = async (file: File | undefined) => {
    if (file) apply(parseImport(await file.text()));
  };
  const copyText = async () => {
    const out = await exportText(data);
    try {
      await navigator.clipboard.writeText(out);
      setText(null);
      setNote(t('Copied ({kb} KB). Paste it anywhere to share it.', { kb: Math.max(1, Math.round(out.length / 1024)) }));
    } catch {
      setText(out); // appunti non disponibili: il testo resta qui da copiare a mano
      setNote('');
    }
  };
  const importText = async () => {
    if (apply(await parseImportText(text ?? ''))) setText(null);
  };

  return (
    <>
      <p className="set-hint">{t('Back up your whole desk, or move it to another computer or browser.')}</p>
      <div className="backup-row">
        <button onClick={exportData}>{t('Export to file')}</button>
        <button onClick={() => fileRef.current?.click()}>{t('Import from file')}</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label={t('Backup file')}
          onChange={(e) => { void importData(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>
      <div className="backup-row">
        <button onClick={() => void copyText()}>{t('Copy as text')}</button>
        <button onClick={() => { setText(text === null ? '' : null); setNote(''); }}>{t('Paste from text')}</button>
      </div>
      {note && <span className="backup-note" role="status">{note}</span>}
      {text !== null && (
        <>
          <textarea className="backup-text" aria-label={t('Backup text')} placeholder={t('Paste the backup text here')} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="backup-go" onClick={() => void importText()}>{t('Import')}</button>
        </>
      )}
    </>
  );
}

export function SettingsMenu({ data, dispatch, onTour, onChangelog, onHide }: Props) {
  const t = useT();
  const settings = data.settings;
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<Cat>('appearance');
  const card = useRef<HTMLDivElement>(null);
  const gear = useRef<HTMLButtonElement>(null);
  const set = (patch: Partial<Settings>) => dispatch({ type: 'setSettings', patch });
  const close = () => { setOpen(false); gear.current?.focus(); };

  useEffect(() => {
    if (open) card.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Il pannello è un dialogo: il Tab resta al suo interno.
  const trap = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const items = [...(card.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex="0"]') ?? [])].filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0]!, last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  // Frecce sulla lista delle categorie.
  const navKey = (e: ReactKeyboardEvent, i: number) => {
    const to = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const next = CATS[(to + CATS.length) % CATS.length]!;
    setCat(next.id);
    requestAnimationFrame(() => card.current?.querySelector<HTMLElement>(`#set-tab-${next.id}`)?.focus());
  };

  return (
    <div className="settings">
      <button ref={gear} className="settings-btn" aria-label={t('Settings')} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>⚙</button>
      {open && (
        <div className="settings-overlay" role="dialog" aria-modal="true" aria-label={t('Settings')} onKeyDown={trap}>
          <div className="tour-shade dim" onClick={close} />
          <div className="settings-card" ref={card}>
            <button className="settings-close icon-btn" aria-label={t('Close')} onClick={close}>×</button>
            <div className="settings-nav" role="tablist" aria-orientation="vertical" aria-label={t('Settings')}>
              {CATS.map((c, i) => (
                <button
                  key={c.id}
                  id={`set-tab-${c.id}`}
                  role="tab"
                  aria-selected={cat === c.id}
                  aria-controls="set-panel"
                  tabIndex={cat === c.id ? 0 : -1}
                  className={`set-tab${cat === c.id ? ' on' : ''}`}
                  onClick={() => setCat(c.id)}
                  onKeyDown={(e) => navKey(e, i)}
                >
                  <span aria-hidden>{c.icon}</span>{t(c.label)}
                </button>
              ))}
            </div>
            <div className={`settings-content${cat === 'about' ? ' centered' : ''}`} id="set-panel" role="tabpanel" aria-labelledby={`set-tab-${cat}`}>
              {cat === 'appearance' && <Appearance settings={settings} set={set} />}
              {cat === 'desk' && <Desk settings={settings} set={set} />}
              {cat === 'privacy' && <Privacy settings={settings} set={set} onHide={() => { close(); onHide(); }} />}
              {cat === 'sounds' && (
                <>
                  <p className="set-hint">{t('The sounds of the app. For now, a calm bell when a timer ends.')}</p>
                  <Check label={t('Timer sounds')} checked={settings.timerSound} onChange={(timerSound) => set({ timerSound })} />
                </>
              )}
              {cat === 'data' && <Data data={data} dispatch={dispatch} />}
              {cat === 'language' && (
                <>
                  <p className="set-hint">{t('Choose the language of the interface.')}</p>
                  <label className="set-row">
                    {t('Language')}
                    <select value={settings.language} onChange={(e) => isLang(e.target.value) && set({ language: e.target.value })}>
                      {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                    </select>
                  </label>
                </>
              )}
              {cat === 'about' && (
                <footer className="credits about">
                  <strong className="about-name">Desktop in a Desktop</strong>
                  {appVersion() && <span className="about-version">v{appVersion()}</span>}
                  <span>{t('Made by {name}', { name: 'Valentino Artizzu' })}</span>
                  <span>{t('Free software, MIT licence · everything stays on your computer')}</span>
                  <a href={REPO} target="_blank" rel="noopener noreferrer">{t('Source code and feedback')}</a>
                  <div className="about-actions">
                    <button className="set-btn" onClick={() => { setOpen(false); onTour(); }}>{t('Quick tour')}</button>
                    <button className="set-btn" onClick={() => { setOpen(false); onChangelog(); }}>{t('What\'s new')}</button>
                  </div>
                </footer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
