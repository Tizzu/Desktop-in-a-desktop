import { describe, expect, it } from 'vitest';
import { brokenLinks, computeLayout, contact, groupsOf, nearPairs, snapDelta, touching, BAR_H } from './layout';
import type { WidgetInstance } from './types';

const w = (id: string, x: number, y: number, extra: Partial<WidgetInstance> = {}): WidgetInstance =>
  ({ id, type: 'postit', x, y, w: 200, h: 100, z: 1, rot: 0, state: {}, ...extra });
const view = { w: 1000, h: 600 };
const none = new Set<string>();

describe('contatto tra lati', () => {
  it('lati affiancati: punto di attacco a metà del tratto in comune', () => {
    expect(contact({ x: 0, y: 0, w: 100, h: 100 }, { x: 100, y: 50, w: 100, h: 100 })).toEqual({ x: 100, y: 75 });
    expect(contact({ x: 0, y: 0, w: 100, h: 100 }, { x: 40, y: 100, w: 100, h: 100 })).toEqual({ x: 70, y: 100 });
  });
  it('niente contatto se distanti o se si toccano solo in un angolo', () => {
    expect(contact({ x: 0, y: 0, w: 100, h: 100 }, { x: 110, y: 0, w: 100, h: 100 })).toBeNull();
    expect(contact({ x: 0, y: 0, w: 100, h: 100 }, { x: 100, y: 90, w: 100, h: 100 })).toBeNull();
  });
});

describe('gruppi', () => {
  it('gli agganci uniscono in modo transitivo', () => {
    const g = groupsOf(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c']]);
    expect(g.get('a')).toEqual(['a', 'b', 'c']);
    expect(g.get('c')).toEqual(['a', 'b', 'c']);
    expect(g.get('d')).toEqual(['d']);
  });
});

describe('disposizione rispetto al centro', () => {
  it('le coordinate sono rispetto al centro della tela', () => {
    const l = computeLayout([w('a', -100, -50)], [], view, false, none);
    expect(l.get('a')).toMatchObject({ x: 400, y: 250 });
  });
  it('rimpicciolendo la finestra i widget fuori vista vengono spinti dentro, senza toccare il dato', () => {
    const a = w('a', 300, 100);
    expect(computeLayout([a], [], { w: 1000, h: 600 }, false, none).get('a')!.x).toBe(800);
    expect(computeLayout([a], [], { w: 600, h: 600 }, false, none).get('a')!.x).toBe(400); // 600 - 200
    expect(a.x).toBe(300);
    expect(computeLayout([a], [], { w: 100, h: 600 }, false, none).get('a')!.x).toBe(0); // più largo della finestra: a sinistra
  });
  it('un gruppo agganciato viene spinto come un blocco', () => {
    const l = computeLayout([w('a', 100, 0), w('b', 300, 0)], [['a', 'b']], { w: 800, h: 600 }, true, none);
    expect(l.get('b')!.x - l.get('a')!.x).toBe(200);
    expect(l.get('b')!.x + 200).toBe(800);
    expect(l.get('a')!.tilted).toBe(false); // agganciati: dritti
  });
  it('i widget di un contenitore stanno dentro il suo corpo', () => {
    const box = w('box', -100, -100, { w: 300, h: 230 });
    const inside = w('i', 50, 20, { parent: 'box' });
    const out = w('o', 5000, 5000, { parent: 'box' });
    const l = computeLayout([box, inside, out], [], view, true, new Set(['box']));
    const b = l.get('box')!;
    expect(l.get('i')).toMatchObject({ x: b.x + 50, y: b.y + BAR_H + 20, child: true });
    expect(l.get('o')!.x).toBe(b.x + 100); // 300 - 200
    expect(l.get('o')!.y).toBe(b.y + BAR_H + 100); // 200 - 100
    expect(b.tilted).toBe(false);
  });
  it('ordine di sovrapposizione: i figli subito sopra il contenitore', () => {
    const ws = [w('box', 0, 0, { z: 1 }), w('c', 0, 0, { z: 9, parent: 'box' }), w('top', 0, 0, { z: 2 })];
    const l = computeLayout(ws, [], view, false, new Set(['box']));
    expect([l.get('box')!.z, l.get('c')!.z, l.get('top')!.z]).toEqual([1, 2, 3]);
  });
  it('un parent che non è un contenitore viene ignorato', () => {
    const l = computeLayout([w('a', 0, 0), w('b', 0, 0, { parent: 'a' })], [], view, false, none);
    expect(l.get('b')!.child).toBe(false);
  });
});

describe('aggancio', () => {
  const a = { id: 'a', x: 0, y: 0, w: 200, h: 100 };
  it('attira un lato vicino fino a toccare quello dell\'altro', () => {
    const m = { id: 'm', x: 208, y: 20, w: 100, h: 100 };
    expect(snapDelta([m], [a], new Set())).toEqual({ x: -8, y: 0 });
    expect(touching([{ ...m, x: 200 }], [a])).toEqual([['m', 'a']]);
  });
  it('troppo lontano o senza tratto in comune: niente', () => {
    expect(snapDelta([{ id: 'm', x: 230, y: 0, w: 100, h: 100 }], [a], new Set())).toEqual({ x: 0, y: 0 });
    expect(snapDelta([{ id: 'm', x: 205, y: 90, w: 100, h: 100 }], [a], new Set())).toEqual({ x: 0, y: 0 });
  });
  it('dopo uno sgancio le coppie già a contatto non si riagganciano finché non ci si allontana', () => {
    const m = { id: 'm', x: 200, y: 0, w: 100, h: 100 };
    const excluded = nearPairs([m], [a]);
    expect(excluded.size).toBe(1);
    expect(snapDelta([{ ...m, x: 205 }], [a], excluded)).toEqual({ x: 0, y: 0 });
    expect(touching([m], [a], excluded)).toEqual([]);
    snapDelta([{ ...m, x: 400 }], [a], excluded); // lontano: l'esclusione cade
    expect(excluded.size).toBe(0);
    expect(snapDelta([{ ...m, x: 205 }], [a], excluded)).toEqual({ x: -5, y: 0 });
  });
  it('trova gli agganci che non si toccano più', () => {
    const rects = new Map([['a', { x: 0, y: 0, w: 200, h: 100 }], ['b', { x: 200, y: 0, w: 100, h: 100 }]]);
    expect(brokenLinks([['a', 'b']], rects)).toEqual([]);
    rects.set('a', { x: 0, y: 0, w: 260, h: 100 });
    expect(brokenLinks([['a', 'b']], rects)).toEqual([['a', 'b']]);
  });
});

describe('contenitore chiuso', () => {
  it('si riduce alla sola barra e nasconde i suoi widget', () => {
    const box = w('box', 0, 0, { w: 300, h: 230, state: { collapsed: true } });
    const l = computeLayout([box, w('i', 10, 10, { parent: 'box' })], [], view, false, new Set(['box']));
    expect(l.get('box')!.h).toBe(BAR_H);
    expect(l.has('i')).toBe(false);
    expect(computeLayout([{ ...box, state: {} }, w('i', 10, 10, { parent: 'box' })], [], view, false, new Set(['box'])).get('box')!.h).toBe(230);
  });
});
