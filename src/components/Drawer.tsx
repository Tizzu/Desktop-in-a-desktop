import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { maxCoord, tiltExtent } from '../core/physics';
import type { CategoryId, WidgetInstance } from '../core/types';
import { CATEGORIES, listWidgets, type WidgetDef } from '../widgets/registry';
import { WidgetPreview } from './WidgetPreview';

const SLOT_W = 132;
const SLOT_H = 92;

// Stile "tucked": tool ruotati di 90° (vista dritta, senza prospettiva), infilati dietro il bordo della barra.
const BAR_H = 48;
const TUCK_LEN = 120;
const TUCK_THICK = 84;
const PEEK = 52; // quanto sporge sotto la barra

const TABS: { id: CategoryId | 'all'; label: string; icon: string }[] = [{ id: 'all', label: 'Tutti', icon: '✨' }, ...CATEGORIES];

interface Props {
  style: 'tucked' | 'slanted';
  /** Se vero, i tool sono divisi in cassetti per categoria. */
  grouped: boolean;
  category: CategoryId | 'all';
  onCategory: (c: CategoryId | 'all') => void;
  canvasRef: RefObject<HTMLDivElement | null>;
  onDrop: (def: WidgetDef, x: number, y: number) => void;
  /** Widget dello spazio attivo: i tool che pendono sopra di loro si ritraggono. */
  widgets: WidgetInstance[];
}

export function Drawer({ canvasRef, onDrop, style, grouped, category, onCategory, widgets }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [retracted, setRetracted] = useState('');
  const [ghost, setGhost] = useState<{ def: WidgetDef; x: number; y: number } | null>(null);

  const start = (e: PointerEvent, def: WidgetDef) => {
    e.preventDefault();
    const move = (ev: globalThis.PointerEvent) => setGhost({ def, x: ev.clientX, y: ev.clientY });
    const up = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setGhost(null);
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      if (!canvas || !rect) return;
      const inside =
        ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
      if (inside) {
        const { w, h } = def.defaultSize;
        const ext = tiltExtent(w, h, 3); // margine per la rotazione casuale massima (±3°)
        // Coordinate della tela (che può essere scrollata), dentro l'area visibile.
        onDrop(
          def,
          Math.min(maxCoord(canvas.scrollLeft, canvas.clientWidth, w, 0, ext.x), Math.max(0, ev.clientX - rect.left + canvas.scrollLeft - w / 2)),
          Math.min(maxCoord(canvas.scrollTop, canvas.clientHeight, h, 0, ext.y), Math.max(0, ev.clientY - rect.top + canvas.scrollTop - 16)),
        );
      }
    };
    move(e.nativeEvent);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Un tool che pende sopra un widget rientra, così il widget si può cliccare; scorrendo la barra o la tela
  // il rientro passa ai tool che arrivano sopra. Lo stato è una stringa per non rirenderizzare se non cambia nulla.
  const measure = useCallback(() => {
    const track = trackRef.current, canvas = canvasRef.current;
    if (!track || !canvas || style !== 'tucked') return setRetracted('');
    const boxes = [...canvas.querySelectorAll<HTMLElement>('.widget')].map((w) => w.getBoundingClientRect());
    const hits = [...track.querySelectorAll<HTMLElement>('.drawer-item')].filter((item) => {
      const r = item.getBoundingClientRect();
      const top = r.top + BAR_H, bottom = top + PEEK + 14; // +14: lo scatto verso il basso al passaggio del mouse
      return boxes.some((b) => b.left < r.right && b.right > r.left && b.top < bottom && b.bottom > top);
    });
    setRetracted(hits.map((h) => h.getAttribute('aria-label')).join('|'));
  }, [canvasRef, style]);

  useLayoutEffect(measure, [measure, widgets, category, grouped]);
  useEffect(() => {
    const track = trackRef.current, canvas = canvasRef.current;
    track?.addEventListener('scroll', measure, { passive: true });
    canvas?.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    measure(); // la tela è un fratello renderizzato dopo: al primo layout il suo ref non c'è ancora
    return () => {
      track?.removeEventListener('scroll', measure);
      canvas?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure, canvasRef]);
  const retractedSet = new Set(retracted ? retracted.split('|') : []);

  const tools = listWidgets().filter((d) => !grouped || category === 'all' || d.category === category);

  return (
    <div
      className={`drawer drawer--${style}`}
      role="toolbar"
      aria-label="Cassetti"
      // Se i tool non entrano, la rotella scorre il blocco in orizzontale.
      onWheel={(e) => {
        const t = trackRef.current;
        if (!t) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) t.scrollLeft += e.deltaY;
        // Lo swipe orizzontale sui tool scorre già da solo; qui lo gestiamo solo sulla barra vuota.
        else if (!t.contains(e.target as Node)) t.scrollLeft += e.deltaX;
      }}
    >
      {grouped && (
        <div className="drawer-cats" role="tablist" aria-label="Categorie">
          {TABS.map((c) => (
            <button key={c.id} role="tab" aria-selected={c.id === category} aria-label={c.label} title={c.label} className={`cat${c.id === category ? ' on' : ''}`} onClick={() => onCategory(c.id)}>
              {c.icon}
            </button>
          ))}
          <span className="cat-name">{TABS.find((c) => c.id === category)?.label}</span>
        </div>
      )}
      <div className="drawer-track" ref={trackRef}>
      {tools.map((def) => {
        const { w, h } = def.defaultSize;
        const common = { key: def.type, 'aria-label': def.label, title: def.label, onPointerDown: (e: PointerEvent) => start(e, def) };
        if (style === 'slanted') {
          return (
            <button {...common} className="drawer-item">
              <WidgetPreview def={def} scale={Math.min(SLOT_W / w, SLOT_H / h)} />
            </button>
          );
        }
        const sc = Math.min(TUCK_LEN / w, TUCK_THICK / h);
        return (
          <button {...common} className={`drawer-item${retractedSet.has(def.label) ? ' retracted' : ''}`} style={{ width: h * sc, height: BAR_H }}>
            <span className="tool" style={{ width: h * sc, height: w * sc, top: BAR_H + PEEK - w * sc }}>
              <span className="tool-rot">
                <WidgetPreview def={def} scale={sc} />
              </span>
            </span>
          </button>
        );
      })}
      </div>
      {ghost && (
        <div className="ghost" style={{ left: ghost.x, top: ghost.y }}>
          <WidgetPreview def={ghost.def} rot={-2} />
        </div>
      )}
    </div>
  );
}
