import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { backupPending, createAutosaver, createDefaultData, createIdbStorage, migrate, readBackup, sanitize } from './storage';

describe('storage', () => {
  it('restituisce undefined al primo avvio e persiste i dati', async () => {
    const s = createIdbStorage('t1');
    expect(await s.load()).toBeUndefined();
    const data = createDefaultData();
    await s.save(data);
    expect(await s.load()).toEqual(data);
  });

  it('autosaver fa il debounce e flush scrive subito', async () => {
    const s = createIdbStorage('t2');
    const saver = createAutosaver(s, 10_000);
    const data = createDefaultData();
    saver.schedule(data);
    expect(await s.load()).toBeUndefined();
    await saver.flush();
    expect(await s.load()).toEqual(data);
  });

  it('migra i dati v1 aggiungendo settings e rotazione', () => {
    const v1: any = {
      version: 1,
      activeWorkspaceId: 'a',
      workspaces: [{ id: 'a', name: 'x', order: 0, widgets: [{ id: 'w', type: 'postit', x: 1, y: 2, w: 3, h: 4, z: 1, state: {} }] }],
    };
    const m = migrate(v1);
    expect(m.version).toBe(3);
    expect(m.settings).toEqual({ language: 'en', tilt: true, physics: true, drawerStyle: 'tucked', categories: true, searchBar: false, theme: 'warm', activeCategory: 'all' });
    expect(m.workspaces[0]!.widgets[0]!.rot).toBe(0);
  });

  it('migra le coordinate assolute (v2) a coordinate rispetto al centro', () => {
    const w = (id: string, parent?: string) => ({ id, type: 'postit', x: 600, y: 400, w: 10, h: 10, z: 1, rot: 0, parent, state: {} });
    const v2: any = { version: 2, activeWorkspaceId: 'a', workspaces: [{ id: 'a', name: 'x', order: 0, widgets: [w('p'), w('c', 'p')] }] };
    const m = migrate(v2, { x: 500, y: 300 });
    expect(m.workspaces[0]!.widgets.map((x) => [x.x, x.y])).toEqual([[100, 100], [600, 400]]); // il figlio è già relativo
    expect(migrate(m, { x: 500, y: 300 }).workspaces[0]!.widgets[0]!.x).toBe(100); // già v3: non si sposta di nuovo
    expect(migrate(v2).workspaces[0]!.widgets[0]!.x).toBe(600); // senza centro resta com'è
  });

  it('scarta agganci e parent che non puntano a niente', () => {
    const w = (id: string, parent?: string) => ({ id, type: 'postit', x: 0, y: 0, w: 10, h: 10, z: 1, rot: 0, parent, state: {} });
    const d: any = { version: 3, activeWorkspaceId: 'a', workspaces: [{ id: 'a', name: 'x', order: 0, links: [['p', 'q'], ['p', 'zz'], ['p', 'p'], 'x'], widgets: [w('p'), w('q'), w('c', 'nope')] }] };
    const m = migrate(d);
    expect(m.workspaces[0]!.links).toEqual([['p', 'q']]);
    expect(m.workspaces[0]!.widgets[2]!.parent).toBeUndefined();
  });

  it('migra il vecchio interruttore dei colori al tema "system"', () => {
    const old: any = { version: 2, activeWorkspaceId: 'a', settings: { adaptColors: true }, workspaces: [] };
    const m: any = migrate(old);
    expect(m.settings.theme).toBe('system');
    expect('adaptColors' in m.settings).toBe(false);
    expect((migrate({ ...old, settings: {} }) as any).settings.theme).toBe('warm');
  });
});

