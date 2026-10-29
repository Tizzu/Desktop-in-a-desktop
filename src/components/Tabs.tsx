import { useState, type Dispatch } from 'react';
import type { Action } from '../core/store';
import type { AppData } from '../core/types';

export function Tabs({ data, dispatch }: { data: AppData; dispatch: Dispatch<Action> }) {
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
              title="Doppio click per rinominare"
            >
              {w.name}
            </button>
          )}
          {sorted.length > 1 && (
            <button
              className="icon-btn"
              aria-label={`Chiudi ${w.name}`}
              onClick={() => confirm(`Eliminare "${w.name}" e i suoi widget?`) && dispatch({ type: 'removeWorkspace', id: w.id })}
            >×</button>
          )}
        </div>
      ))}
      <button className="tab-add" aria-label="Nuovo spazio" onClick={() => dispatch({ type: 'addWorkspace' })}>＋</button>
    </nav>
  );
}
