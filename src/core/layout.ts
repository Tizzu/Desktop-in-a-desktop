import { tiltExtent, type Rect } from './physics';
import type { Link, WidgetInstance } from './types';

/** Altezza della barra del titolo: il corpo di un widget (e quindi l'area di un contenitore) comincia sotto. */
export const BAR_H = 30;
/** Distanza (px) entro cui un lato si aggancia a quello di un altro widget. */
export const SNAP = 12;
/** Lunghezza minima (px) del tratto di lato in comune perché due widget si considerino agganciati. */
export const MIN_OVERLAP = 24;
const TOUCH = 2;

/** Vero se il widget è un contenitore chiuso (ridotto alla sola barra, con i suoi widget nascosti). */
export const isCollapsed = (w: WidgetInstance) => (w.state as { collapsed?: unknown } | null)?.collapsed === true;

export interface View { w: number; h: number }
export type Point = { x: number; y: number };

export interface Placed extends Rect {
  /** Ordine di sovrapposizione (indice, non lo `z` salvato): i widget di un contenitore stanno subito sopra di lui. */
  z: number;
  /** Margine (px) di cui la rotazione fa sporgere il riquadro. */
  ext: Point;
  /** Vero se sta dentro un contenitore. */
  child: boolean;
  /** Vero se è agganciato ad altri. */
  linked: boolean;
  /** Vero se va disegnato inclinato: solo i widget liberi sulla tela. */
  tilted: boolean;
}

const overlapX = (a: Rect, b: Rect) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
const overlapY = (a: Rect, b: Rect) => Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

/** Punto di attacco (a metà del tratto di lato in comune) se i due riquadri si toccano per un lato, altrimenti null. */
export function contact(a: Rect, b: Rect): Point | null {
  if (overlapY(a, b) >= MIN_OVERLAP) {
    const r = Math.abs(a.x + a.w - b.x), l = Math.abs(b.x + b.w - a.x);
    if (r <= TOUCH || l <= TOUCH) return { x: r <= l ? (a.x + a.w + b.x) / 2 : (b.x + b.w + a.x) / 2, y: Math.max(a.y, b.y) + overlapY(a, b) / 2 };
  }
  if (overlapX(a, b) >= MIN_OVERLAP) {
    const d = Math.abs(a.y + a.h - b.y), u = Math.abs(b.y + b.h - a.y);
    if (d <= TOUCH || u <= TOUCH) return { x: Math.max(a.x, b.x) + overlapX(a, b) / 2, y: d <= u ? (a.y + a.h + b.y) / 2 : (b.y + b.h + a.y) / 2 };
  }
  return null;
}

/** Gruppi di widget uniti da agganci: per ogni id, tutti i membri del suo gruppo (se stesso compreso). */
export function groupsOf(ids: string[], links: Link[]): Map<string, string[]> {
  const parent = new Map(ids.map((i) => [i, i]));
  const find = (i: string): string => {
    while (parent.get(i) !== i) { parent.set(i, parent.get(parent.get(i)!)!); i = parent.get(i)!; }
    return i;
  };
  for (const [a, b] of links) if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b));
  const byRoot = new Map<string, string[]>();
  for (const i of ids) {
    const r = find(i);
    byRoot.set(r, [...(byRoot.get(r) ?? []), i]);
  }
  return new Map(ids.map((i) => [i, byRoot.get(find(i))!]));
}

/**
 * Posizione a schermo di ogni widget. I widget sulla tela sono salvati rispetto al centro, quindi restano fermi
 * rispetto ad esso quando la finestra cambia; se la finestra si restringe tanto da lasciarne fuori qualcuno vengono
 * solo spinti dentro (un gruppo agganciato come un blocco unico) senza toccare il dato salvato: allargando di nuovo
 * tornano dove erano. I widget di un contenitore stanno dentro il suo corpo allo stesso modo.
 */
