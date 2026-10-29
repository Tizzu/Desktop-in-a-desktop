import { useState, type Dispatch } from 'react';
import { LANGUAGES, isLang, useT } from '../core/i18n';
import type { Action } from '../core/store';
import { THEMES } from '../core/themes';
import type { Settings } from '../core/types';

const OPTIONS: { key: 'tilt' | 'physics' | 'categories' | 'searchBar'; label: string }[] = [
  { key: 'categories', label: 'Drawers by category' },
  { key: 'searchBar', label: 'Search bar in the centre' },
  { key: 'tilt', label: 'Random tilt on widgets' },
  { key: 'physics', label: 'Throw with momentum' },
];

export function SettingsMenu({ settings, dispatch }: { settings: Settings; dispatch: Dispatch<Action> }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="settings">
      <button className="tab-add" aria-label={t('Settings')} aria-expanded={open} onClick={() => setOpen(!open)}>⚙</button>
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
        </div>
      )}
    </div>
  );
}
