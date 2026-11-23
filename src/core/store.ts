import { BAR_H } from './layout';
import { relinkTasks } from './tasklink';
import { TEMPLATES } from './templates';
import { MAX_CUSTOM_TEMPLATES, TRASH_LIMIT, type AppData, type CustomTemplate, type Link, type Settings, type SpaceOverrides, type WidgetInstance, type Workspace } from './types';

export type Action =
  | { type: 'load'; data: AppData }
  // Sostituisce tutto con i dati importati; ogni scheda tiene lo spazio e il cassetto che sta guardando.
  | { type: 'import'; data: AppData }
  // Id, nome, ordine e `activate` vengono decisi da chi invia l'azione, così ogni scheda ottiene lo stesso risultato.
  // `widgets` (con il loro `z`) servono a creare uno spazio da un modello.
  | { type: 'addWorkspace'; id?: string; name?: string; order?: number; activate?: boolean; widgets?: WidgetInstance[]; links?: Link[] }
  // Modelli di spazio: salvarne uno, toglierne uno (di serie o proprio), rimettere quelli di serie tolti.
  | { type: 'saveTemplate'; template: CustomTemplate }
  | { type: 'deleteTemplate'; id: string }
  | { type: 'restoreTemplates' }
  | { type: 'renameWorkspace'; id: string; name: string }
  | { type: 'removeWorkspace'; id: string }
  | { type: 'setActive'; id: string }
  | { type: 'setSettings'; patch: Partial<Settings> }
  // `ws` indica lo spazio su cui agire (di default quello attivo): serve perché le schede possono guardare spazi diversi.
  | { type: 'addWidget'; ws?: string; widget: Omit<WidgetInstance, 'z'> }
  | { type: 'updateWidget'; ws?: string; id: string; patch: Partial<Omit<WidgetInstance, 'id' | 'type'>> }
  | { type: 'updateWidgets'; ws?: string; patches: { id: string; patch: Partial<Omit<WidgetInstance, 'id' | 'type'>> }[] }
  // `at` (ora della rimozione) lo decide chi invia l'azione; il widget finisce nel cestino.
  | { type: 'removeWidget'; ws?: string; id: string; at?: number }
  // Rimette nello spazio `ws` un widget del cestino.
  | { type: 'restoreWidget'; ws?: string; id: string }
  | { type: 'emptyTrash' }
  // Copia un widget (e, se è un contenitore, quello che contiene). `ids` associa ogni id copiato al nuovo id: lo decide chi invia.
  | { type: 'duplicateWidget'; ws?: string; id: string; ids?: Record<string, string> }
  // Porta un widget (con ciò che contiene) in un altro spazio, nella stessa posizione.
  | { type: 'moveWidgetToSpace'; ws?: string; id: string; to: string }
  // Rimette la scrivania com'era (annulla/ripeti): posizioni, agganci e widget presenti; il contenuto dei widget che esistono ancora resta quello di ora.
  | { type: 'setDesk'; desks: Desk[] }
  // Aggiunge un widget Progresso e lo collega al task `item` della lista `todo`; `link` lo aggancia anche alla lista.
  | { type: 'addLinkedProgress'; ws?: string; todo: string; item: string; widget: Omit<WidgetInstance, 'z'>; link?: boolean }
  | { type: 'link'; ws?: string; pairs: Link[] }
  | { type: 'unlink'; ws?: string; pairs: Link[] }
  | { type: 'bringToFront'; ws?: string; id: string }
  // Impostazioni proprie di uno spazio: `null` toglie quella dello spazio e torna a valere la globale.
  | { type: 'setSpace'; ws?: string; patch: { tilt?: number | null; searchBar?: boolean | null; locked?: boolean; privacy?: boolean } };

/** La disposizione di uno spazio: i widget e gli agganci (vedi history.ts). */
export interface Desk { ws: string; widgets: WidgetInstance[]; links: Link[] }

const mapWorkspace = (s: AppData, ws: string | undefined, fn: (w: Workspace) => Workspace): AppData => {
  const target = ws ?? s.activeWorkspaceId;
  return { ...s, workspaces: s.workspaces.map((w) => (w.id === target ? fn(w) : w)) };
};

const sameLink = (l: Link, [a, b]: Link) => (l[0] === a && l[1] === b) || (l[0] === b && l[1] === a);

