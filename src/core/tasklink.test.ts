import { describe, expect, it } from 'vitest';
import { reducer } from './store';
import { createDefaultData } from './storage';
import { prepare } from './sync';
import { progressBeside, relinkTasks } from './tasklink';
import type { AppData, WidgetInstance } from './types';

const base = { x: 0, y: 0, w: 260, h: 320, rot: 0, z: 1 };
const todo = (items: unknown[]): WidgetInstance => ({ ...base, id: 't', type: 'todo', state: { items } });
const prog = (state: object): WidgetInstance => ({ ...base, id: 'p', type: 'progress', state: { title: '', mode: 'manual', value: 0, tasks: [], ...state } });
const ws = (widgets: WidgetInstance[]) => ({ id: 'w', name: 'w', order: 0, widgets });
const items = (w: { widgets: WidgetInstance[] }) => (w.widgets.find((x) => x.id === 't')!.state as { items: { done: boolean; progress?: string }[] }).items;

describe('relinkTasks', () => {
  it('spunta il task quando il progresso arriva al 100% e lo riapre se scende', () => {
    const done = relinkTasks(ws([todo([{ id: 'a', text: 'x', done: false, progress: 'p' }]), prog({ value: 100 })]));
    expect(items(done)[0]).toMatchObject({ done: true, progress: 'p' });
    const back = relinkTasks({ ...done, widgets: done.widgets.map((x) => (x.id === 'p' ? prog({ value: 99 }) : x)) });
    expect(items(back)[0]!.done).toBe(false);
  });
  it('con i sotto-task il 100% è tutti spuntati', () => {
    const t = (d: boolean) => ({ id: 'k' + d, text: 's', done: d });
    expect(items(relinkTasks(ws([todo([{ id: 'a', text: 'x', done: false, progress: 'p' }]), prog({ mode: 'tasks', tasks: [t(true), t(true)] })])))[0]!.done).toBe(true);
    expect(items(relinkTasks(ws([todo([{ id: 'a', text: 'x', done: true, progress: 'p' }]), prog({ mode: 'tasks', tasks: [t(true), t(false)] })])))[0]!.done).toBe(false);
  });
  it('se il progresso non esiste più il task torna normale e resta com\'era', () => {
    const r = relinkTasks(ws([todo([{ id: 'a', text: 'x', done: true, progress: 'p' }])]));
    expect(items(r)[0]).toEqual({ id: 'a', text: 'x', done: true });
  });
  it('non tocca i task normali e restituisce lo stesso oggetto se tutto è già allineato', () => {
    const w = ws([todo([{ id: 'a', text: 'x', done: false }, { id: 'b', text: 'y', done: true, progress: 'p' }]), prog({ value: 100 })]);
    expect(relinkTasks(w)).toBe(w);
  });
  it('non si rompe con dati malformati', () => {
    const w = ws([{ ...todo([]), id: 'broken', state: { items: null } }, todo([{ id: 'a', text: 'x', done: false, progress: 'p' }]), prog({ mode: 'tasks', tasks: null })]);
    expect(() => relinkTasks(w)).not.toThrow();
    expect(items(relinkTasks(w))[0]).toEqual({ id: 'a', text: 'x', done: false });
  });
});

describe('addLinkedProgress e reducer', () => {
  const start = (): AppData => {
    const s = createDefaultData();
    return { ...s, workspaces: [{ ...s.workspaces[0]!, widgets: [todo([{ id: 'a', text: 'scrivere', done: false }, { id: 'b', text: 'altro', done: false }])] }] };
  };
  const widget = progressBeside({ x: 10, y: 20, w: 260 }, { defaultSize: { w: 300, h: 280 }, initialState: () => ({ title: '', mode: 'manual', value: 0, tasks: [] }) }, 'p', 'scrivere', 1);

  it('apre il progresso accanto alla lista, con il testo del task come titolo, e lo collega', () => {
    const s = reducer(start(), { type: 'addLinkedProgress', todo: 't', item: 'a', widget, link: true });
    const w = s.workspaces[0]!;
    expect(w.widgets.find((x) => x.id === 'p')).toMatchObject({ type: 'progress', x: 270, y: 20, w: 300, state: { title: 'scrivere' } });
    expect(items(w)[0]!.progress).toBe('p');
    expect(items(w)[1]!.progress).toBeUndefined();
    expect(w.links).toEqual([['t', 'p']]);
  });
  it('porta a termine il task quando il progresso si completa, e lo scollega alla chiusura del progresso', () => {
    let s = reducer(start(), { type: 'addLinkedProgress', todo: 't', item: 'a', widget });
    s = reducer(s, { type: 'updateWidget', id: 'p', patch: { state: { ...widget.state as object, value: 100 } } });
    expect(items(s.workspaces[0]!)[0]).toMatchObject({ done: true, progress: 'p' });
    s = reducer(s, { type: 'removeWidget', id: 'p' });
    expect(items(s.workspaces[0]!)[0]).toEqual({ id: 'a', text: 'scrivere', done: true });
  });
  it('ignora richieste per task o liste inesistenti', () => {
    const s = start();
    expect(reducer(s, { type: 'addLinkedProgress', todo: 't', item: 'zzz', widget })).toEqual(s);
    expect(reducer(s, { type: 'addLinkedProgress', todo: 'zzz', item: 'a', widget })).toEqual(s);
  });
  it('viaggia tra le schede con lo spazio di destinazione', () => {
    const s = start();
    const a = prepare({ type: 'addLinkedProgress', todo: 't', item: 'a', widget }, s) as { ws?: string };
    expect(a.ws).toBe(s.activeWorkspaceId);
  });
});
