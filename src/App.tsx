import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { Canvas } from './components/Canvas';
import { Drawer } from './components/Drawer';
import { SettingsMenu } from './components/SettingsMenu';
import { Tabs } from './components/Tabs';
import { LangContext } from './core/i18n';
import { createAutosaver, createDefaultData, createIdbStorage, readBackup } from './core/storage';
import { reducer, type Action } from './core/store';
import { createSync, mergeRemoteState, prepare, toShared, type Sync } from './core/sync';

export function App() {
  const storage = useMemo(() => createIdbStorage(), []);
  const saver = useMemo(() => createAutosaver(storage), [storage]);
  const [data, rawDispatch] = useReducer(reducer, undefined, createDefaultData);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const syncRef = useRef<Sync | undefined>(undefined);
  // Vero se c'è una modifica fatta in QUESTA scheda da salvare: quelle ricevute da altre schede le salva chi le ha fatte.
  const dirty = useRef(false);

  // Ogni modifica locale viene completata, applicata e inviata alle altre schede aperte.
  const dispatch = useCallback((a: Action) => {
    const action = prepare(a, dataRef.current);
    dirty.current = true;
    rawDispatch(action);
    const shared = toShared(action);
    if (shared) syncRef.current?.sendAction(shared);
  }, []);

  useEffect(() => {
    // Una copia di sicurezza lasciata dalla chiusura precedente vale più del database.
    const backup = readBackup();
    if (backup) dirty.current = true; // va riscritta nel database
    (backup ? Promise.resolve(backup) : storage.load())
      .catch(() => undefined) // IndexedDB bloccato o illeggibile: si parte da zero, ma l'app si apre
      .then((saved) => {
        if (saved) rawDispatch({ type: 'load', data: saved });
        setReady(true);
      });
  }, [storage]);

  // Sincronizzazione tra schede: dopo il caricamento, chiede lo stato alle altre schede (più recente del database)
  // e da lì in poi applica le loro modifiche man mano che arrivano.
  useEffect(() => {
    if (!ready) return;
    const sync = createSync({
      getData: () => dataRef.current,
      onAction: (a) => rawDispatch(a),
      onState: (remote) => rawDispatch({ type: 'load', data: mergeRemoteState(dataRef.current, remote) }),
    });
    syncRef.current = sync;
    sync.hello();
    return () => {
      sync.close();
      syncRef.current = undefined;
    };
  }, [ready]);

  // Salva le modifiche locali (debounce), solo dopo il caricamento iniziale.
  useEffect(() => {
    if (ready && dirty.current) {
      dirty.current = false;
      saver.schedule(data);
    }
  }, [data, ready, saver]);

  // Applica il tema; il valore è replicato in localStorage così main.tsx lo applica prima del primo render (niente sfarfallio).
  const theme = data.settings.theme;
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* storage non disponibile */ }
  }, [theme, ready]);

  // La lingua vale anche fuori dalla pagina: l'attributo lang, la copia in localStorage (messaggio d'errore al primo
  // disegno) e quella in storage.local, che il service worker legge per le notifiche.
  const language = data.settings.language;
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = language;
    try { localStorage.setItem('language', language); } catch { /* storage non disponibile */ }
    try { void browser.storage.local.set({ language }); } catch { /* fuori dall'estensione */ }
  }, [language, ready]);

  useEffect(() => {
    const flush = () => {
      saver.backup();
      void saver.flush();
    };
    const onVis = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
    };
  }, [saver]);

  if (!ready) return null;
  const active = data.workspaces.find((w) => w.id === data.activeWorkspaceId) ?? data.workspaces[0]!;

  return (
    <LangContext.Provider value={language}>
    <div className="shell">
      <Drawer
        canvasRef={canvasRef}
        widgets={active.widgets}
        style={data.settings.drawerStyle}
        grouped={data.settings.categories}
        category={data.settings.activeCategory}
        onCategory={(activeCategory) => dispatch({ type: 'setSettings', patch: { activeCategory } })}
        onDrop={(def, x, y, parent) =>
          dispatch({
            type: 'addWidget',
            widget: { id: crypto.randomUUID(), type: def.type, x, y, parent, ...def.defaultSize, rot: Math.random() * 6 - 3, state: def.initialState() },
          })
        }
      />
      <Canvas ref={canvasRef} workspace={active} settings={data.settings} dispatch={dispatch} />
      <div className="bottom-bar">
        <Tabs data={data} dispatch={dispatch} />
        <SettingsMenu data={data} dispatch={dispatch} />
      </div>
    </div>
    </LangContext.Provider>
  );
}
