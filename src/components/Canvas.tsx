import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type PointerEvent } from 'react';
import type { Action } from '../core/store';
import type { Settings, Workspace, WidgetInstance } from '../core/types';
import { bounceOff, intersects, maxCoord, tiltExtent, type Rect } from '../core/physics';
import { getWidget } from '../widgets';
import { ErrorBoundary } from './ErrorBoundary';
import { SearchBox } from './SearchBox';

const MIN_W = 120;
const MIN_H = 80;

// Fisica del lancio: px/ms, attrito per ms, rimbalzo ai bordi. I widget non si urtano tra loro.
const MAX_SPEED = 3;
const MIN_SPEED = 0.02;
const FRICTION = 0.996;
const RESTITUTION = 0.55;

const flights = new Map<string, number>();

function stopFlight(id: string) {
  const f = flights.get(id);
  if (f !== undefined) cancelAnimationFrame(f);
  flights.delete(id);
}

const clamp = (v: number) => Math.max(-MAX_SPEED, Math.min(MAX_SPEED, v));

function launch(widget: WidgetInstance, x0: number, y0: number, vx0: number, vy0: number, canvas: HTMLElement, dispatch: Dispatch<Action>, tilt: boolean) {
  let x = x0, y = y0, vx = clamp(vx0), vy = clamp(vy0);
  if (Math.hypot(vx, vy) < 0.3) return;
  let last = performance.now();

  // La barra di ricerca fissa è un ostacolo: se il widget parte già sovrapposto la ignora finché non ne esce.
  // Coordinate nello spazio della tela (che può essere scrollata), non della finestra.
  const el = canvas.querySelector<HTMLElement>('.fixed-search');
  const cr = canvas.getBoundingClientRect();
  const br = el?.getBoundingClientRect();
  const bar: Rect | null = br ? { x: br.left - cr.left + canvas.scrollLeft, y: br.top - cr.top + canvas.scrollTop, w: br.width, h: br.height } : null;
  const ext = tiltExtent(widget.w, widget.h, tilt ? widget.rot : 0);
  const maxX = maxCoord(canvas.scrollLeft, canvas.clientWidth, widget.w, x0, ext.x);
  const maxY = maxCoord(canvas.scrollTop, canvas.clientHeight, widget.h, y0, ext.y);
  let passing = bar ? intersects({ x, y, w: widget.w, h: widget.h }, bar) : false;

  const step = (now: number) => {
    const dt = Math.min(32, now - last);
    last = now;
    x += vx * dt;
    y += vy * dt;
    if (x < 0) { x = 0; vx = Math.abs(vx) * RESTITUTION; }
    else if (x > maxX) { x = maxX; vx = -Math.abs(vx) * RESTITUTION; }
    if (y < 0) { y = 0; vy = Math.abs(vy) * RESTITUTION; }
    else if (y > maxY) { y = maxY; vy = -Math.abs(vy) * RESTITUTION; }
    if (bar) {
      const hit = bounceOff({ x, y, w: widget.w, h: widget.h }, { vx, vy }, bar, RESTITUTION);
      if (!hit) passing = false;
      else if (!passing) {
        x = Math.min(maxX, Math.max(0, hit.x));
        y = Math.min(maxY, Math.max(0, hit.y));
        vx = hit.vx;
        vy = hit.vy;
      }
    }
    const f = Math.pow(FRICTION, dt);
    vx *= f;
    vy *= f;
    dispatch({ type: 'updateWidget', id: widget.id, patch: { x, y } });
    if (Math.hypot(vx, vy) > MIN_SPEED) flights.set(widget.id, requestAnimationFrame(step));
    else flights.delete(widget.id);
  };
  flights.set(widget.id, requestAnimationFrame(step));
}

