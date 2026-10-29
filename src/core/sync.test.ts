import { describe, expect, it, vi } from 'vitest';
import { createDefaultData } from './storage';
import { reducer, type Action } from './store';
import { createSync, mergeRemoteState, prepare, toShared } from './sync';
import type { AppData } from './types';

const widget = (id: string) => ({ id, type: 'postit', x: 0, y: 0, w: 100, h: 100, rot: 0, state: {} });
const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));

describe('prepare / toShared', () => {
  it('completa id, nome e spazio di destinazione, così ogni scheda ottiene lo stesso risultato', () => {
    const s = createDefaultData();
    const a = prepare({ type: 'addWorkspace' }, s) as Extract<Action, { type: 'addWorkspace' }>;
    expect(a.id).toBeTruthy();
    expect(a.name).toBe('Spazio 2');
    expect(a.order).toBe(1);
    expect(a.activate).toBe(true);
    const w = prepare({ type: 'updateWidget', id: 'x', patch: {} }, s) as Extract<Action, { type: 'updateWidget' }>;
    expect(w.ws).toBe(s.activeWorkspaceId);
  });

  it('non invia ciò che è locale: spazio attivo e cassetto aperto', () => {
    expect(toShared({ type: 'setActive', id: 'x' })).toBeNull();
    expect(toShared({ type: 'load', data: createDefaultData() })).toBeNull();
    expect(toShared({ type: 'setSettings', patch: { activeCategory: 'time' } })).toBeNull();
    expect(toShared({ type: 'setSettings', patch: { theme: 'sea', activeCategory: 'time' } })).toEqual({ type: 'setSettings', patch: { theme: 'sea' } });
  });

  it('chi riceve un nuovo spazio non viene spostato su di esso', () => {
    const a = toShared({ type: 'addWorkspace', id: 'n', activate: true }) as Extract<Action, { type: 'addWorkspace' }>;
    expect(a.activate).toBe(false);
  });
});

describe('mergeRemoteState', () => {
  it('prende i dati dall\'altra scheda ma tiene lo spazio attivo e il cassetto locali', () => {
    const local = createDefaultData();
    const remote: AppData = {
      ...reducer(local, { type: 'addWorkspace', id: 'w2', activate: false }),
      settings: { ...local.settings, theme: 'forest', activeCategory: 'fun' },
    };
    const m = mergeRemoteState({ ...local, settings: { ...local.settings, activeCategory: 'time' } }, remote);
    expect(m.workspaces).toHaveLength(2);
    expect(m.settings.theme).toBe('forest');
    expect(m.settings.activeCategory).toBe('time');
    expect(m.activeWorkspaceId).toBe(local.activeWorkspaceId);
  });

  it('se lo spazio che guardavo non esiste più, passa a quello dell\'altra scheda', () => {
    const local = { ...createDefaultData(), activeWorkspaceId: 'sparito' };
    const remote = createDefaultData();
    expect(mergeRemoteState(local, remote).activeWorkspaceId).toBe(remote.activeWorkspaceId);
  });
});

describe('due schede restano coerenti', () => {
  it('modifiche su spazi e widget diversi, in ordini diversi, convergono allo stesso stato', () => {
    let base = createDefaultData();
    base = reducer(base, { type: 'addWorkspace', id: 'w2', name: 'Spazio 2', order: 1, activate: false });
    const w1 = base.workspaces[0]!.id;

    // Scheda A guarda lo spazio 1, scheda B lo spazio 2.
    let A: AppData = { ...base, activeWorkspaceId: w1 };
    let B: AppData = { ...base, activeWorkspaceId: 'w2' };
    const fromA = [
      prepare({ type: 'addWidget', widget: widget('a1') }, A),
      prepare({ type: 'updateWidget', id: 'a1', patch: { x: 50 } }, A),
    ];
    const fromB = [
      prepare({ type: 'addWidget', widget: widget('b1') }, B),
      prepare({ type: 'updateWidget', id: 'b1', patch: { y: 70 } }, B),
    ];
    A = fromA.reduce(reducer, A);
    B = fromB.reduce(reducer, B);
    A = fromB.reduce(reducer, A); // A riceve le azioni di B
    B = fromA.reduce(reducer, B); // B riceve quelle di A

    const same = (s: AppData) => JSON.stringify(s.workspaces);
    expect(same(A)).toBe(same(B));
    expect(A.workspaces.find((w) => w.id === 'w2')!.widgets[0]).toMatchObject({ id: 'b1', y: 70 });
    expect(A.activeWorkspaceId).toBe(w1); // ognuna conserva lo spazio che guardava
    expect(B.activeWorkspaceId).toBe('w2');
  });
});

describe('createSync (canale reale)', () => {
  it('invia le azioni alle altre schede e una scheda nuova riceve lo stato aggiornato', async () => {
    const dataA = reducer(createDefaultData(), { type: 'addWidget', widget: widget('w') });
    const gotAction = vi.fn();
    const gotState = vi.fn();
    const a = createSync({ getData: () => dataA, onAction: vi.fn(), onState: vi.fn() });
    const b = createSync({ getData: () => createDefaultData(), onAction: gotAction, onState: gotState });
    try {
      a.sendAction({ type: 'removeWidget', ws: 'x', id: 'w' });
      await wait();
      expect(gotAction).toHaveBeenCalledWith({ type: 'removeWidget', ws: 'x', id: 'w' });

      b.hello(); // b è appena stata aperta: chiede lo stato
      await wait();
      expect(gotState).toHaveBeenCalledTimes(1);
      expect(gotState.mock.calls[0]![0].workspaces[0].widgets).toHaveLength(1);
    } finally {
      a.close();
      b.close();
    }
  });

  it('non riceve i propri messaggi e accetta una sola risposta allo stato', async () => {
    const onAction = vi.fn();
    const onState = vi.fn();
    const a = createSync({ getData: createDefaultData, onAction: vi.fn(), onState: vi.fn() });
    const c = createSync({ getData: createDefaultData, onAction: vi.fn(), onState: vi.fn() });
    const b = createSync({ getData: createDefaultData, onAction, onState });
    try {
      b.sendAction({ type: 'bringToFront', id: 'q' });
      await wait();
      expect(onAction).not.toHaveBeenCalled(); // b non si sente da sola
      b.hello(); // rispondono due schede (a e c)
      await wait();
      expect(onState).toHaveBeenCalledTimes(1);
    } finally {
      a.close(); b.close(); c.close();
    }
  });
});
