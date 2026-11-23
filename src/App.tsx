import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { Canvas, stopAllFlights } from './components/Canvas';
import { Palette } from './components/Palette';
import { CommandsContext, type Commands } from './components/commands';
import { ConfirmProvider } from './components/Confirm';
import { Toast, type ToastData } from './components/Toast';
import { Drawer } from './components/Drawer';
import { SettingsMenu } from './components/SettingsMenu';
import { Tabs } from './components/Tabs';
import { Changelog } from './components/Changelog';
import { EyeButton } from './components/EyeButton';
import { PrivacyVeil } from './components/PrivacyVeil';
import { Tour } from './components/Tour';
import { LangContext, translate } from './core/i18n';
import { createHistory } from './core/history';
import { matchesShortcut } from './core/shortcut';
import { buildTemplate, listTemplates, templateFromSpace } from './core/templates';
import type { Desk } from './core/store';
import { getWidget, listWidgets } from './widgets';
import type { WidgetDef } from './widgets/registry';
import { createAutosaver, createDefaultData, createIdbStorage, readBackup } from './core/storage';
import { reducer, type Action } from './core/store';
import { randomTilt } from './core/space';
import { usePrivacy } from './core/usePrivacy';
import { setTimerSound } from './core/sound';
import { appVersion, compareVersions } from './core/version';
import { createSync, mergeRemoteState, prepare, toShared, type Sync } from './core/sync';
import type { AppData } from './core/types';

// Segnaposto per "da salvare, a prescindere da quale stato c'era prima": non è mai uguale ai dati veri.
const NOTHING = {} as AppData;