export function computeLayout(widgets: WidgetInstance[], links: Link[], view: View, tilt: number, containers: ReadonlySet<string>): Map<string, Placed> {
  const byId = new Map(widgets.map((w) => [w.id, w]));
  const hostOf = (w: WidgetInstance) => {
    const p = w.parent ? byId.get(w.parent) : undefined;
    return p && !p.parent && containers.has(p.id) ? p : undefined;
  };
  const top = widgets.filter((w) => !hostOf(w));
  const groups = groupsOf(top.map((w) => w.id), links);
  const out = new Map<string, Placed>();

  const done = new Set<string>();
  for (const w of top) {
    if (done.has(w.id)) continue;
    const members = groups.get(w.id)!.map((id) => byId.get(id)!);
    for (const m of members) done.add(m.id);
    const linked = members.length > 1;
    const boxes = members.map((m) => {
      const tilted = tilt > 0 && !linked && !containers.has(m.id);
      const h = containers.has(m.id) && isCollapsed(m) ? BAR_H : m.h;
      const ext = tilted ? tiltExtent(m.w, h, m.rot * tilt) : { x: 0, y: 0 };
      return { m, h, tilted, ext, x: m.x + view.w / 2, y: m.y + view.h / 2 };
    });
    const shift = (lo: number, hi: number, limit: number) => {
      let s = 0;
      if (hi > limit) s = limit - hi;
      if (lo + s < 0) s = -lo;
      return s;
    };
    const sx = shift(Math.min(...boxes.map((b) => b.x)), Math.max(...boxes.map((b) => b.x + b.m.w + b.ext.x)), view.w);
    const sy = shift(Math.min(...boxes.map((b) => b.y)), Math.max(...boxes.map((b) => b.y + b.h + b.ext.y)), view.h);
    for (const b of boxes) out.set(b.m.id, { x: b.x + sx, y: b.y + sy, w: b.m.w, h: b.h, z: 0, ext: b.ext, child: false, linked, tilted: b.tilted });
  }

  for (const w of widgets) {
    const host = hostOf(w);
    const p = host && out.get(host.id);
    if (!host || !p || isCollapsed(host)) continue; // i widget di un contenitore chiuso non si vedono
    const x = Math.min(Math.max(0, p.w - w.w), Math.max(0, w.x));
    const y = Math.min(Math.max(0, p.h - BAR_H - w.h), Math.max(0, w.y));
    out.set(w.id, { x: p.x + x, y: p.y + BAR_H + y, w: w.w, h: w.h, z: 0, ext: { x: 0, y: 0 }, child: true, linked: false, tilted: false });
  }

  // Sovrapposizione: widget della tela per `z`, e subito dopo ciascun contenitore i suoi, sempre per `z`.
  const byZ = (a: WidgetInstance, b: WidgetInstance) => a.z - b.z;
  let next = 1;
  for (const w of top.slice().sort(byZ)) {
    out.get(w.id)!.z = next++;
    for (const c of widgets.filter((x) => hostOf(x)?.id === w.id && out.has(x.id)).sort(byZ)) out.get(c.id)!.z = next++;
  }
  return out;
}

const key = (a: string, b: string) => `${a}|${b}`;

/** Spostamento (dx o dy) che porta il lato di `m` a toccare quello di `o`, se è abbastanza vicino. */
function pull(m: Rect, o: Rect): { dx?: number; dy?: number } {
  const best = (a: number, b: number) => (Math.abs(a) <= Math.abs(b) ? a : b);
  const out: { dx?: number; dy?: number } = {};
  if (overlapY(m, o) >= MIN_OVERLAP) {
    const d = best(o.x - (m.x + m.w), o.x + o.w - m.x);
    if (Math.abs(d) <= SNAP) out.dx = d;
  }
  if (overlapX(m, o) >= MIN_OVERLAP) {
    const d = best(o.y - (m.y + m.h), o.y + o.h - m.y);
    if (Math.abs(d) <= SNAP) out.dy = d;
  }
  return out;
}

type Box = Rect & { id: string };

/**
 * Quanto spostare il gruppo `moving` perché un suo lato si agganci a quello vicino di un altro widget. Le coppie in
 * `excluded` (già a contatto all'inizio del gesto, per esempio dopo uno sgancio) vengono ignorate finché il gruppo
 * non se ne è allontanato: altrimenti staccare e trascinare le riaggancerebbe subito.
 */