function startGesture(
  e: PointerEvent,
  widget: WidgetInstance,
  dispatch: Dispatch<Action>,
  mode: 'move' | 'resize',
  settings: Settings,
) {
  e.preventDefault();
  // preventDefault blocca il cambio di focus: lo togliamo noi (es. dalla barra di ricerca fissa, che così torna sotto i widget).
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  stopFlight(widget.id);
  dispatch({ type: 'bringToFront', id: widget.id });
  const canvas = (e.currentTarget as HTMLElement).closest('.canvas') as HTMLElement;
  const sx = e.clientX, sy = e.clientY;
  let x = widget.x, y = widget.y;
  const samples: { t: number; x: number; y: number }[] = [];

  const move = (ev: globalThis.PointerEvent) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    const ext = tiltExtent(widget.w, widget.h, settings.tilt ? widget.rot : 0);
    if (mode === 'move') {
      // Resta nell'area visibile: trascinare non allarga la pagina.
      x = Math.min(maxCoord(canvas.scrollLeft, canvas.clientWidth, widget.w, widget.x, ext.x), Math.max(0, widget.x + dx));
      y = Math.min(maxCoord(canvas.scrollTop, canvas.clientHeight, widget.h, widget.y, ext.y), Math.max(0, widget.y + dy));
      samples.push({ t: ev.timeStamp, x: ev.clientX, y: ev.clientY });
      if (samples.length > 6) samples.shift();
      dispatch({ type: 'updateWidget', id: widget.id, patch: { x, y } });
    } else {
      dispatch({
        type: 'updateWidget',
        id: widget.id,
        patch: {
          w: Math.max(MIN_W, Math.min(widget.w + dx, Math.max(widget.w, canvas.scrollLeft + canvas.clientWidth - widget.x - ext.x))),
          h: Math.max(MIN_H, Math.min(widget.h + dy, Math.max(widget.h, canvas.scrollTop + canvas.clientHeight - widget.y - ext.y))),
        },
      });
    }
  };
  const up = (ev: globalThis.PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    const first = samples[0], last = samples[samples.length - 1];
    // Lancia solo se il puntatore era ancora in movimento al rilascio.
    if (mode === 'move' && settings.physics && first && last && last.t > first.t && ev.timeStamp - last.t < 80) {
      const dt = last.t - first.t;
      launch(widget, x, y, (last.x - first.x) / dt, (last.y - first.y) / dt, canvas, dispatch, settings.tilt);
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
  const barRef = useRef<HTMLDivElement>(null);
  const [covered, setCovered] = useState(false);
  const [active, setActive] = useState(false);

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
    canvas.addEventListener('scroll', check, { passive: true });
    return () => { ro.disconnect(); canvas.removeEventListener('scroll', check); };
  }, [check, settings.searchBar]);

  return (
    <div className="canvas" ref={ref}>
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
        if (!def) return null;
        return (
          <section
            key={w.id}
            className="widget"
            style={{
              left: w.x, top: w.y, width: w.w, height: w.h, zIndex: w.z,
              transform: settings.tilt ? `rotate(${w.rot}deg)` : undefined,
            }}
            onPointerDown={() => dispatch({ type: 'bringToFront', id: w.id })}
          >
            <header className="widget-bar" onPointerDown={(e) => startGesture(e, w, dispatch, 'move', settings)}>
              <span>{def.icon} {def.label}</span>
              <button
                className="icon-btn"
                aria-label="Rimuovi widget"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => dispatch({ type: 'removeWidget', id: w.id })}
              >×</button>
            </header>
            <div className="widget-body">
              <ErrorBoundary
                fallback={
                  <div className="widget-error" role="alert">
                    Questo widget ha avuto un problema. Puoi toglierlo con la ×: gli altri non sono toccati.
                  </div>
                }
              >
                <def.Component
                  state={w.state}
                  onChange={(state) => dispatch({ type: 'updateWidget', id: w.id, patch: { state } })}
                />
              </ErrorBoundary>
            </div>
            <div className="resize-handle" onPointerDown={(e) => startGesture(e, w, dispatch, 'resize', settings)} />
          </section>
        );
      })}
    </div>
  );
});
