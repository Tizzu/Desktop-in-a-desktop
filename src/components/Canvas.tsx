import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent } from 'react';
import type { Action } from '../core/store';
import type { Link, Settings, Workspace, WidgetInstance } from '../core/types';
import { bounceOff, intersects, type Rect } from '../core/physics';
import { BAR_H, brokenLinks, computeLayout, contact, groupsOf, isCollapsed, nearPairs, snapDelta, touching, type Placed, type View } from '../core/layout';
import { getWidget } from '../widgets';
import { useT } from '../core/i18n';
import { ErrorBoundary } from './ErrorBoundary';
import { SearchBox } from './SearchBox';

const MIN_W = 120;
const MIN_H = 80;

// Fisica del lancio: px/ms, attrito per ms, rimbalzo ai bordi. I widget non si urtano tra loro.
const MAX_SPEED = 3;
const MIN_SPEED = 0.02;
const FRICTION = 0.996;
const RESTITUTION = 0.55;

/** Tutto ciò che un gesto deve sapere al suo inizio: lo stato di quel momento, non quello che cambia durante il gesto. */
interface Ctx {
  widgets: WidgetInstance[];
  links: Link[];
  layout: Map<string, Placed>;
  view: View;
  settings: Settings;
  containers: ReadonlySet<string>;
}

interface Flight { raf: number; ids: string[] }
const flights = new Map<string, Flight>();

function stopFlight(id: string) {
  const f = flights.get(id);
  if (!f) return;
  cancelAnimationFrame(f.raf);
  for (const i of f.ids) flights.delete(i);
}

const clamp = (v: number) => Math.max(-MAX_SPEED, Math.min(MAX_SPEED, v));

type Member = Rect & { id: string; ext: { x: number; y: number } };

/** Quanto può spostarsi un gruppo di widget restando in vista (il bordo sinistro/alto non va sotto zero). */
function bounds(members: Member[], view: View) {
  const lo = { x: -Infinity, y: -Infinity }, hi = { x: Infinity, y: Infinity };
  for (const m of members) {
    lo.x = Math.max(lo.x, -m.x); lo.y = Math.max(lo.y, -m.y);
    hi.x = Math.min(hi.x, view.w - m.x - m.w - m.ext.x); hi.y = Math.min(hi.y, view.h - m.y - m.h - m.ext.y);
  }
  return { lo, hi: { x: Math.max(lo.x, hi.x), y: Math.max(lo.y, hi.y) } };
}

/** Posizioni salvate (rispetto al centro della tela) di un gruppo spostato di (ox, oy) dalle posizioni a schermo `members`. */
const patchesFor = (members: Member[], ox: number, oy: number, view: View): Extract<Action, { type: 'updateWidgets' }>['patches'] =>
  members.map((m) => ({ id: m.id, patch: { x: m.x + ox - view.w / 2, y: m.y + oy - view.h / 2 } }));

function launch(members: Member[], vx0: number, vy0: number, canvas: HTMLElement, view: View, dispatch: Dispatch<Action>) {
  let ox = 0, oy = 0, vx = clamp(vx0), vy = clamp(vy0);
  if (Math.hypot(vx, vy) < 0.3) return;
  let last = performance.now();

  // La barra di ricerca fissa è un ostacolo: se il widget parte già sovrapposto la ignora finché non ne esce.
  const el = canvas.querySelector<HTMLElement>('.fixed-search');
  const cr = canvas.getBoundingClientRect();
  const br = el?.getBoundingClientRect();
  const bar: Rect | null = br ? { x: br.left - cr.left, y: br.top - cr.top, w: br.width, h: br.height } : null;
  const { lo, hi } = bounds(members, view);
  const at = (m: Member) => ({ x: m.x + ox, y: m.y + oy, w: m.w, h: m.h });
  let passing = bar ? members.some((m) => intersects(at(m), bar)) : false;
  const flight: Flight = { raf: 0, ids: members.map((m) => m.id) };

  const step = (now: number) => {
    const dt = Math.min(32, now - last);
    last = now;
    ox += vx * dt;
    oy += vy * dt;
    const confine = () => {
      if (ox < lo.x) { ox = lo.x; vx = Math.abs(vx) * RESTITUTION; }
      else if (ox > hi.x) { ox = hi.x; vx = -Math.abs(vx) * RESTITUTION; }
      if (oy < lo.y) { oy = lo.y; vy = Math.abs(vy) * RESTITUTION; }
      else if (oy > hi.y) { oy = hi.y; vy = -Math.abs(vy) * RESTITUTION; }
    };
    confine();
    if (bar) {
      let hitAny = false;
      for (const m of members) {
        const r = at(m);
        const hit = bounceOff(r, { vx, vy }, bar, RESTITUTION);
        if (!hit) continue;
        hitAny = true;
        if (!passing) {
          ox += hit.x - r.x;
          oy += hit.y - r.y;
          vx = hit.vx;
          vy = hit.vy;
          ox = Math.min(hi.x, Math.max(lo.x, ox));
          oy = Math.min(hi.y, Math.max(lo.y, oy));
          break;
        }
      }
      if (!hitAny) passing = false;
    }
    const f = Math.pow(FRICTION, dt);
    vx *= f;
    vy *= f;
    dispatch({ type: 'updateWidgets', patches: patchesFor(members, ox, oy, view) });
    if (Math.hypot(vx, vy) > MIN_SPEED) {
      flight.raf = requestAnimationFrame(step);
      for (const i of flight.ids) flights.set(i, flight);
    } else for (const i of flight.ids) flights.delete(i);
  };
  flight.raf = requestAnimationFrame(step);
  for (const i of flight.ids) flights.set(i, flight);
}

