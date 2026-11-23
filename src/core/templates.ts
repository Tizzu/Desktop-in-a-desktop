import type { AppData, CustomTemplate, Link, TemplateWidget, WidgetInstance, Workspace } from './types';

/** Un modello di spazio: colonne di widget (dall'alto in basso), disposte a partire dal centro della tela. */
export interface SpaceTemplate {
  id: string;
  /** Nome (in inglese, passa da `t()`): è anche il nome dello spazio creato. */
  name: string;
  icon: string;
  columns: string[][];
}

export const TEMPLATES: SpaceTemplate[] = [
  { id: 'study', name: 'Study day', icon: '📚', columns: [['todo', 'countdown'], ['pomodoro', 'progress'], ['notebook']] },
  { id: 'planning', name: 'Planning', icon: '🗓️', columns: [['calendar', 'goal'], ['agenda'], ['kanban']] },
  { id: 'wellbeing', name: 'Wellbeing', icon: '🌿', columns: [['habits', 'water'], ['mood', 'breathing'], ['gratitude']] },
  { id: 'focus', name: 'Deep focus', icon: '🎯', columns: [['pomodoro', 'todo'], ['postit', 'ambient']] },
];

const GAP = 16;

/**
 * Widget di un modello, disposti in colonne centrate sulla tela. Le misure e lo stato iniziale vengono dai widget
 * registrati (`def`); i tipi sconosciuti si saltano. `id` e `rot` li decide chi chiama, così ogni scheda ottiene lo stesso risultato.
 */
export function templateWidgets(
  tpl: SpaceTemplate,
  def: (type: string) => { defaultSize: { w: number; h: number }; initialState: () => unknown } | undefined,
  id: () => string,
  rot: () => number,
): WidgetInstance[] {
  const columns = tpl.columns
    .map((col) => col.flatMap((type) => { const d = def(type); return d ? [{ type, d }] : []; }))
    .filter((col) => col.length > 0);
  const widths = columns.map((col) => Math.max(...col.map((c) => c.d.defaultSize.w)));
  const total = widths.reduce((n, w) => n + w, 0) + GAP * (columns.length - 1);
  const out: WidgetInstance[] = [];
  let x = -total / 2;
  columns.forEach((col, ci) => {
    const height = col.reduce((n, c) => n + c.d.defaultSize.h, 0) + GAP * (col.length - 1);
    let y = -height / 2;
    for (const c of col) {
      out.push({ id: id(), type: c.type, x: Math.round(x), y: Math.round(y), ...c.d.defaultSize, z: out.length + 1, rot: rot(), state: c.d.initialState() });
      y += c.d.defaultSize.h + GAP;
    }
    x += widths[ci]! + GAP;
  });
  return out;
}

type Def = (type: string) => { defaultSize: { w: number; h: number }; initialState: () => unknown } | undefined;

/** Un modello come lo si mostra in un elenco: quelli di serie (col nome tradotto) e quelli dell'utente. */
export interface TemplateEntry { id: string; name: string; icon: string; custom: boolean; /** Quanti widget contiene. */ count: number }

/** I modelli disponibili: quelli di serie non tolti, poi quelli propri. `tr` traduce i nomi di serie. */
export function listTemplates(d: Pick<AppData, 'templates' | 'hiddenTemplates'>, tr: (text: string) => string): TemplateEntry[] {
  const hidden = new Set(d.hiddenTemplates ?? []);
  return [
    ...TEMPLATES.filter((x) => !hidden.has(x.id)).map((x) => ({ id: x.id, name: tr(x.name), icon: x.icon, custom: false, count: x.columns.flat().length })),
    ...(d.templates ?? []).map((x) => ({ id: x.id, name: x.name, icon: '⭐', custom: true, count: x.widgets.length })),
  ];
}

/** Widget e agganci con cui riempire un nuovo spazio dal modello `id`; undefined se il modello non c'è (più). */
export function buildTemplate(
  d: Pick<AppData, 'templates' | 'hiddenTemplates'>,
  id: string,
  def: Def,
  newId: () => string,
  rot: () => number,
): { widgets: WidgetInstance[]; links: Link[] } | undefined {
  const base = TEMPLATES.find((x) => x.id === id);
  if (base && !(d.hiddenTemplates ?? []).includes(id)) return { widgets: templateWidgets(base, def, newId, rot), links: [] };
  const custom = (d.templates ?? []).find((x) => x.id === id);
  return custom && instantiate(custom, def, newId, rot);
}

/** Un modello dell'utente diventa widget nuovi (con id nuovi). I tipi che non esistono più, e ciò che contenevano, si saltano. */
function instantiate(tpl: CustomTemplate, def: Def, newId: () => string, rot: () => number) {
  const ids = tpl.widgets.map(() => newId());
  const skip = new Set<number>();
  tpl.widgets.forEach((w, i) => { if (!def(w.type)) skip.add(i); });
  tpl.widgets.forEach((w, i) => { if (w.parent !== undefined && skip.has(w.parent)) skip.add(i); });
  const widgets: WidgetInstance[] = [];
  tpl.widgets.forEach((w, i) => {
    if (skip.has(i)) return;
    const d = def(w.type)!;
    const state = w.state !== undefined ? structuredClone(w.state) : { ...(d.initialState() as object), ...(w.label ? { label: w.label } : {}) };
    widgets.push({ id: ids[i]!, type: w.type, x: w.x, y: w.y, w: w.w, h: w.h, z: widgets.length + 1, rot: w.parent === undefined ? rot() : 0, parent: w.parent === undefined ? undefined : ids[w.parent], state });
  });
  const links = (tpl.links ?? []).filter(([a, b]) => !skip.has(a) && !skip.has(b)).map(([a, b]): Link => [ids[a]!, ids[b]!]);
  return { widgets, links };
}

/**
 * Salva uno spazio come modello: i widget con misure e posizioni, i contenitori con ciò che contengono, gli agganci.
 * Senza `keepContent` i widget ripartono vuoti (restano solo i nomi dei contenitori). Gli spazi vuoti non danno un modello.
 */
export function templateFromSpace(space: Pick<Workspace, 'widgets' | 'links'>, name: string, id: string, keepContent: boolean): CustomTemplate | undefined {
  const list = [...space.widgets].sort((a, b) => a.z - b.z); // l'ordine di sovrapposizione resta
  if (!list.length) return undefined;
  const index = new Map(list.map((x, i) => [x.id, i]));
  const widgets: TemplateWidget[] = list.map((x) => {
    const label = (x.state as { label?: unknown } | null)?.label;
    return {
      type: x.type, x: x.x, y: x.y, w: x.w, h: x.h,
      ...(x.parent !== undefined && index.has(x.parent) ? { parent: index.get(x.parent) } : {}),
      ...(keepContent ? { state: structuredClone(x.state) } : typeof label === 'string' && label ? { label } : {}),
    };
  });
  const links = (space.links ?? []).filter(([a, b]) => index.has(a) && index.has(b)).map(([a, b]): [number, number] => [index.get(a)!, index.get(b)!]);
  return { id, name: name.trim().slice(0, 60), widgets, ...(links.length ? { links } : {}) };
}
