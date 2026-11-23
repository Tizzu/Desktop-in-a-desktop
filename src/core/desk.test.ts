import { describe, expect, it } from 'vitest';
import { reducer, type Action } from './store';
import { createDefaultData, migrate } from './storage';
import { createHistory } from './history';
import { findWidgets, widgetText } from './find';
import { TEMPLATES, buildTemplate, listTemplates, templateFromSpace, templateWidgets } from './templates';
import { prepare } from './sync';
import { MAX_CUSTOM_TEMPLATES, type AppData, type CustomTemplate, type WidgetInstance } from './types';

const w = (id: string, over: Partial<WidgetInstance> = {}): WidgetInstance => ({ id, type: 'postit', x: 0, y: 0, w: 100, h: 100, z: 1, rot: 0, state: {}, ...over });
const start = (widgets: WidgetInstance[] = []): AppData => {
  const s = createDefaultData();
  return { ...s, workspaces: [{ ...s.workspaces[0]!, widgets }] };
};
const ids = (s: AppData, ws = 0) => s.workspaces[ws]!.widgets.map((x) => x.id);

describe('cestino', () => {
  it('un widget rimosso finisce nel cestino (al massimo 10) e si rimette dov\'era', () => {
    let s = start([w('a', { x: 40, y: 50, state: { text: 'ciao' } })]);
    s = reducer(s, { type: 'removeWidget', id: 'a', at: 5 });
    expect(ids(s)).toEqual([]);
    expect(s.trash).toHaveLength(1);
    expect(s.trash![0]).toMatchObject({ at: 5, space: s.workspaces[0]!.id });
    s = reducer(s, { type: 'restoreWidget', id: 'a' });
    expect(s.workspaces[0]!.widgets[0]).toMatchObject({ id: 'a', x: 40, y: 50, state: { text: 'ciao' } });
    expect(s.trash).toEqual([]);
  });
  it('tiene solo gli ultimi 10', () => {
    let s = start(Array.from({ length: 12 }, (_, i) => w('w' + i)));
    for (let i = 0; i < 12; i++) s = reducer(s, { type: 'removeWidget', id: 'w' + i, at: i });
    expect(s.trash).toHaveLength(10);
    expect(s.trash![0]!.widget.id).toBe('w11');
  });
  it('un widget che stava in un contenitore sparito torna al centro della tela', () => {
    let s = start([w('c', { type: 'container' }), w('k', { parent: 'c', x: 5, y: 6, w: 80, h: 60 })]);
    s = reducer(s, { type: 'removeWidget', id: 'k', at: 1 });
    s = reducer(s, { type: 'removeWidget', id: 'c', at: 2 });
    s = reducer(s, { type: 'restoreWidget', id: 'k' });
    expect(s.workspaces[0]!.widgets[0]).toMatchObject({ id: 'k', parent: undefined, x: -40, y: -30 });
  });
  it('si svuota', () => {
    let s = reducer(start([w('a')]), { type: 'removeWidget', id: 'a', at: 1 });
    s = reducer(s, { type: 'emptyTrash' });
    expect(s.trash).toEqual([]);
  });
  it('la rimozione porta con sé l\'ora, uguale in ogni scheda', () => {
    const a = prepare({ type: 'removeWidget', id: 'a' }, start()) as Extract<Action, { type: 'removeWidget' }>;
    expect(a.at).toBeGreaterThan(0);
  });
});