export function snapDelta(moving: Box[], others: Box[], excluded: Set<string>): Point {
  let dx: number | undefined, dy: number | undefined;
  for (const m of moving) for (const o of others) {
    const k = key(m.id, o.id);
    const p = pull(m, o);
    if (p.dx === undefined && p.dy === undefined) { excluded.delete(k); continue; }
    if (excluded.has(k)) continue;
    if (p.dx !== undefined && (dx === undefined || Math.abs(p.dx) < Math.abs(dx))) dx = p.dx;
    if (p.dy !== undefined && (dy === undefined || Math.abs(p.dy) < Math.abs(dy))) dy = p.dy;
  }
  return { x: dx ?? 0, y: dy ?? 0 };
}

/** Coppie (di cui una nel gruppo mosso) che si toccano per un lato. */
export function touching(moving: Box[], others: Box[], excluded: Set<string> = new Set()): Link[] {
  const pairs: Link[] = [];
  for (const m of moving) for (const o of others) if (!excluded.has(key(m.id, o.id)) && contact(m, o)) pairs.push([m.id, o.id]);
  return pairs;
}

/** Coppie già vicine abbastanza da agganciarsi: da ignorare all'inizio di un gesto. */
export function nearPairs(moving: Box[], others: Box[]): Set<string> {
  const s = new Set<string>();
  for (const m of moving) for (const o of others) {
    const p = pull(m, o);
    if (p.dx !== undefined || p.dy !== undefined) s.add(key(m.id, o.id));
  }
  return s;
}

/** Agganci che non si toccano più (per esempio dopo un ridimensionamento). */
export function brokenLinks(links: Link[], rects: Map<string, Rect>): Link[] {
  return links.filter(([a, b]) => {
    const ra = rects.get(a), rb = rects.get(b);
    return !ra || !rb || !contact(ra, rb);
  });
}

export type Side = 'right' | 'below' | 'left' | 'above';

/** Da che lato `b` tocca `a`, se si toccano per un lato (con un tratto in comune di almeno MIN_OVERLAP). */
export function contactSide(a: Rect, b: Rect): Side | null {
  if (overlapY(a, b) >= MIN_OVERLAP) {
    if (Math.abs(a.x + a.w - b.x) <= TOUCH) return 'right';
    if (Math.abs(b.x + b.w - a.x) <= TOUCH) return 'left';
  }
  if (overlapX(a, b) >= MIN_OVERLAP) {
    if (Math.abs(a.y + a.h - b.y) <= TOUCH) return 'below';
    if (Math.abs(b.y + b.h - a.y) <= TOUCH) return 'above';
  }
  return null;
}

/** Un gruppo di widget che, quando `id` cambia misura, si sposta con lui (verso destra se `x`, verso il basso se `y`). */
export interface Follower { ids: string[]; axis: 'x' | 'y' }

/**
 * Cosa segue un widget che si ingrandisce o si rimpicciolisce (anche un contenitore che si apre o si chiude): i widget
 * agganciati al suo lato destro o inferiore, con tutto ciò che è agganciato a loro, così restano attaccati. Quelli
 * sul lato sinistro o superiore non si muovono. Un gruppo non segue se contiene un widget fissato, o se è agganciato
 * anche da un altro lato (non si saprebbe di quanto spostarlo): i suoi agganci si sciolgono, se il contatto si perde.
 */
