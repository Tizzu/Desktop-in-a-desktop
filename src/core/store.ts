import type { AppData, Settings, WidgetInstance, Workspace } from './types';

export type Action =
  | { type: 'load'; data: AppData }
  // Id, nome, ordine e `activate` vengono decisi da chi invia l'azione, così ogni scheda ottiene lo stesso risultato.
  | { type: 'addWorkspace'; id?: string; name?: string; order?: number; activate?: boolean }
  | { type: 'renameWorkspace'; id: string; name: string }
  | { type: 'removeWorkspace'; id: string }
  | { type: 'setActive'; id: string }
  | { type: 'setSettings'; patch: Partial<Settings> }
  // `ws` indica lo spazio su cui agire (di default quello attivo): serve perché le schede possono guardare spazi diversi.
  | { type: 'addWidget'; ws?: string; widget: Omit<WidgetInstance, 'z'> }
  | { type: 'updateWidget'; ws?: string; id: string; patch: Partial<Omit<WidgetInstance, 'id' | 'type'>> }
  | { type: 'removeWidget'; ws?: string; id: string }
  | { type: 'bringToFront'; ws?: string; id: string };

const mapWorkspace = (s: AppData, ws: string | undefined, fn: (w: Workspace) => Workspace): AppData => {
  const target = ws ?? s.activeWorkspaceId;
  return { ...s, workspaces: s.workspaces.map((w) => (w.id === target ? fn(w) : w)) };
};

const maxZ = (w: Workspace) => w.widgets.reduce((m, x) => Math.max(m, x.z), 0);

export function reducer(s: AppData, a: Action): AppData {
  switch (a.type) {
    case 'load':
      return a.data;
    case 'addWorkspace': {
      const id = a.id ?? crypto.randomUUID();
      const order = a.order ?? s.workspaces.reduce((m, w) => Math.max(m, w.order), -1) + 1;
      return {
        ...s,
        activeWorkspaceId: a.activate === false ? s.activeWorkspaceId : id,
        workspaces: [...s.workspaces, { id, name: a.name ?? `Spazio ${order + 1}`, order, widgets: [] }],
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
      return mapWorkspace(s, a.ws, (w) => ({
        ...w,
        widgets: w.widgets.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)),
      }));
    case 'removeWidget':
      return mapWorkspace(s, a.ws, (w) => ({ ...w, widgets: w.widgets.filter((x) => x.id !== a.id) }));
    case 'bringToFront':
      return mapWorkspace(s, a.ws, (w) => {
        const target = w.widgets.find((x) => x.id === a.id);
        if (!target || target.z === maxZ(w)) return w;
        return { ...w, widgets: w.widgets.map((x) => (x.id === a.id ? { ...x, z: maxZ(w) + 1 } : x)) };
      });
  }
}