describe('duplica', () => {
  it('copia il contenuto, spostata, senza fissaggio, e in primo piano', () => {
    let s = start([w('a', { x: 10, y: 20, pinned: true, tint: 'red', state: { text: 'x', n: [1] } })]);
    s = reducer(s, { type: 'duplicateWidget', id: 'a', ids: { a: 'b' } });
    const [a, b] = s.workspaces[0]!.widgets;
    expect(b).toMatchObject({ id: 'b', x: 34, y: 44, tint: 'red', pinned: undefined, state: { text: 'x', n: [1] } });
    expect(b!.z).toBeGreaterThan(a!.z);
    expect(b!.state).not.toBe(a!.state);
  });
  it('un contenitore si copia con ciò che contiene', () => {
    let s = start([w('c', { type: 'container' }), w('k', { parent: 'c', x: 3, y: 4 })]);
    s = reducer(s, { type: 'duplicateWidget', id: 'c', ids: { c: 'c2', k: 'k2' } });
    expect(s.workspaces[0]!.widgets.find((x) => x.id === 'k2')).toMatchObject({ parent: 'c2', x: 3, y: 4 });
  });
  it('un task della copia di una lista non resta legato al progresso dell\'originale', () => {
    let s = start([w('t', { type: 'todo', state: { items: [{ id: 'i', text: 'x', done: false, progress: 'p' }] } }), w('p', { type: 'progress', state: { mode: 'manual', value: 0, tasks: [] } })]);
    s = reducer(s, { type: 'duplicateWidget', id: 't', ids: { t: 't2' } });
    expect((s.workspaces[0]!.widgets.find((x) => x.id === 't2')!.state as any).items[0]).toEqual({ id: 'i', text: 'x', done: false });
  });
  it('ogni scheda dà gli stessi id alla copia', () => {
    const a = prepare({ type: 'duplicateWidget', id: 'c' }, start([w('c', { type: 'container' }), w('k', { parent: 'c' })])) as Extract<Action, { type: 'duplicateWidget' }>;
    expect(Object.keys(a.ids!).sort()).toEqual(['c', 'k']);
  });
});

describe('sposta in un altro spazio', () => {
  const two = () => {
    let s = start([w('a', { x: 7 }), w('c', { type: 'container' }), w('k', { parent: 'c' })]);
    s = { ...s, workspaces: [...s.workspaces, { id: 'w2', name: 'due', order: 1, widgets: [w('z')], links: [] }] };
    return s;
  };
  it('porta il widget (e un contenitore con il suo contenuto) nell\'altro spazio', () => {
    let s = reducer(two(), { type: 'moveWidgetToSpace', id: 'a', to: 'w2' });
    expect(ids(s, 0)).toEqual(['c', 'k']);
    expect(ids(s, 1)).toEqual(['z', 'a']);
    expect(s.workspaces[1]!.widgets[1]!.x).toBe(7);
    s = reducer(s, { type: 'moveWidgetToSpace', id: 'c', to: 'w2' });
    expect(ids(s, 0)).toEqual([]);
    expect(ids(s, 1).sort()).toEqual(['a', 'c', 'k', 'z']);
  });
  it('ignora spazi inesistenti, lo stesso spazio e i widget dentro un contenitore', () => {
    const s = two();
    expect(reducer(s, { type: 'moveWidgetToSpace', id: 'a', to: 'nope' })).toEqual(s);
    expect(reducer(s, { type: 'moveWidgetToSpace', id: 'a', to: s.workspaces[0]!.id })).toEqual(s);
    expect(reducer(s, { type: 'moveWidgetToSpace', id: 'k', to: 'w2' })).toEqual(s);
  });
});