const apply = (w: Workspace, patches: { id: string; patch: Partial<Omit<WidgetInstance, 'id' | 'type'>> }[]): Workspace => {
  const byId = new Map(patches.map((p) => [p.id, p.patch]));
  // Un widget che entra in un contenitore non può restare agganciato agli altri.
  const entering = new Set(patches.filter((p) => p.patch.parent).map((p) => p.id));
  return {
    ...w,
    widgets: w.widgets.map((x) => (byId.has(x.id) ? { ...x, ...byId.get(x.id) } : x)),
    links: entering.size ? (w.links ?? []).filter((l) => !entering.has(l[0]) && !entering.has(l[1])) : w.links,
  };
};

/** Spostamento (px) della copia di un widget rispetto all'originale. */
export const DUP_OFFSET = 24;

const cloneState = (x: WidgetInstance): unknown => {
  const state = structuredClone(x.state);
  // Un task collegato a un widget Progresso resterebbe collegato al suo (due task per un solo progresso): la copia è una lista normale.
  const items = (state as { items?: unknown } | null)?.items;
  if (x.type === 'todo' && Array.isArray(items)) {
    return { ...(state as object), items: items.map((i: { progress?: unknown }) => { if (!i || typeof i !== 'object') return i; const { progress: _p, ...rest } = i; return rest; }) };
  }
  return state;
};

/** Contenuto di un widget che esiste ancora: resta quello di ora, tranne l'apertura/chiusura di un contenitore. */
const mergeState = (current: unknown, before: unknown): unknown => {
  const c = current as Record<string, unknown> | null, b = before as Record<string, unknown> | null;
  if (!c || typeof c !== 'object' || !b || typeof b !== 'object' || c.collapsed === b.collapsed) return current;
  const { collapsed: _c, ...rest } = c;
  return b.collapsed === undefined ? rest : { ...rest, collapsed: b.collapsed };
};

const maxZ = (w: Workspace) => w.widgets.reduce((m, x) => Math.max(m, x.z), 0);

/** Le azioni che possono cambiare un widget Progresso o un task collegato. */
const TOUCHES_WIDGETS = new Set<Action['type']>(['import', 'addWorkspace', 'addWidget', 'updateWidget', 'updateWidgets', 'removeWidget', 'addLinkedProgress', 'restoreWidget', 'duplicateWidget', 'moveWidgetToSpace', 'setDesk']);

export function reducer(s: AppData, a: Action): AppData {
  const next = baseReducer(s, a);
  if (!TOUCHES_WIDGETS.has(a.type)) return next;
  let changed = false;
  const workspaces = next.workspaces.map((w) => {
    const r = relinkTasks(w);
    if (r !== w) changed = true;
    return r;
  });
  return changed ? { ...next, workspaces } : next;
}

