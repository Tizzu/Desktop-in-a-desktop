import { useState, type Dispatch } from 'react';
import type { Action } from '../core/store';
import { THEMES } from '../core/themes';
import type { Settings } from '../core/types';

const OPTIONS: { key: 'tilt' | 'physics' | 'categories' | 'searchBar'; label: string }[] = [
  { key: 'categories', label: 'Cassetti per categoria' },
  { key: 'searchBar', label: 'Barra di ricerca al centro' },
  { key: 'tilt', label: 'Inclinazione casuale dei widget' },
  { key: 'physics', label: 'Lancio con inerzia' },
];

export function SettingsMenu({ settings, dispatch }: { settings: Settings; dispatch: Dispatch<Action> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="settings">
      <button className="tab-add" aria-label="Impostazioni" aria-expanded={open} onClick={() => setOpen(!open)}>⚙</button>
      {open && (
        <div className="settings-panel">
          <div className="theme-row" role="radiogroup" aria-label="Colori">
            <span>Colori</span>
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={settings.theme === t.id}
                aria-label={t.label}
                title={t.label}
                className={`theme-dot${settings.theme === t.id ? ' on' : ''}`}
                style={{ background: t.swatch }}
                onClick={() => dispatch({ type: 'setSettings', patch: { theme: t.id } })}
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
              {label}
            </label>
          ))}
          <label>
            Stile dei cassetti
            <select
              value={settings.drawerStyle}
              onChange={(e) => dispatch({ type: 'setSettings', patch: { drawerStyle: e.target.value as Settings['drawerStyle'] } })}
            >
              <option value="tucked">In piedi, infilati</option>
              <option value="slanted">Di sbieco</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
