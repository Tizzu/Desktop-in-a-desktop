import { useRef, useState, type Dispatch } from 'react';
import { browser } from 'wxt/browser';
import { LANGUAGES, isLang, useT } from '../core/i18n';
import type { Action } from '../core/store';
import { THEMES } from '../core/themes';
import { exportFileName, exportJson, exportText, parseImport, parseImportText } from '../core/backup';
import type { AppData } from '../core/types';

const OPTIONS: { key: 'tilt' | 'physics' | 'categories' | 'searchBar'; label: string }[] = [
  { key: 'categories', label: 'Drawers by category' },
  { key: 'searchBar', label: 'Search bar in the centre' },
  { key: 'tilt', label: 'Random tilt on widgets' },
  { key: 'physics', label: 'Throw with momentum' },
];

const REPO = 'https://github.com/Tizzu/Desktop-in-a-desktop';

function version() {
  try { return browser.runtime.getManifest().version; } catch { return ''; }
}

type Settings = AppData['settings'];

export function SettingsMenu({ data, dispatch }: { data: AppData; dispatch: Dispatch<Action> }) {
  const t = useT();
  const settings = data.settings;
  const [open, setOpen] = useState(false);
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
    <div className="settings">
      <button className="settings-btn" aria-label={t('Settings')} aria-expanded={open} onClick={() => setOpen(!open)}>⚙</button>
      {open && (
        <div className="settings-panel">
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
                onClick={() => dispatch({ type: 'setSettings', patch: { theme: th.id } })}
              />
            ))}
          </div>
          {OPTIONS.map(({ key, label }) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) => dispatch({ type: 'setSettings', patch: { [key]: e.target.checked } })}
              />
              {t(label)}
            </label>
          ))}
          <label>
            {t('Drawer style')}
            <select
              value={settings.drawerStyle}
              onChange={(e) => dispatch({ type: 'setSettings', patch: { drawerStyle: e.target.value as Settings['drawerStyle'] } })}
            >
              <option value="tucked">{t('Standing, tucked in')}</option>
              <option value="slanted">{t('Slanted')}</option>
            </select>
          </label>
          <label>
            {t('Language')}
            <select
              value={settings.language}
              onChange={(e) => isLang(e.target.value) && dispatch({ type: 'setSettings', patch: { language: e.target.value } })}
            >
              {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </label>
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
          <footer className="credits">
            <strong>Desktop in a Desktop</strong> {version() && `v${version()}`}
            <span>{t('Made by {name}', { name: 'Valentino Artizzu' })}</span>
            <span>{t('Free software, MIT licence · everything stays on your computer')}</span>
            <a href={REPO} target="_blank" rel="noopener noreferrer">{t('Source code and feedback')}</a>
          </footer>
        </div>
      )}
    </div>
  );
}