const asMember = (id: string, p: Placed): Member => ({ id, x: p.x, y: p.y, w: p.w, h: p.h, ext: p.ext });

function startGesture(e: PointerEvent, widget: WidgetInstance, dispatch: Dispatch<Action>, mode: 'move' | 'resize', ctx: Ctx) {
  e.preventDefault();
  // preventDefault blocca il cambio di focus: lo togliamo noi (es. dalla barra di ricerca fissa, che così torna sotto i widget).
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  stopFlight(widget.id);
  dispatch({ type: 'bringToFront', id: widget.id });
  const canvas = (e.currentTarget as HTMLElement).closest('.canvas') as HTMLElement;
  const { layout, view, settings } = ctx;
  const own = layout.get(widget.id);
  if (!own) return;
  const sx = e.clientX, sy = e.clientY;

  if (mode === 'resize') {
    const host = widget.parent && own.child ? layout.get(widget.parent) : undefined;
    // Un widget dentro un contenitore non esce dal suo corpo; sulla tela, dalla finestra.
    const maxW = host ? host.x + host.w - own.x : view.w - own.x - own.ext.x;
    const maxH = host ? host.y + host.h - own.y : view.h - own.y - own.ext.y;
    let w = widget.w, h = widget.h;
    const move = (ev: globalThis.PointerEvent) => {
      w = Math.max(MIN_W, Math.min(widget.w + ev.clientX - sx, Math.max(widget.w, maxW)));
      h = Math.max(MIN_H, Math.min(widget.h + ev.clientY - sy, Math.max(widget.h, maxH)));
      dispatch({ type: 'updateWidget', id: widget.id, patch: { w, h } });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      // Cambiando misura i lati non coincidono più: gli agganci che non si toccano si sciolgono.
      const rects = new Map([...layout].map(([id, p]) => [id, p as Rect]));
      rects.set(widget.id, { x: own.x, y: own.y, w, h });
      const broken = brokenLinks(ctx.links.filter((l) => l.includes(widget.id)), rects);
      if (broken.length) dispatch({ type: 'unlink', pairs: broken });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return;
  }

  const wasChild = own.child;
  const ids = wasChild ? [widget.id] : groupsOf([...layout].filter(([, p]) => !p.child).map(([id]) => id), ctx.links).get(widget.id)!;
  const members = ids.map((id) => asMember(id, layout.get(id)!));
  const single = members.length === 1 && !ctx.containers.has(widget.id);
  const { lo, hi } = bounds(members, view);
  // Candidati a cui agganciarsi: i widget liberi sulla tela che non si stanno muovendo.
  const others = [...layout].filter(([id, p]) => !p.child && !ids.includes(id)).map(([id, p]) => ({ id, x: p.x, y: p.y, w: p.w, h: p.h }));
  const excluded = wasChild ? new Set<string>() : nearPairs(members, others);
  const samples: { t: number; x: number; y: number }[] = [];
  let off = { x: 0, y: 0 };
  let moved = false;
  let host: string | undefined;

  const hostAt = (cx: number, cy: number) => {
    let best: [string, Placed] | undefined;
    for (const [id, p] of layout) {
      if (!ctx.containers.has(id) || p.child || id === widget.id) continue;
      if (cx >= p.x && cx <= p.x + p.w && cy >= p.y + BAR_H && cy <= p.y + p.h && (!best || p.z > best[1].z)) best = [id, p];
    }
    return best;
  };
  const markHost = (id: string | undefined) => {
    if (id === host) return;
    if (host) canvas.querySelector(`[data-id="${host}"]`)?.classList.remove('drop-target');
    if (id) canvas.querySelector(`[data-id="${id}"]`)?.classList.add('drop-target');
    host = id;
  };

  const move = (ev: globalThis.PointerEvent) => {
    let dx = Math.min(hi.x, Math.max(lo.x, ev.clientX - sx));
    let dy = Math.min(hi.y, Math.max(lo.y, ev.clientY - sy));
    const target = single ? hostAt(own.x + dx + own.w / 2, own.y + dy + own.h / 2) : undefined;
    markHost(target?.[0]);
    // Alt tiene i widget staccati; sopra un contenitore non ci si aggancia ai suoi bordi; chi esce da un contenitore non si aggancia.
    if (!target && !ev.altKey && !wasChild) {
      const s = snapDelta(members.map((m) => ({ ...m, x: m.x + dx, y: m.y + dy })), others, excluded);
      dx = Math.min(hi.x, Math.max(lo.x, dx + s.x));
      dy = Math.min(hi.y, Math.max(lo.y, dy + s.y));
    }
    off = { x: dx, y: dy };
    samples.push({ t: ev.timeStamp, x: ev.clientX, y: ev.clientY });
    if (samples.length > 6) samples.shift();
    const patches = patchesFor(members, dx, dy, view);
    // Un widget preso da un contenitore esce subito dal suo elenco: da qui in poi segue il puntatore liberamente.
    if (wasChild && !moved) patches[0]!.patch = { ...patches[0]!.patch, parent: undefined };
    moved = true;
    dispatch({ type: 'updateWidgets', patches });
  };
  const up = (ev: globalThis.PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    markHost(undefined);
    if (!moved) return;
    const final = members.map((m) => ({ ...m, x: m.x + off.x, y: m.y + off.y }));
    const target = single ? hostAt(own.x + off.x + own.w / 2, own.y + off.y + own.h / 2) : undefined;
    if (target) {
      // Entra nel contenitore: la posizione diventa relativa al suo corpo.
      const [id, p] = target;
      dispatch({
        type: 'updateWidget',
        id: widget.id,
        patch: {
          parent: id,
          x: Math.min(Math.max(0, p.w - own.w), Math.max(0, own.x + off.x - p.x)),
          y: Math.min(Math.max(0, p.h - BAR_H - own.h), Math.max(0, own.y + off.y - p.y - BAR_H)),
        },
      });
      return;
    }
    if (!ev.altKey && !wasChild) {
      const pairs = touching(final, others, excluded);
      if (pairs.length) {
        dispatch({ type: 'link', pairs });
        return;
      }
    }
    const first = samples[0], last = samples[samples.length - 1];
    // Lancia solo se il puntatore era ancora in movimento al rilascio.
    if (settings.physics && first && last && last.t > first.t && ev.timeStamp - last.t < 80) {
      const dt = last.t - first.t;
      launch(final, (last.x - first.x) / dt, (last.y - first.y) / dt, canvas, view, dispatch);
    }
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

interface Props {
  workspace: Workspace;
  settings: Settings;
  dispatch: Dispatch<Action>;
}

// Sovrapposizione minima (px) perché la barra fissa si consideri coperta: ignora gli angoli dei widget inclinati.
const COVER_TOLERANCE = 6;

export const Canvas = forwardRef<HTMLDivElement, Props>(function Canvas({ workspace, settings, dispatch }, ref) {
  const t = useT();
  const barRef = useRef<HTMLDivElement>(null);
  const [covered, setCovered] = useState(false);
  const [active, setActive] = useState(false);
  const [view, setView] = useState<View>({ w: 0, h: 0 });
  const canvasEl = useRef<HTMLDivElement | null>(null);
  const setRefs = useCallback((el: HTMLDivElement | null) => {
    canvasEl.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  }, [ref]);

  // La tela non scorre mai: ne seguiamo la misura e i widget si dispongono di conseguenza (vedi computeLayout).
  useLayoutEffect(() => {
    const el = canvasEl.current;
    if (!el) return;
    const measure = () => setView((v) => (v.w === el.clientWidth && v.h === el.clientHeight ? v : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const containers = useMemo(() => new Set(workspace.widgets.filter((w) => getWidget(w.type)?.container).map((w) => w.id)), [workspace.widgets]);
  const links = workspace.links ?? [];
  const layout = useMemo(
    () => computeLayout(workspace.widgets, links, view, settings.tilt, containers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace.widgets, workspace.links, view, settings.tilt, containers],
  );
  const ctx: Ctx = { widgets: workspace.widgets, links, layout, view, settings, containers };

  // Confronta i riquadri a schermo (tengono conto di rotazione e scorrimento).
  const check = useCallback(() => {
    const bar = barRef.current;
    const canvas = bar?.closest('.canvas');
    if (!bar || !canvas) return setCovered(false);
    const b = bar.getBoundingClientRect();
    const hit = [...canvas.querySelectorAll<HTMLElement>('.widget')].some((w) => {
      const r = w.getBoundingClientRect();
      return Math.min(r.right, b.right) - Math.max(r.left, b.left) > COVER_TOLERANCE && Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top) > COVER_TOLERANCE;
    });
    setCovered(hit);
  }, []);

  useLayoutEffect(check); // a ogni render: i widget si spostano, anche in volo
  useEffect(() => {
    const canvas = barRef.current?.closest('.canvas');
    if (!canvas) return;
    const ro = new ResizeObserver(check);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [check, settings.searchBar]);

  return (
    <div className="canvas" ref={setRefs}>
      {settings.searchBar && (
        // Mentre si scrive la barra passa davanti ai widget; coperta e inattiva diventa trasparente.
        <div className={`fixed-search-anchor${active ? ' raised' : ''}`}>
          <div ref={barRef} className={`fixed-search${covered && !active ? ' covered' : ''}`}>
            <SearchBox hotkey covered={covered && !active} onActiveChange={setActive} />
          </div>
        </div>
      )}
      {workspace.widgets.map((w) => {
        const def = getWidget(w.type);
        const p = layout.get(w.id);
        if (!def || !p) return null;
        const shut = !!def.container && isCollapsed(w);
        const inside = def.container ? workspace.widgets.filter((c) => c.parent === w.id).length : 0;
        return (
          <section
            key={w.id}
            className={`widget${p.child ? ' in-container' : ''}${shut ? ' collapsed' : ''}`}
            data-id={w.id}
            data-container={def.container ? '' : undefined}
            data-empty={def.container && !shut && !inside ? '' : undefined}
            style={{
              left: p.x, top: p.y, width: p.w, height: p.h, zIndex: p.z,
              ...(def.container ? { '--hint': JSON.stringify(t('Drop widgets here')) } : {}),
              transform: p.tilted ? `rotate(${w.rot}deg)` : undefined,
            }}
            onPointerDown={() => dispatch({ type: 'bringToFront', id: w.id })}
          >
            <header className="widget-bar" onPointerDown={(e) => startGesture(e, w, dispatch, 'move', ctx)}>
              <span>{def.icon} {t(def.label)}{shut && inside > 0 ? ` (${inside})` : ''}</span>
              {def.container && (
                <button
                  className="icon-btn fold-btn"
                  aria-label={shut ? t('Open container') : t('Close container')}
                  aria-expanded={!shut}
                  title={shut ? t('Open container') : t('Close container')}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => dispatch({ type: 'updateWidget', id: w.id, patch: { state: { ...(w.state as object), collapsed: !shut } } })}
                >{shut ? '▸' : '▾'}</button>
              )}
              <button
                className="icon-btn"
                aria-label={t('Remove widget')}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => dispatch({ type: 'removeWidget', id: w.id })}
              >×</button>
            </header>
            <div className="widget-body">
              <ErrorBoundary
                fallback={
                  <div className="widget-error" role="alert">
                    {t('This widget ran into a problem. You can remove it with the ×; the others are untouched.')}
                  </div>
                }
              >
                <def.Component
                  state={w.state}
                  onChange={(state) => dispatch({ type: 'updateWidget', id: w.id, patch: { state } })}
                />
              </ErrorBoundary>
            </div>
            <div className="resize-handle" onPointerDown={(e) => startGesture(e, w, dispatch, 'resize', ctx)} />
          </section>
        );
      })}
      {links.map(([a, b]) => {
        const pa = layout.get(a), pb = layout.get(b);
        const at = pa && pb && contact(pa, pb);
        if (!at) return null;
        return (
          <div key={`${a}|${b}`} className="link-spot" style={{ left: at.x, top: at.y }}>
            <button
              className="unlink-btn"
              aria-label={t('Detach widgets')}
              title={t('Detach widgets')}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => dispatch({ type: 'unlink', pairs: [[a, b]] })}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9.5 14.5 7 17a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 4.5-.4" />
                <path d="m14.5 9.5 2.5-2.5a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-4.5.4" />
                <path d="m8 3 1 2.5M3 8l2.5 1M16 21l-1-2.5M21 16l-2.5-1" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
});