describe('autosaver con modifiche continue', () => {
  afterEach(() => vi.useRealTimers());

  it('salva comunque entro l\'attesa massima, anche se le modifiche non si fermano mai', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => {});
    const saver = createAutosaver({ load: async () => undefined, save }, 300, 1000);
    const data = createDefaultData();

    for (let t = 0; t < 2500; t += 16) { // una modifica per fotogramma
      saver.schedule(data);
      await vi.advanceTimersByTimeAsync(16);
    }
    expect(save.mock.calls.length).toBeGreaterThanOrEqual(2); // prima del fix: 0 finché durava il flusso
  });

  it('dopo una modifica singola salva dopo il ritardo normale', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => {});
    const saver = createAutosaver({ load: async () => undefined, save }, 300, 1000);
    saver.schedule(createDefaultData());
    await vi.advanceTimersByTimeAsync(299);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('copia di sicurezza alla chiusura', () => {
  const stubLocalStorage = () => {
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
    return mem;
  };
  afterEach(() => vi.unstubAllGlobals());

  it('scrive e rilegge l\'ultimo stato, anche se non ancora salvato su IndexedDB', () => {
    stubLocalStorage();
    const data = createDefaultData();
    backupPending(data);
    expect(readBackup()).toEqual(data);
  });

  it('autosaver.backup() copia solo se c\'è qualcosa in attesa; dopo il salvataggio la copia sparisce', async () => {
    const mem = stubLocalStorage();
    const saver = createAutosaver({ load: async () => undefined, save: async () => {} });
    saver.backup();
    expect(mem.size).toBe(0); // niente in attesa: niente copia
    saver.schedule(createDefaultData());
    saver.backup();
    expect(mem.size).toBe(1);
    await saver.flush();
    expect(mem.size).toBe(0);
  });

  it('una copia corrotta o assente non rompe l\'avvio', () => {
    const mem = stubLocalStorage();
    expect(readBackup()).toBeUndefined();
    mem.set('pendingSave', '{non json');
    expect(readBackup()).toBeUndefined();
  });
});

describe('dati rovinati letti dal disco', () => {
  const widget = { id: 'w', type: 'postit', x: 1, y: 2, w: 3, h: 4, z: 1, rot: 0, state: {} };
  const ws = (widgets: unknown[]) => ({ id: 'a', name: 'x', order: 0, widgets });

  it('scarta tutto ciò che non ha la forma di un salvataggio', () => {
    for (const bad of [undefined, null, 'testo', 42, [], {}, { workspaces: 'no' }, { workspaces: [] }, { workspaces: [null, 3, {}] }]) {
      expect(sanitize(bad), JSON.stringify(bad)).toBeUndefined();
    }
  });

  it('toglie i widget inutilizzabili e tiene gli altri', () => {
    const d = sanitize({ version: 2, activeWorkspaceId: 'a', workspaces: [ws([widget, { ...widget, id: 7 }, { ...widget, id: 'n', x: NaN }, { ...widget, id: 'm', type: undefined }, null, 'x'])] })!;
    expect(d.workspaces[0]!.widgets.map((w) => w.id)).toEqual(['w']);
  });

  it('se lo spazio attivo non esiste passa al primo; se z manca lo ripristina', () => {
    const d = sanitize({ activeWorkspaceId: 'sparito', workspaces: [ws([{ ...widget, z: undefined }])] })!;
    expect(d.activeWorkspaceId).toBe('a');
    expect(d.workspaces[0]!.widgets[0]!.z).toBe(1);
  });

  it('le impostazioni con valori sconosciuti o di tipo sbagliato tornano al predefinito', () => {
    const d = sanitize({ activeWorkspaceId: 'a', workspaces: [ws([])], settings: { theme: 'inesistente', drawerStyle: 7, activeCategory: 'boh', tilt: 'sì', physics: false } })!;
    expect(d.settings).toMatchObject({ theme: 'warm', drawerStyle: 'tucked', activeCategory: 'all', tilt: true, physics: false });
    expect(sanitize({ activeWorkspaceId: 'a', workspaces: [ws([])], settings: 'rotto' })!.settings.theme).toBe('warm');
  });

  it('un record corrotto nel database equivale a "nessun dato", senza lanciare errori', async () => {
    const s = createIdbStorage('t-corrotto');
    await s.save({ workspaces: 'rotto' } as never);
    await expect(s.load()).resolves.toBeUndefined();
  });
});

describe('database che non risponde', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('se il salvataggio fallisce i dati finiscono nella copia di sicurezza e non c\'è un errore non gestito', async () => {
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
    const saver = createAutosaver({ load: async () => undefined, save: async () => { throw new Error('IndexedDB bloccato'); } });
    const data = createDefaultData();
    saver.schedule(data);
    await expect(saver.flush()).resolves.toBeUndefined();
    expect(readBackup()).toEqual(data);
  });
});
