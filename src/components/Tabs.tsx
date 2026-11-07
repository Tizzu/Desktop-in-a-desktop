import { useEffect, useRef, useState, type Dispatch } from 'react';
import type { Action } from '../core/store';
import type { AppData, Workspace } from '../core/types';
import { randomTilt } from '../core/space';
import { useT } from '../core/i18n';

const MENU_W = 290;

type Choice = 'global' | 'on' | 'off';
const choiceOf = (v: boolean | undefined): Choice => (v === undefined ? 'global' : v ? 'on' : 'off');
const valueOf = (c: Choice) => (c === 'global' ? null : c === 'on');

/** Opzioni di uno spazio (inclinazione, barra di ricerca, blocco): si aprono dall'ingranaggio accanto al suo nome. */
function SpaceMenu({ space, anchor, dispatch, onClose }: { space: Workspace; anchor: DOMRect; dispatch: Dispatch<Action>; onClose: () => void }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const ws = space.id;
  const tilt = space.overrides?.tilt;
  const set = (patch: Extract<Action, { type: 'setSpace' }>['patch']) => dispatch({ type: 'setSpace', ws, patch });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!box.current?.contains(target) && !target.closest('.space-gear')) onClose();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true); };
  }, [onClose]);

  const shuffle = () =>
    dispatch({ type: 'updateWidgets', ws, patches: space.widgets.filter((w) => !w.parent).map((w) => ({ id: w.id, patch: { rot: randomTilt() } })) });

  // Sta sopra l'ingranaggio (la barra è in basso) e non esce dalla finestra.
  const style = { left: Math.max(8, Math.min(window.innerWidth - MENU_W - 8, anchor.left)), bottom: window.innerHeight - anchor.top + 8, width: MENU_W };

  return (
    <div className="space-menu" ref={box} style={style} role="dialog" aria-label={t('Space options')}>
      <label className="sm-field">
        {t('Name')}
        <input
          defaultValue={space.name}
          maxLength={40}
          onBlur={(e) => { const name = e.target.value.trim(); if (name && name !== space.name) dispatch({ type: 'renameWorkspace', id: ws, name }); }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </label>

      <div className="sm-field">
        <label className="sm-line">
          {t('Tilt')}
          <select aria-label={t('Tilt for this space')} value={tilt === undefined ? 'global' : 'custom'} onChange={(e) => set({ tilt: e.target.value === 'global' ? null : tilt ?? 1 })}>
            <option value="global">{t('Follow settings')}</option>
            <option value="custom">{t('Custom')}</option>
          </select>
        </label>
        {tilt !== undefined && (
          <div className="sm-line">
            <input type="range" min={0} max={100} step={5} aria-label={t('Tilt amount for this space')} value={Math.round(tilt * 100)} onChange={(e) => set({ tilt: Number(e.target.value) / 100 })} />
            <output className="set-value">{Math.round(tilt * 100)}%</output>
          </div>
        )}
        <button className="set-btn" onClick={shuffle}>{t('Shuffle angles')}</button>
      </div>

      <label className="sm-line">
        {t('Search bar')}
        <select aria-label={t('Search bar for this space')} value={choiceOf(space.overrides?.searchBar)} onChange={(e) => set({ searchBar: valueOf(e.target.value as Choice) })}>
          <option value="global">{t('Follow settings')}</option>
          <option value="on">{t('Show')}</option>
          <option value="off">{t('Hide')}</option>
        </select>
      </label>

      <div className="sm-field">
        <label className="set-check">
          <input type="checkbox" checked={space.locked === true} onChange={(e) => set({ locked: e.target.checked })} />
          {t('Lock space layout')}
        </label>
        <small className="set-hint">{t('Nothing in the space moves, resizes or gets added.')}</small>
      </div>
    </div>
  );
}

export function Tabs({ data, dispatch }: { data: AppData; dispatch: Dispatch<Action> }) {
  const t = useT();
  const [editing, setEditing] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; rect: DOMRect } | null>(null);
  const sorted = [...data.workspaces].sort((a, b) => a.order - b.order);
  const open = menu && sorted.find((w) => w.id === menu.id);

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
          {w.id === data.activeWorkspaceId && editing !== w.id && (
            <button
              className="icon-btn space-gear"
              aria-label={t('Space options')}
              aria-expanded={menu?.id === w.id}
              title={t('Space options')}
              onClick={(e) => setMenu(menu?.id === w.id ? null : { id: w.id, rect: e.currentTarget.getBoundingClientRect() })}
            >⚙</button>
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
      {open && menu && <SpaceMenu space={open} anchor={menu.rect} dispatch={dispatch} onClose={() => setMenu(null)} />}
    </nav>
  );
}