describe('annulla e ripeti', () => {
  const run = (s: AppData, h: ReturnType<typeof createHistory>, a: Action, now: number) => { h.record(s, a, now); return reducer(s, a); };

  it('annulla una rimozione e la ripete', () => {
    const h = createHistory();
    let s = start([w('a', { state: { text: 'x' } })]);
    s = run(s, h, { type: 'removeWidget', ws: s.workspaces[0]!.id, id: 'a', at: 1 }, 0);
    const back = h.undo(s)!;
    s = reducer(s, { type: 'setDesk', desks: back });
    expect(ids(s)).toEqual(['a']);
    expect(s.trash).toEqual([]); // non resta nel cestino
    const again = h.redo(s)!;
    s = reducer(s, { type: 'setDesk', desks: again });
    expect(ids(s)).toEqual([]);
  });
  it('una raffica di spostamenti è una sola voce; un nuovo gesto dopo una pausa no', () => {
    const h = createHistory();
    let s = start([w('a')]);
    const ws = s.workspaces[0]!.id;
    for (let i = 1; i <= 5; i++) s = run(s, h, { type: 'updateWidgets', ws, patches: [{ id: 'a', patch: { x: i * 10 } }] }, i * 16);
    s = run(s, h, { type: 'updateWidget', ws, id: 'a', patch: { x: 500 } }, 5000);
    s = reducer(s, { type: 'setDesk', desks: h.undo(s)! });
    expect(s.workspaces[0]!.widgets[0]!.x).toBe(50);
    s = reducer(s, { type: 'setDesk', desks: h.undo(s)! });
    expect(s.workspaces[0]!.widgets[0]!.x).toBe(0);
    expect(h.undo(s)).toBeNull();
    s = reducer(s, { type: 'setDesk', desks: h.redo(s)! });
    expect(s.workspaces[0]!.widgets[0]!.x).toBe(50);
  });
  it('endBurst separa due gesti ravvicinati', () => {
    const h = createHistory();
    let s = start([w('a')]);
    const ws = s.workspaces[0]!.id;
    s = run(s, h, { type: 'updateWidget', ws, id: 'a', patch: { x: 1 } }, 0);
    h.endBurst();
    s = run(s, h, { type: 'updateWidget', ws, id: 'a', patch: { x: 2 } }, 10);
    s = reducer(s, { type: 'setDesk', desks: h.undo(s)! });
    expect(s.workspaces[0]!.widgets[0]!.x).toBe(1);
  });
  it('le modifiche al solo contenuto non finiscono nella cronologia, e non vengono annullate', () => {
    const h = createHistory();
    let s = start([w('a'), w('b')]);
    const ws = s.workspaces[0]!.id;
    s = run(s, h, { type: 'updateWidget', ws, id: 'a', patch: { x: 30 } }, 0);
    s = run(s, h, { type: 'updateWidget', ws, id: 'b', patch: { state: { text: 'scritto dopo' } } }, 5000);
    s = run(s, h, { type: 'bringToFront', ws, id: 'a' }, 6000);
    s = reducer(s, { type: 'setDesk', desks: h.undo(s)! });
    const [a, b] = s.workspaces[0]!.widgets;
    expect(a!.x).toBe(0);
    expect(b!.state).toEqual({ text: 'scritto dopo' });
  });
  it('un contenuto cambiato dopo resta anche se si annulla la rimozione di un altro widget', () => {
    const h = createHistory();
    let s = start([w('a'), w('b')]);
    const ws = s.workspaces[0]!.id;
    s = run(s, h, { type: 'removeWidget', ws, id: 'a', at: 1 }, 0);
    s = reducer(s, { type: 'updateWidget', ws, id: 'b', patch: { state: { text: 'nuovo' } } });
    s = reducer(s, { type: 'setDesk', desks: h.undo(s)! });
    expect(s.workspaces[0]!.widgets.find((x) => x.id === 'b')!.state).toEqual({ text: 'nuovo' });
    expect(ids(s).sort()).toEqual(['a', 'b']);
  });
  it('apertura e chiusura di un contenitore tornano indietro insieme alle posizioni', () => {
    const h = createHistory();
    let s = start([w('c', { type: 'container', state: {} }), w('d', { y: 200 })]);
    const ws = s.workspaces[0]!.id;
    s = run(s, h, { type: 'updateWidgets', ws, patches: [{ id: 'c', patch: { state: { collapsed: true } } }, { id: 'd', patch: { y: 50 } }] }, 0);
    s = reducer(s, { type: 'setDesk', desks: h.undo(s)! });
    expect(s.workspaces[0]!.widgets.find((x) => x.id === 'c')!.state).toEqual({});
    expect(s.workspaces[0]!.widgets.find((x) => x.id === 'd')!.y).toBe(200);
  });
  it('spostare in un altro spazio si annulla in entrambi', () => {
    const h = createHistory();
    let s = start([w('a')]);
    s = { ...s, workspaces: [...s.workspaces, { id: 'w2', name: 'due', order: 1, widgets: [], links: [] }] };
    s = run(s, h, { type: 'moveWidgetToSpace', ws: s.workspaces[0]!.id, id: 'a', to: 'w2' }, 0);
    s = reducer(s, { type: 'setDesk', desks: h.undo(s)! });
    expect(ids(s, 0)).toEqual(['a']);
    expect(ids(s, 1)).toEqual([]);
  });
  it('una nuova azione svuota il "ripeti"', () => {
    const h = createHistory();
    let s = start([w('a')]);
    const ws = s.workspaces[0]!.id;
    s = run(s, h, { type: 'removeWidget', ws, id: 'a', at: 1 }, 0);
    s = reducer(s, { type: 'setDesk', desks: h.undo(s)! });
    expect(h.canRedo).toBe(true);
    s = run(s, h, { type: 'addWidget', ws, widget: w('n') }, 100);
    expect(h.canRedo).toBe(false);
  });
});

