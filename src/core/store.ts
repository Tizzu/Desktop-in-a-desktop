import { BAR_H } from './layout';
import type { AppData, Link, Settings, WidgetInstance, Workspace } from './types';

export type Action =
  | { type: 'load'; data: AppData }
  // Sostituisce tutto con i dati importati; ogni scheda tiene lo spazio e il cassetto che sta guardando.
  | { type: 'import'; data: AppData }
  // Id, nome, ordine e `activate` vengono decisi da chi invia l'azione, così ogni scheda ottiene lo stesso risultato.
  | { type: 'addWorkspace'; id?: string; name?: string; order?: number; activate?: boolean }
  | { type: 'renameWorkspace'; id: string; name: string }
  | { type: 'removeWorkspace'; id: string }
  | { type: 'setActive'; id: string }
  | { type: 'setSettings'; patch: Partial<Settings> }
  // `ws` indica lo spazio su cui agire (di default quello attivo): serve perché le schede possono guardare spazi diversi.
  | { type: 'addWidget'; ws?: string; widget: Omit<WidgetInstance, 'z'> }
  | { type: 'updateWidget'; ws?: string; id: string; patch: Partial<Omit<WidgetInstance, 'id' | 'type'>> }
  | { type: 'updateWidgets'; ws?: string; patches: { id: string; patch: Partial<Omit<WidgetInstance, 'id' | 'type'>> }[] }
  | { type: 'removeWidget'; ws?: string; id: string }
  | { type: 'link'; ws?: string; pairs: Link[] }
  | { type: 'unlink'; ws?: string; pairs: Link[] }
  | { type: 'bringToFront'; ws?: string; id: string };

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

const maxZ = (w: Workspace) => w.widgets.reduce((m, x) => Math.max(m, x.z), 0);

export function reducer(s: AppData, a: Action): AppData {
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
        workspaces: [...s.workspaces, { id, name: a.name ?? `Space ${order + 1}`, order, widgets: [], links: [] }],
      };
    }
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
    case 'updateWidget':
      return mapWorkspace(s, a.ws, (w) => apply(w, [{ id: a.id, patch: a.patch }]));
    case 'updateWidgets':
      return mapWorkspace(s, a.ws, (w) => apply(w, a.patches));
    case 'removeWidget':
      return mapWorkspace(s, a.ws, (w) => {
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
    case 'link':
      return mapWorkspace(s, a.ws, (w) => {
        const links = [...(w.links ?? [])];
        const ids = new Set(w.widgets.map((x) => x.id));
        for (const p of a.pairs) if (p[0] !== p[1] && ids.has(p[0]) && ids.has(p[1]) && !links.some((l) => sameLink(l, p))) links.push(p);
        return { ...w, links };
      });
    case 'unlink':
      return mapWorkspace(s, a.ws, (w) => ({ ...w, links: (w.links ?? []).filter((l) => !a.pairs.some((p) => sameLink(l, p))) }));
    case 'bringToFront':
      return mapWorkspace(s, a.ws, (w) => {
        const target = w.widgets.find((x) => x.id === a.id);
        if (!target || target.z === maxZ(w)) return w;
        return { ...w, widgets: w.widgets.map((x) => (x.id === a.id ? { ...x, z: maxZ(w) + 1 } : x)) };
      });
  }
}
