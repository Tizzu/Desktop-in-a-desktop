import { describe, expect, it } from 'vitest';
import { bounceOff, intersects, maxCoord, tiltExtent } from './physics';

const bar = { x: 100, y: 100, w: 400, h: 50 };

describe('urto contro la barra', () => {
  it('nessun contatto: null', () => {
    expect(bounceOff({ x: 0, y: 0, w: 50, h: 50 }, { vx: 1, vy: 1 }, bar, 0.5)).toBeNull();
  });
  it('da sinistra: viene spinto fuori e rimbalza indietro', () => {
    const r = bounceOff({ x: 60, y: 90, w: 50, h: 80 }, { vx: 2, vy: 0 }, bar, 0.5)!;
    expect(r.x).toBe(50);
    expect(r.vx).toBe(-1);
  });
  it('dall\'alto: rimbalza verso l\'alto, senza cambiare x', () => {
    const r = bounceOff({ x: 150, y: 40, w: 300, h: 70 }, { vx: 0, vy: 2 }, bar, 0.5)!;
    expect(r.y).toBe(30);
    expect(r.vy).toBe(-1);
    expect(r.x).toBe(150);
  });
  it('dal basso: rimbalza verso il basso', () => {
    const r = bounceOff({ x: 150, y: 140, w: 300, h: 70 }, { vx: 0, vy: -2 }, bar, 0.5)!;
    expect(r.y).toBe(150);
    expect(r.vy).toBe(1);
  });
  it('intersects coincide con il contatto', () => {
    expect(intersects({ x: 0, y: 0, w: 10, h: 10 }, bar)).toBe(false);
    expect(intersects({ x: 120, y: 120, w: 10, h: 10 }, bar)).toBe(true);
  });
});

describe('limiti di posizione e scorrimento', () => {
  it('limita al bordo visibile, considerando lo scorrimento', () => {
    expect(maxCoord(0, 800, 200, 0)).toBe(600);
    expect(maxCoord(300, 800, 200, 0)).toBe(900);
  });
  it('un widget già fuori vista resta dov\'è, senza essere riportato dentro', () => {
    expect(maxCoord(0, 500, 200, 900)).toBe(900);
  });
  it('non va mai sotto zero e rispetta il margine di rotazione', () => {
    expect(maxCoord(0, 100, 300, 0)).toBe(0);
    expect(maxCoord(0, 800, 200, 0, 10)).toBe(590);
  });
  it('la rotazione fa sporgere il riquadro; a 0° no', () => {
    expect(tiltExtent(300, 300, 0)).toEqual({ x: 0, y: 0 });
    expect(tiltExtent(300, 300, 3).x).toBeGreaterThan(7);
  });
});
