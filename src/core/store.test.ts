import { describe, expect, it } from 'vitest';
import { reducer } from './store';
import { createDefaultData } from './storage';

const widget = { id: 'a', type: 'postit', x: 0, y: 0, w: 100, h: 100, rot: 0, state: {} };

describe('reducer', () => {
  it('aggiunge widget con z crescente e li porta in primo piano', () => {
    let s = createDefaultData();
    s = reducer(s, { type: 'addWidget', widget });
    s = reducer(s, { type: 'addWidget', widget: { ...widget, id: 'b' } });
    s = reducer(s, { type: 'bringToFront', id: 'a' });
    const ws = s.workspaces[0]!.widgets;
    expect(ws.find((x) => x.id === 'a')!.z).toBeGreaterThan(ws.find((x) => x.id === 'b')!.z);
  });

  it('non rimuove l\'ultimo spazio e riassegna quello attivo', () => {
    let s = createDefaultData();
    expect(reducer(s, { type: 'removeWorkspace', id: s.workspaces[0]!.id })).toBe(s);
    s = reducer(s, { type: 'addWorkspace' });
    const second = s.activeWorkspaceId;
    s = reducer(s, { type: 'removeWorkspace', id: second });
    expect(s.workspaces).toHaveLength(1);
    expect(s.activeWorkspaceId).toBe(s.workspaces[0]!.id);
  });
});

describe('azioni indirizzate a uno spazio (sincronizzazione tra schede)', () => {
  const two = () => {
    let s = createDefaultData();
    s = reducer(s, { type: 'addWorkspace', id: 'w2', name: 'Altro', order: 1, activate: false });
    return s;
  };

  it('addWorkspace con activate:false non cambia lo spazio guardato', () => {
    const s = two();
    expect(s.workspaces.map((w) => w.id)).toContain('w2');
    expect(s.activeWorkspaceId).toBe(s.workspaces[0]!.id);
  });

  it('le azioni su un widget agiscono sullo spazio indicato, anche se non è quello attivo', () => {
    let s = two();
    s = reducer(s, { type: 'addWidget', ws: 'w2', widget: { ...widget, id: 'x' } });
    expect(s.workspaces.find((w) => w.id === 'w2')!.widgets).toHaveLength(1);
    expect(s.workspaces[0]!.widgets).toHaveLength(0);
    s = reducer(s, { type: 'updateWidget', ws: 'w2', id: 'x', patch: { x: 42 } });
    expect(s.workspaces.find((w) => w.id === 'w2')!.widgets[0]!.x).toBe(42);
    s = reducer(s, { type: 'removeWidget', ws: 'w2', id: 'x' });
    expect(s.workspaces.find((w) => w.id === 'w2')!.widgets).toHaveLength(0);
  });
});

describe('agganci e contenitori', () => {
  const base = () => {
    let s = createDefaultData();
    for (const id of ['a', 'b', 'c']) s = reducer(s, { type: 'addWidget', widget: { ...widget, id } });
    return s;
  };
  const ws = (s: ReturnType<typeof base>) => s.workspaces[0]!;

  it('link: senza doppioni né id inesistenti; unlink in entrambi i versi', () => {
    let s = reducer(base(), { type: 'link', pairs: [['a', 'b'], ['b', 'a'], ['a', 'zz'], ['c', 'c']] });
    expect(ws(s).links).toEqual([['a', 'b']]);
    s = reducer(s, { type: 'unlink', pairs: [['b', 'a']] });
    expect(ws(s).links).toEqual([]);
  });

  it('rimuovere un widget scioglie i suoi agganci', () => {
    let s = reducer(base(), { type: 'link', pairs: [['a', 'b'], ['b', 'c']] });
    s = reducer(s, { type: 'removeWidget', id: 'b' });
    expect(ws(s).links).toEqual([]);
  });

  it('updateWidgets cambia più widget in un colpo', () => {
    const s = reducer(base(), { type: 'updateWidgets', patches: [{ id: 'a', patch: { x: 5 } }, { id: 'c', patch: { y: 7 } }] });
    expect(ws(s).widgets.map((x) => [x.x, x.y])).toEqual([[5, 0], [0, 0], [0, 7]]);
  });

  it('un widget che entra in un contenitore perde gli agganci', () => {
    let s = reducer(base(), { type: 'link', pairs: [['a', 'b']] });
    s = reducer(s, { type: 'updateWidget', id: 'a', patch: { parent: 'c' } });
    expect(ws(s).links).toEqual([]);
  });

  it('rimuovendo un contenitore i suoi widget passano sulla tela, dove era lui', () => {
    let s = reducer(base(), { type: 'updateWidgets', patches: [{ id: 'c', patch: { x: 100, y: 200 } }, { id: 'a', patch: { parent: 'c', x: 10, y: 20 } }] });
    s = reducer(s, { type: 'removeWidget', id: 'c' });
    const a = ws(s).widgets.find((x) => x.id === 'a')!;
    expect(a.parent).toBeUndefined();
    expect([a.x, a.y]).toEqual([110, 250]);
    expect(ws(s).widgets).toHaveLength(2);
  });
});

describe('importazione', () => {
  it('sostituisce i dati ma tiene lo spazio e il cassetto che si stanno guardando', () => {
    let s = createDefaultData();
    s = reducer(s, { type: 'addWidget', widget });
    const mine = s.activeWorkspaceId;
    const incoming = createDefaultData();
    incoming.workspaces.push({ id: mine, name: 'Dal backup', order: 1, widgets: [] });
    incoming.settings.activeCategory = 'fun';
    const r = reducer(s, { type: 'import', data: incoming });
    expect(r.workspaces.map((w) => w.name)).toEqual(['Space 1', 'Dal backup']);
    expect(r.activeWorkspaceId).toBe(mine);
    expect(r.settings.activeCategory).toBe('all');
    expect(reducer(createDefaultData(), { type: 'import', data: incoming }).activeWorkspaceId).toBe(incoming.activeWorkspaceId);
  });
});