describe('ricerca tra i widget', () => {
  it('estrae il testo senza id, immagini e numeri', () => {
    const t = widgetText({ items: [{ id: '3f2b8c1e-aaaa-bbbb-cccc-111122223333', text: 'chiamare Anna', n: 5 }], img: 'data:image/png;base64,AAAA', title: 'Spesa' });
    expect(t).toBe('chiamare Anna Spesa');
  });
  it('trova per testo o nome, senza badare a maiuscole e accenti, in tutti gli spazi', () => {
    let s = start([w('a', { type: 'todo', state: { items: [{ id: 'x', text: 'Chiamare Anna perché sì', done: false }] } }), w('b', { type: 'clock' })]);
    s = { ...s, workspaces: [...s.workspaces, { id: 'w2', name: 'due', order: 1, widgets: [w('c', { type: 'postit', state: { text: 'anna ha detto' } })], links: [] }] };
    const label = (type: string) => (type === 'clock' ? 'Orologio' : type);
    expect(findWidgets(s, 'ANNA', label).map((f) => f.id)).toEqual(['a', 'c']);
    expect(findWidgets(s, 'perche', label)[0]).toMatchObject({ id: 'a', space: s.workspaces[0]!.name });
    expect(findWidgets(s, 'orolo', label).map((f) => f.id)).toEqual(['b']);
    expect(findWidgets(s, '  ', label)).toEqual([]);
  });
});

describe('modelli di spazio', () => {
  const def = (type: string) => (type === 'ghost' ? undefined : { defaultSize: { w: 200, h: 100 }, initialState: () => ({ t: type }) });
  it('dispone i widget in colonne centrate, saltando i tipi sconosciuti', () => {
    let n = 0;
    const list = templateWidgets({ id: 'x', name: 'X', icon: '', columns: [['a', 'b'], ['ghost'], ['c']] }, def, () => 'id' + n++, () => 0);
    expect(list.map((x) => [x.type, x.x, x.y])).toEqual([['a', -208, -108], ['b', -208, 8], ['c', 8, -50]]);
    expect(new Set(list.map((x) => x.id)).size).toBe(3);
  });
  it('ogni modello usa soltanto tipi di widget esistenti', async () => {
    await import('../widgets');
    const { getWidget } = await import('../widgets');
    for (const t of TEMPLATES) for (const type of t.columns.flat()) expect(getWidget(type), `${t.id}: ${type}`).toBeDefined();
  });
  it('addWorkspace crea lo spazio con i widget del modello', () => {
    const s = reducer(createDefaultData(), { type: 'addWorkspace', id: 'n', name: 'Nuovo', widgets: [w('a')] });
    expect(s.workspaces.find((x) => x.id === 'n')!.widgets.map((x) => x.id)).toEqual(['a']);
  });
});

