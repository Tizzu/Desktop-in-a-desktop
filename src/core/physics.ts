export interface Rect { x: number; y: number; w: number; h: number }

export const intersects = (a: Rect, b: Rect) =>
  Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0;

/**
 * Urto contro un ostacolo fisso (AABB). Se `box` lo penetra, lo sposta fuori lungo l'asse di
 * penetrazione minore e riflette la velocità smorzata. Restituisce null se non c'è contatto.
 */
export function bounceOff(box: Rect, v: { vx: number; vy: number }, obstacle: Rect, restitution: number) {
  const ox = Math.min(box.x + box.w, obstacle.x + obstacle.w) - Math.max(box.x, obstacle.x);
  const oy = Math.min(box.y + box.h, obstacle.y + obstacle.h) - Math.max(box.y, obstacle.y);
  if (ox <= 0 || oy <= 0) return null;
  if (ox < oy) {
    const dir = box.x + box.w / 2 < obstacle.x + obstacle.w / 2 ? -1 : 1;
    return { x: box.x + dir * ox, y: box.y, vx: dir * Math.abs(v.vx) * restitution, vy: v.vy };
  }
  const dir = box.y + box.h / 2 < obstacle.y + obstacle.h / 2 ? -1 : 1;
  return { x: box.x, y: box.y + dir * oy, vx: v.vx, vy: dir * Math.abs(v.vy) * restitution };
}

/** Massima coordinata (x o y) di un widget nella tela: il suo bordo opposto resta in vista, con il margine di rotazione. */
export const fitCoord = (view: number, size: number, margin = 0) => Math.max(0, view - size - margin);

/** Quanto la rotazione fa sporgere il riquadro del widget oltre il suo box, per lato (px). */
export function tiltExtent(w: number, h: number, rotDeg: number) {
  const r = (Math.abs(rotDeg) * Math.PI) / 180;
  return {
    x: Math.max(0, (w * Math.cos(r) + h * Math.sin(r) - w) / 2),
    y: Math.max(0, (h * Math.cos(r) + w * Math.sin(r) - h) / 2),
  };
}