function baseReducer(s: AppData, a: Action): AppData {
  switch (a.type) {
    case 'load':
      return a.data;
    case 'import':
      return {
        ...a.data,
        activeWorkspaceId: a.data.workspaces.some((w) => w.id === s.activeWorkspaceId) ? s.activeWorkspaceId : a.data.activeWorkspaceId,
        settings: { ...a.data.settings, activeCategory: s.settings.activeCategory },
      };
    case 'addWorkspace': {
      const id = a.id ?? crypto.randomUUID();
      const order = a.order ?? s.workspaces.reduce((m, w) => Math.max(m, w.order), -1) + 1;
      return {
        ...s,
        activeWorkspaceId: a.activate === false ? s.activeWorkspaceId : id,
        workspaces: [...s.workspaces, { id, name: a.name ?? `Space ${order + 1}`, order, widgets: a.widgets ?? [], links: a.links ?? [] }],
      };
    }
    case 'saveTemplate': {
      const have = s.templates ?? [];
      if (have.length >= MAX_CUSTOM_TEMPLATES || have.some((t) => t.id === a.template.id)) return s;
      return { ...s, templates: [...have, a.template] };
    }
    case 'deleteTemplate':
      if (TEMPLATES.some((t) => t.id === a.id)) return (s.hiddenTemplates ?? []).includes(a.id) ? s : { ...s, hiddenTemplates: [...(s.hiddenTemplates ?? []), a.id] };
      return { ...s, templates: (s.templates ?? []).filter((t) => t.id !== a.id) };
    case 'restoreTemplates':
      return s.hiddenTemplates?.length ? { ...s, hiddenTemplates: [] } : s;
    case 'renameWorkspace':
      return { ...s, workspaces: s.workspaces.map((w) => (w.id === a.id ? { ...w, name: a.name } : w)) };
    case 'removeWorkspace': {
      if (s.workspaces.length <= 1) return s;
      const workspaces = s.workspaces.filter((w) => w.id !== a.id);
      const activeWorkspaceId =
        s.activeWorkspaceId === a.id ? workspaces[0]!.id : s.activeWorkspaceId;
      return { ...s, workspaces, activeWorkspaceId };
    }
    case 'setActive':
      return { ...s, activeWorkspaceId: a.id };
    case 'setSettings':
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case 'addWidget':
      return mapWorkspace(s, a.ws, (w) => ({ ...w, widgets: [...w.widgets, { ...a.widget, z: maxZ(w) + 1 }] }));
    case 'addLinkedProgress':
      return mapWorkspace(s, a.ws, (w) => {
        const todo = w.widgets.find((x) => x.id === a.todo && x.type === 'todo');
        const items = (todo?.state as { items?: { id: string }[] } | undefined)?.items;
        if (!todo || !Array.isArray(items) || !items.some((i) => i.id === a.item) || w.widgets.some((x) => x.id === a.widget.id)) return w;
        const widgets = w.widgets.map((x) =>
          x === todo ? { ...x, state: { ...(x.state as object), items: items.map((i) => (i.id === a.item ? { ...i, progress: a.widget.id } : i)) } } : x,
        );
        const links = a.link ? [...(w.links ?? []), [a.todo, a.widget.id] as Link] : w.links;
        return { ...w, widgets: [...widgets, { ...a.widget, z: maxZ(w) + 1 }], links };
      });
    case 'updateWidget':
      return mapWorkspace(s, a.ws, (w) => apply(w, [{ id: a.id, patch: a.patch }]));
    case 'updateWidgets':
      return mapWorkspace(s, a.ws, (w) => apply(w, a.patches));
    case 'removeWidget': {
      const home = s.workspaces.find((w) => w.id === (a.ws ?? s.activeWorkspaceId));
      const gone = home?.widgets.find((x) => x.id === a.id);
      const next = mapWorkspace(s, a.ws, (w) => {
        const gone = w.widgets.find((x) => x.id === a.id);
        return {
          ...w,
          // I widget di un contenitore rimosso passano sulla tela, dove si trovava il contenitore: non si perdono.
          widgets: w.widgets
            .filter((x) => x.id !== a.id)
            .map((x) => (gone && x.parent === a.id ? { ...x, parent: undefined, x: gone.x + x.x, y: gone.y + BAR_H + x.y } : x)),
          links: (w.links ?? []).filter((l) => l[0] !== a.id && l[1] !== a.id),
        };
      });
      if (!gone || !home) return next;
      return { ...next, trash: [{ widget: gone, space: home.id, at: a.at ?? 0 }, ...(s.trash ?? [])].slice(0, TRASH_LIMIT) };
    }
    case 'restoreWidget': {
      const entry = (s.trash ?? []).find((t) => t.widget.id === a.id);
      if (!entry) return s;
      const next = mapWorkspace(s, a.ws, (w) => {
        if (w.widgets.some((x) => x.id === a.id)) return w;
        const w0 = entry.widget;
        // Dentro il suo contenitore solo se c'è ancora; altrimenti sulla tela, al centro (le coordinate erano relative al contenitore).
        const parent = w0.parent && w.widgets.some((x) => x.id === w0.parent) ? w0.parent : undefined;
        const at = parent || !w0.parent ? { x: w0.x, y: w0.y } : { x: -Math.round(w0.w / 2), y: -Math.round(w0.h / 2) };
        return { ...w, widgets: [...w.widgets, { ...w0, ...at, parent, pinned: undefined, z: maxZ(w) + 1 }] };
      });
      return { ...next, trash: (s.trash ?? []).filter((t) => t.widget.id !== a.id) };
    }
    case 'emptyTrash':
      return s.trash?.length ? { ...s, trash: [] } : s;
    case 'duplicateWidget':
      return mapWorkspace(s, a.ws, (w) => {
        const src = w.widgets.find((x) => x.id === a.id);
        if (!src) return w;
        const fresh = (id: string) => a.ids?.[id] ?? crypto.randomUUID();
        const copyId = fresh(src.id);
        // Il contenitore si copia con ciò che contiene; la copia sta un po' spostata, per non nascondere l'originale.
        const kids = w.widgets.filter((x) => x.parent === src.id);
        const clone = (x: WidgetInstance, over: Partial<WidgetInstance>): WidgetInstance => ({ ...x, ...over, pinned: undefined, state: cloneState(x) });
        const copies = [
          clone(src, { id: copyId, x: src.x + DUP_OFFSET, y: src.y + DUP_OFFSET, z: maxZ(w) + 1 }),
          ...kids.map((k, i) => clone(k, { id: fresh(k.id), parent: copyId, z: maxZ(w) + 2 + i })),
        ];
        return { ...w, widgets: [...w.widgets, ...copies] };
      });
    case 'moveWidgetToSpace': {
      const from = s.workspaces.find((w) => w.id === (a.ws ?? s.activeWorkspaceId));
      const target = s.workspaces.find((w) => w.id === a.to);
      const moving = from?.widgets.find((x) => x.id === a.id);
      if (!from || !target || !moving || from.id === target.id) return s;
      // Chi sta dentro un contenitore, da solo, non ha un posto fuori: si sposta il contenitore con ciò che contiene.
      if (moving.parent) return s;
      const family = new Set([a.id, ...from.widgets.filter((x) => x.parent === a.id).map((x) => x.id)]);
      return {
        ...s,
        workspaces: s.workspaces.map((w) => {
          if (w.id === from.id) return { ...w, widgets: w.widgets.filter((x) => !family.has(x.id)), links: (w.links ?? []).filter((l) => !family.has(l[0]) && !family.has(l[1])) };
          if (w.id !== target.id) return w;
          const top = maxZ(w);
          return { ...w, widgets: [...w.widgets, ...from.widgets.filter((x) => family.has(x.id)).map((x, i) => ({ ...x, z: top + 1 + i }))] };
        }),
      };
    }
    case 'setDesk': {
      let trash = s.trash;
      const workspaces = s.workspaces.map((w) => {
        const desk = a.desks.find((d) => d.ws === w.id);
        if (!desk) return w;
        const now = new Map(w.widgets.map((x) => [x.id, x]));
        const widgets = desk.widgets.map((x) => {
          const cur = now.get(x.id);
          if (!cur) return x; // un widget tornato in vita: com'era
          // Sposta e ridimensiona come prima, ma il contenuto (e l'ordine di sovrapposizione) restano quelli di ora; vale solo "chiuso/aperto".
          return { ...x, z: cur.z, state: mergeState(cur.state, x.state) };
        });
        // Un widget tornato dal cestino non ci deve restare.
        if (trash?.length) trash = trash.filter((t) => !(t.space === w.id && widgets.some((x) => x.id === t.widget.id)));
        return { ...w, widgets, links: desk.links };
      });
      return { ...s, workspaces, trash };
    }
    case 'link':
      return mapWorkspace(s, a.ws, (w) => {
        const links = [...(w.links ?? [])];
        const ids = new Set(w.widgets.map((x) => x.id));
        for (const p of a.pairs) if (p[0] !== p[1] && ids.has(p[0]) && ids.has(p[1]) && !links.some((l) => sameLink(l, p))) links.push(p);
        return { ...w, links };
      });
    case 'unlink':
      return mapWorkspace(s, a.ws, (w) => ({ ...w, links: (w.links ?? []).filter((l) => !a.pairs.some((p) => sameLink(l, p))) }));
    case 'setSpace':
      return mapWorkspace(s, a.ws, (w) => {
        const overrides: SpaceOverrides = { ...w.overrides };
        if ('tilt' in a.patch) {
          if (a.patch.tilt == null) delete overrides.tilt;
          else overrides.tilt = Math.max(0, Math.min(1, a.patch.tilt));
        }
        if ('searchBar' in a.patch) {
          if (a.patch.searchBar == null) delete overrides.searchBar;
          else overrides.searchBar = a.patch.searchBar;
        }
        return { ...w, overrides: Object.keys(overrides).length ? overrides : undefined, locked: a.patch.locked ?? w.locked, privacy: a.patch.privacy === undefined ? w.privacy : a.patch.privacy || undefined };
      });
    case 'bringToFront':
      return mapWorkspace(s, a.ws, (w) => {
        const target = w.widgets.find((x) => x.id === a.id);
        if (!target || target.z === maxZ(w)) return w;
        return { ...w, widgets: w.widgets.map((x) => (x.id === a.id ? { ...x, z: maxZ(w) + 1 } : x)) };
      });
  }
}