export function followers(id: string, rects: ReadonlyMap<string, Rect>, links: Link[], pinned: ReadonlySet<string> = new Set()): Follower[] {
  const self = rects.get(id);
  if (!self) return [];
  const adj = new Map<string, string[]>();
  for (const [a, b] of links) {
    if (!rects.has(a) || !rects.has(b)) continue;
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  const need = new Map<string, 'x' | 'y' | 'none'>();
  for (const n of adj.get(id) ?? []) {
    const side = contactSide(self, rects.get(n)!);
    if (side) need.set(n, side === 'right' ? 'x' : side === 'below' ? 'y' : 'none');
  }
  const seen = new Set<string>();
  const out: Follower[] = [];
  for (const start of need.keys()) {
    if (seen.has(start)) continue;
    const comp: string[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const c = stack.pop()!;
      comp.push(c);
      for (const nx of adj.get(c) ?? []) if (nx !== id && !seen.has(nx)) { seen.add(nx); stack.push(nx); }
    }
    const axes = new Set(comp.filter((c) => need.has(c)).map((c) => need.get(c)!));
    const axis = axes.size === 1 ? [...axes][0]! : 'none';
    if (axis === 'none' || comp.some((c) => pinned.has(c))) continue;
    out.push({ ids: comp, axis });
  }
  return out;
}

/** Di quanto può spostarsi in avanti (a destra o in basso) un gruppo che segue, restando nella finestra. */
export function followRoom(f: Follower, rects: ReadonlyMap<string, Rect>, view: View): number {
  const edge = Math.max(...f.ids.map((i) => { const r = rects.get(i)!; return f.axis === 'x' ? r.x + r.w : r.y + r.h; }));
  return Math.max(0, (f.axis === 'x' ? view.w : view.h) - edge);
}

/** Come può scorrere un widget agganciato lungo il bordo a cui è attaccato (`d` è lo spostamento sull'asse `axis`). */
export interface Slide { axis: 'x' | 'y'; lo: number; hi: number; stops: number[] }

/**
 * Lo scorrimento possibile di `id` lungo il lato dei suoi agganci: resta toccato da ciascun vicino (almeno MIN_OVERLAP
 * in comune) e dentro la finestra. `stops` sono gli spostamenti che lo allineano a un vicino (bordo iniziale, finale o
 * centro). Null se non è agganciato, o se i suoi agganci sono su lati in direzioni diverse (non si saprebbe dove scorrere).
 */
export function slideRange(id: string, rects: ReadonlyMap<string, Rect>, links: Link[], view: View): Slide | null {
  const self = rects.get(id);
  if (!self) return null;
  let axis: 'x' | 'y' | null = null;
  let lo = -Infinity, hi = Infinity;
  const stops: number[] = [];
  for (const [a, b] of links) {
    const other = a === id ? b : b === id ? a : null;
    const o = other === null ? undefined : rects.get(other);
    if (!o) continue;
    const side = contactSide(self, o);
    if (!side) continue;
    const ax = side === 'right' || side === 'left' ? 'y' : 'x';
    if (axis && axis !== ax) return null;
    axis = ax;
    if (ax === 'y') {
      lo = Math.max(lo, o.y + MIN_OVERLAP - (self.y + self.h));
      hi = Math.min(hi, o.y + o.h - MIN_OVERLAP - self.y);
      stops.push(o.y - self.y, o.y + o.h - (self.y + self.h), o.y + o.h / 2 - (self.y + self.h / 2));
    } else {
      lo = Math.max(lo, o.x + MIN_OVERLAP - (self.x + self.w));
      hi = Math.min(hi, o.x + o.w - MIN_OVERLAP - self.x);
      stops.push(o.x - self.x, o.x + o.w - (self.x + self.w), o.x + o.w / 2 - (self.x + self.w / 2));
    }
  }
  if (!axis) return null;
  if (axis === 'y') { lo = Math.max(lo, -self.y); hi = Math.min(hi, view.h - self.h - self.y); }
  else { lo = Math.max(lo, -self.x); hi = Math.min(hi, view.w - self.w - self.x); }
  if (lo > hi) return null;
  return { axis, lo, hi, stops: stops.filter((v) => v >= lo && v <= hi) };
}

/** Porta lo spostamento `d` dentro i limiti dello scorrimento e, se è vicino a un allineamento, lo fa scattare lì. */
export function snapSlide(d: number, slide: Slide): number {
  const v = Math.min(slide.hi, Math.max(slide.lo, d));
  let best = v, dist = SNAP + 1;
  for (const stop of slide.stops) if (Math.abs(stop - v) < dist) { dist = Math.abs(stop - v); best = stop; }
  return dist <= SNAP ? best : v;
}
