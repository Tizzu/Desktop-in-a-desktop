import { useState, type Dispatch } from 'react';
import type { Action } from '../core/store';
import type { AppData } from '../core/types';
import { useT } from '../core/i18n';

export function Tabs({ data, dispatch }: { data: AppData; dispatch: Dispatch<Action> }) {
  const t = useT();
  const [editing, setEditing] = useState<string | null>(null);
  const sorted = [...data.workspaces].sort((a, b) => a.order - b.order);

  return (
    <nav className="tabs">
      {sorted.map((w) => (
        <div key={w.id} className={`tab${w.id === data.activeWorkspaceId ? ' active' : ''}`}>
          {editing === w.id ? (
            <input
              autoFocus
              defaultValue={w.name}
              onBlur={(e) => {
                dispatch({ type: 'renameWorkspace', id: w.id, name: e.target.value.trim() || w.name });
                setEditing(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          ) : (
            <button
              onClick={() => dispatch({ type: 'setActive', id: w.id })}
              onDoubleClick={() => setEditing(w.id)}
              title={t('Double-click to rename')}
            >
              {w.name}
            </button>
          )}
          {sorted.length > 1 && (
            <button
              className="icon-btn"
              aria-label={t('Close {name}', { name: w.name })}
              onClick={() => confirm(t('Delete "{name}" and its widgets?', { name: w.name })) && dispatch({ type: 'removeWorkspace', id: w.id })}
            >×</button>
          )}
        </div>
      ))}
      <button className="tab-add" aria-label={t('New space')} onClick={() => dispatch({ type: 'addWorkspace', name: t('Space {n}', { n: Math.max(-1, ...data.workspaces.map((w) => w.order)) + 2 }) })}>＋</button>
    </nav>
  );
}
