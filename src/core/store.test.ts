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