describe('modelli propri', () => {
  const def = (type: string) => (type === 'ghost' ? undefined : { defaultSize: { w: 200, h: 100 }, initialState: () => ({ fresh: type }) });
  const space = () => ({
    widgets: [
      w('c', { type: 'container', x: 10, y: 20, w: 300, h: 200, z: 1, state: { label: 'Lavoro', collapsed: false } }),
      w('n', { type: 'notebook', x: 5, y: 6, w: 100, h: 80, z: 3, parent: 'c', state: { text: 'segreto' } }),
      w('t', { type: 'todo', x: 400, y: 0, z: 2, state: { items: [{ id: 'i', text: 'x', done: false }] } }),
      w('p', { type: 'postit', x: 660, y: 0, z: 4, pinned: true, state: { text: 'fissato' } }),
    ],
    links: [['t', 'p']] as [string, string][],
  });

  it('salva i widget in ordine di sovrapposizione, con contenitori e agganci, senza contenuto', () => {
    const t = templateFromSpace(space(), '  Mio  ', 'id1', false)!;
    expect(t.name).toBe('Mio');
    expect(t.widgets.map((x) => x.type)).toEqual(['container', 'todo', 'notebook', 'postit']);
    expect(t.widgets[2]).toMatchObject({ type: 'notebook', parent: 0, x: 5, y: 6 });
    expect(t.widgets[2]).not.toHaveProperty('state');
    expect(t.widgets[0]).toMatchObject({ label: 'Lavoro' });
    expect(t.links).toEqual([[1, 3]]);
    expect(t.widgets[3]).not.toHaveProperty('pinned');
  });
  it('con il contenuto salva anche gli stati (copie, non riferimenti)', () => {
    const sp = space();
    const t = templateFromSpace(sp, 'X', 'id', true)!;
    expect(t.widgets[2]!.state).toEqual({ text: 'segreto' });
    expect(t.widgets[2]!.state).not.toBe(sp.widgets[1]!.state);
  });
  it('uno spazio vuoto non dà un modello', () => expect(templateFromSpace({ widgets: [] }, 'X', 'id', false)).toBeUndefined());

  it('il modello diventa widget nuovi: id nuovi, contenitori e agganci rimappati, stati iniziali con il nome del contenitore', () => {
    let n = 0;
    const tpl = templateFromSpace(space(), 'Mio', 'id1', false)!;
    const out = buildTemplate({ templates: [tpl] }, 'id1', def, () => 'n' + n++, () => 0)!;
    expect(out.widgets).toHaveLength(4);
    const byType = Object.fromEntries(out.widgets.map((x) => [x.type, x]));
    expect(byType.notebook!.parent).toBe(byType.container!.id);
    expect(byType.container!.state).toEqual({ fresh: 'container', label: 'Lavoro' });
    expect(byType.notebook!.state).toEqual({ fresh: 'notebook' });
    expect(out.links).toEqual([[byType.todo!.id, byType.postit!.id]]);
    expect(new Set(out.widgets.map((x) => x.id)).size).toBe(4);
  });
  it('un tipo che non esiste più si salta, con ciò che conteneva e gli agganci che lo toccavano', () => {
    let n = 0;
    const tpl: CustomTemplate = { id: 'k', name: 'K', widgets: [{ type: 'ghost', x: 0, y: 0, w: 1, h: 1 }, { type: 'postit', x: 0, y: 0, w: 1, h: 1, parent: 0 }, { type: 'todo', x: 5, y: 5, w: 1, h: 1 }, { type: 'clock', x: 9, y: 9, w: 1, h: 1 }], links: [[0, 2], [2, 3]] };
    const out = buildTemplate({ templates: [tpl] }, 'k', def, () => 'n' + n++, () => 0)!;
    expect(out.widgets.map((x) => x.type)).toEqual(['todo', 'clock']);
    expect(out.links).toHaveLength(1);
  });
  it('i modelli di serie e quelli propri si elencano; quelli tolti no', () => {
    const tr = (s: string) => s.toUpperCase();
    const d = { templates: [{ id: 'm', name: 'Mio', widgets: [{ type: 'postit', x: 0, y: 0, w: 1, h: 1 }] }], hiddenTemplates: ['study'] };
    const list = listTemplates(d, tr);
    expect(list.map((e) => e.id)).toEqual(['planning', 'wellbeing', 'focus', 'm']);
    expect(list[0]).toMatchObject({ name: 'PLANNING', custom: false });
    expect(list[3]).toMatchObject({ name: 'Mio', custom: true });
    expect(buildTemplate(d, 'study', def, () => 'x', () => 0)).toBeUndefined();
    expect(buildTemplate(d, 'planning', def, () => 'x', () => 0)!.widgets.length).toBeGreaterThan(0);
  });

  it('salvare, eliminare (di serie e propri) e rimettere i modelli', () => {
    const tpl: CustomTemplate = { id: 'm', name: 'Mio', widgets: [{ type: 'postit', x: 0, y: 0, w: 1, h: 1 }] };
    let s = reducer(createDefaultData(), { type: 'saveTemplate', template: tpl });
    expect(s.templates).toEqual([tpl]);
    expect(reducer(s, { type: 'saveTemplate', template: tpl }).templates).toHaveLength(1); // stesso id: una volta sola
    s = reducer(s, { type: 'deleteTemplate', id: 'study' });
    s = reducer(s, { type: 'deleteTemplate', id: 'study' });
    expect(s.hiddenTemplates).toEqual(['study']);
    s = reducer(s, { type: 'deleteTemplate', id: 'm' });
    expect(s.templates).toEqual([]);
    expect(s.hiddenTemplates).toEqual(['study']); // eliminare uno proprio non nasconde nulla
    s = reducer(s, { type: 'restoreTemplates' });
    expect(s.hiddenTemplates).toEqual([]);
  });
  it('non si superano i modelli massimi', () => {
    let s = createDefaultData();
    for (let i = 0; i < MAX_CUSTOM_TEMPLATES + 3; i++) s = reducer(s, { type: 'saveTemplate', template: { id: 't' + i, name: 'T', widgets: [{ type: 'postit', x: 0, y: 0, w: 1, h: 1 }] } });
    expect(s.templates).toHaveLength(MAX_CUSTOM_TEMPLATES);
  });
  it('addWorkspace porta anche gli agganci', () => {
    const s = reducer(createDefaultData(), { type: 'addWorkspace', id: 'n', widgets: [w('a'), w('b')], links: [['a', 'b']] });
    expect(s.workspaces.find((x) => x.id === 'n')!.links).toEqual([['a', 'b']]);
  });
  it('i modelli letti dal disco si ripuliscono: scartati quelli rotti, indici e id di serie validi', () => {
    const ok = { id: 'ok', name: 'Ok', widgets: [{ type: 'postit', x: 0, y: 0, w: 1, h: 1 }, { type: 'todo', x: 1, y: 1, w: 1, h: 1, parent: 0 }], links: [[0, 1], [0, 5], 'x'] };
    const broken = { id: 'b', name: 'B', widgets: [{ type: 'postit', x: 0, y: 0, w: 1, h: 1 }, { type: 'todo', x: 'no', y: 1, w: 1, h: 1 }] };
    const d = migrate({ version: 4, activeWorkspaceId: 'a', templates: [ok, broken, { id: 'ok', name: 'dup', widgets: ok.widgets }, null, { id: 'z' }], hiddenTemplates: ['study', 'study', 'nope', 5], workspaces: [{ id: 'a', name: 'x', order: 0, widgets: [] }] } as any);
    expect(d.templates!.map((t) => t.id)).toEqual(['ok']);
    expect(d.templates![0]!.links).toEqual([[0, 1]]);
    expect(d.hiddenTemplates).toEqual(['study']);
  });
});