export function App() {
  const storage = useMemo(() => createIdbStorage(), []);
  const saver = useMemo(() => createAutosaver(storage), [storage]);
  const [data, rawDispatch] = useReducer(reducer, undefined, createDefaultData);
  const [ready, setReady] = useState(false);
  const [tour, setTour] = useState(false);
  const [log, setLog] = useState(false); // novità della versione
  const firstRun = useRef(false);
  const { hidden, setHidden } = usePrivacy(data.settings, ready);
  // Un spazio può aprirsi da solo in modalità privacy: appena ci si entra (o all'avvio, se è quello attivo) la pagina si
  // nasconde, prima che il contenuto si veda. Una volta mostrata resta visibile finché non si cambia spazio.
  const activeId = data.activeWorkspaceId;
  const activeIsPrivate = data.workspaces.find((w) => w.id === activeId)?.privacy === true;
  useLayoutEffect(() => {
    if (ready && activeIsPrivate) setHidden(true);
  }, [activeId, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const canvasRef = useRef<HTMLDivElement>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const syncRef = useRef<Sync | undefined>(undefined);
  // Se c'è una modifica fatta in QUESTA scheda da salvare (quelle ricevute da altre schede le salva chi le ha fatte),
  // contiene lo stato che la precedeva: si salva solo quando i dati sono davvero cambiati. Un semplice "sì/no" verrebbe
  // consumato troppo presto da una modifica fatta durante il primo disegno di un widget (che parte dagli effetti dei
  // figli, prima di quello di salvataggio), e quella modifica non verrebbe salvata.
  const dirtyFrom = useRef<AppData | null>(null);
  // Annulla/ripeti della scrivania (solo di questa scheda), l'avviso con «Annulla», la palette dei comandi e il widget da far risaltare.
  const [history] = useState(createHistory);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [palette, setPalette] = useState(false);
  const [flash, setFlash] = useState<string | undefined>();
  const undoRef = useRef<() => void>(() => {});

  // Ogni modifica locale viene completata, applicata e inviata alle altre schede aperte.
  const dispatch = useCallback((a: Action) => {
    const action = prepare(a, dataRef.current);
    history.record(dataRef.current, action, Date.now());
    if (action.type === 'removeWidget') {
      const lang = dataRef.current.settings.language;
      setToast({ id: Date.now(), text: translate(lang, 'Widget removed'), action: { label: translate(lang, 'Undo'), run: () => undoRef.current() } });
    }
    dirtyFrom.current = dataRef.current;
    rawDispatch(action);
    const shared = toShared(action);
    if (shared) syncRef.current?.sendAction(shared);
  }, [history]);

  useEffect(() => {
    // Una copia di sicurezza lasciata dalla chiusura precedente vale più del database.
    const backup = readBackup();
    if (backup) dirtyFrom.current = NOTHING; // va riscritta nel database
    (backup ? Promise.resolve(backup) : storage.load())
      .catch(() => undefined) // IndexedDB bloccato o illeggibile: si parte da zero, ma l'app si apre
      .then((saved) => {
        if (saved) rawDispatch({ type: 'load', data: saved });
        setTour(!saved?.settings.tourDone); // solo al primo avvio
        // Chi aggiorna vede le novità una volta sola; chi parte da zero ha già la visita guidata.
        const v = appVersion();
        firstRun.current = !saved;
        setLog(!!saved && !!v && saved.settings.tourDone && compareVersions(v, saved.settings.seenVersion) > 0);
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

  // Un'installazione nuova parte già "aggiornata": le novità si vedranno dalla versione successiva.
  useEffect(() => {
    if (ready && firstRun.current) dispatch({ type: 'setSettings', patch: { seenVersion: appVersion() } });
  }, [ready, dispatch]);
  useEffect(() => setTimerSound(data.settings.timerSound), [data.settings.timerSound]);

  // Salva le modifiche locali (debounce), solo dopo il caricamento iniziale.
  useEffect(() => {
    if (ready && dirtyFrom.current && data !== dirtyFrom.current) {
      dirtyFrom.current = null;
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

  const applyDesks = useCallback((desks: Desk[]) => {
    stopAllFlights(); // i widget in volo riscriverebbero le posizioni appena rimesse
    dispatch({ type: 'setDesk', desks });
    const first = desks[0]?.ws;
    if (first && first !== dataRef.current.activeWorkspaceId && dataRef.current.workspaces.some((w) => w.id === first)) dispatch({ type: 'setActive', id: first });
  }, [dispatch]);
  const undo = useCallback(() => { const d = history.undo(dataRef.current); if (d) applyDesks(d); }, [history, applyDesks]);
  const redo = useCallback(() => { const d = history.redo(dataRef.current); if (d) applyDesks(d); }, [history, applyDesks]);
  undoRef.current = undo;

  // Un gesto finito chiude la raffica di spostamenti: il successivo si annulla a parte. (Dopo il rilascio, perché l'aggancio
  // fatto proprio al rilascio fa parte dello stesso gesto.)
  useEffect(() => {
    const end = () => setTimeout(() => history.endBurst(), 0);
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
    return () => { window.removeEventListener('pointerup', end, true); window.removeEventListener('pointercancel', end, true); };
  }, [history]);

  // Scorciatoie: palette, annulla/ripeti (non mentre si scrive in un campo, dove valgono quelle del testo), Alt+1…9 per gli spazi.
  const paletteKey = data.settings.paletteKey;
  useEffect(() => {
    if (!ready || hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (matchesShortcut(paletteKey, e)) { e.preventDefault(); setPalette((p) => !p); return; }
      const typing = !!(e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]');
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.altKey && !typing && e.key.length === 1) {
        const k = e.key.toLowerCase();
        if (k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
        else if (k === 'y') { e.preventDefault(); redo(); }
      }
      if (e.altKey && !mod && !e.shiftKey && /^Digit[1-9]$/.test(e.code)) {
        const space = [...dataRef.current.workspaces].sort((a, b) => a.order - b.order)[Number(e.code.slice(5)) - 1];
        if (space) { e.preventDefault(); dispatch({ type: 'setActive', id: space.id }); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, hidden, paletteKey, undo, redo, dispatch]);

  if (!ready) return null;
  const tr = (text: string, params?: Record<string, string | number>) => translate(language, text, params);
  const newSpace = (templateId?: string) => {
    const n = Math.max(-1, ...data.workspaces.map((w) => w.order)) + 2;
    const built = templateId ? buildTemplate(data, templateId, getWidget, () => crypto.randomUUID(), randomTilt) : undefined;
    const name = templateId ? listTemplates(data, tr).find((e) => e.id === templateId)?.name : undefined;
    dispatch(built && name
      ? { type: 'addWorkspace', name, widgets: built.widgets, links: built.links }
      : { type: 'addWorkspace', name: tr('Space {n}', { n }) });
  };
  const saveTemplate = (name: string, keepContent: boolean) => {
    const template = templateFromSpace(data.workspaces.find((w) => w.id === data.activeWorkspaceId) ?? data.workspaces[0]!, name, crypto.randomUUID(), keepContent);
    if (template) dispatch({ type: 'saveTemplate', template });
  };
  const addTool = (def: WidgetDef) => {
    const jitter = () => Math.round((Math.random() - 0.5) * 80);
    dispatch({ type: 'addWidget', widget: { id: crypto.randomUUID(), type: def.type, x: -Math.round(def.defaultSize.w / 2) + jitter(), y: -Math.round(def.defaultSize.h / 2) + jitter(), ...def.defaultSize, rot: randomTilt(), state: def.initialState() } });
  };
  const jump = (ws: string, id: string) => {
    if (ws !== dataRef.current.activeWorkspaceId) dispatch({ type: 'setActive', id: ws });
    dispatch({ type: 'bringToFront', ws, id });
    setFlash(id);
    setTimeout(() => setFlash((f) => (f === id ? undefined : f)), 1800);
  };
  const labelOf = (type: string, state: unknown) => {
    const def = getWidget(type);
    return (def?.container && (state as { label?: string } | null)?.label) || tr(def?.label ?? type);
  };
  const commands: Commands = {
    data,
    tools: listWidgets(),
    labelOf,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    locked: data.workspaces.find((w) => w.id === data.activeWorkspaceId)?.locked === true,
    onJump: jump,
    onSwitch: (id) => dispatch({ type: 'setActive', id }),
    onAddTool: addTool,
    onNewSpace: newSpace,
    onUndo: undo,
    onRedo: redo,
  };
  const active = data.workspaces.find((w) => w.id === data.activeWorkspaceId) ?? data.workspaces[0]!;

  return (
    <LangContext.Provider value={language}>
    <ConfirmProvider>
    <CommandsContext.Provider value={commands}>
    <div className="shell" inert={hidden || palette}>
      <Drawer
        canvasRef={canvasRef}
        widgets={active.widgets}
        style={data.settings.drawerStyle}
        grouped={data.settings.categories}
        category={data.settings.activeCategory}
        onCategory={(activeCategory) => dispatch({ type: 'setSettings', patch: { activeCategory } })}
        locked={active.locked === true}
        onDrop={(def, x, y, parent) =>
          !active.locked && dispatch({
            type: 'addWidget',
            widget: { id: crypto.randomUUID(), type: def.type, x, y, parent, ...def.defaultSize, rot: randomTilt(), state: def.initialState() },
          })
        }
      />
      <Canvas
        ref={canvasRef}
        workspace={active}
        settings={data.settings}
        dispatch={dispatch}
        flashId={flash}
        spaces={[...data.workspaces].filter((w) => w.id !== active.id).sort((a, b) => a.order - b.order).map(({ id, name }) => ({ id, name }))}
      />
      <div className="bottom-bar">
        <Tabs data={data} dispatch={dispatch} onNewSpace={newSpace} onSaveTemplate={saveTemplate} />
        <EyeButton shortcut={data.settings.privacyKey} onClick={() => setHidden(true)} />
        <SettingsMenu data={data} dispatch={dispatch} onTour={() => setTour(true)} onChangelog={() => setLog(true)} onHide={() => setHidden(true)} />
      </div>
      {log && (
        <Changelog
          since={data.settings.seenVersion}
          onClose={() => {
            setLog(false);
            if (data.settings.seenVersion !== appVersion()) dispatch({ type: 'setSettings', patch: { seenVersion: appVersion() } });
          }}
        />
      )}
      {tour && (
        <Tour
          onClose={() => {
            setTour(false);
            if (!data.settings.tourDone) dispatch({ type: 'setSettings', patch: { tourDone: true } });
          }}
        />
      )}
    </div>
    {palette && !hidden && <Palette onClose={() => setPalette(false)} />}
    {toast && !hidden && <Toast toast={toast} onClose={() => setToast(null)} />}
    {hidden && <PrivacyVeil notice={data.settings.privacyNotice} shortcut={data.settings.privacyKey} onShow={() => setHidden(false)} />}
    </CommandsContext.Provider>
    </ConfirmProvider>
    </LangContext.Provider>
  );
}
