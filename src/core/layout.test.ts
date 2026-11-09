import { describe, expect, it } from 'vitest';
import { brokenLinks, computeLayout, contact, contactSide, followRoom, followers, groupsOf, nearPairs, slideRange, snapDelta, snapSlide, touching, BAR_H } from './layout';
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
    const l = computeLayout([w('a', -100, -50)], [], view, 0, none);
    expect(l.get('a')).toMatchObject({ x: 400, y: 250 });
  });
  it('rimpicciolendo la finestra i widget fuori vista vengono spinti dentro, senza toccare il dato', () => {
    const a = w('a', 300, 100);
    expect(computeLayout([a], [], { w: 1000, h: 600 }, 0, none).get('a')!.x).toBe(800);
    expect(computeLayout([a], [], { w: 600, h: 600 }, 0, none).get('a')!.x).toBe(400); // 600 - 200
    expect(a.x).toBe(300);
    expect(computeLayout([a], [], { w: 100, h: 600 }, 0, none).get('a')!.x).toBe(0); // più largo della finestra: a sinistra
  });
  it('un gruppo agganciato viene spinto come un blocco', () => {
    const l = computeLayout([w('a', 100, 0), w('b', 300, 0)], [['a', 'b']], { w: 800, h: 600 }, 1, none);
    expect(l.get('b')!.x - l.get('a')!.x).toBe(200);
    expect(l.get('b')!.x + 200).toBe(800);
    expect(l.get('a')!.tilted).toBe(false); // agganciati: dritti
  });
  it('i widget di un contenitore stanno dentro il suo corpo', () => {
    const box = w('box', -100, -100, { w: 300, h: 230 });
    const inside = w('i', 50, 20, { parent: 'box' });
    const out = w('o', 5000, 5000, { parent: 'box' });
    const l = computeLayout([box, inside, out], [], view, 1, new Set(['box']));
    const b = l.get('box')!;
    expect(l.get('i')).toMatchObject({ x: b.x + 50, y: b.y + BAR_H + 20, child: true });
    expect(l.get('o')!.x).toBe(b.x + 100); // 300 - 200
    expect(l.get('o')!.y).toBe(b.y + BAR_H + 100); // 200 - 100
    expect(b.tilted).toBe(false);
  });
  it('ordine di sovrapposizione: i figli subito sopra il contenitore', () => {
    const ws = [w('box', 0, 0, { z: 1 }), w('c', 0, 0, { z: 9, parent: 'box' }), w('top', 0, 0, { z: 2 })];
    const l = computeLayout(ws, [], view, 0, new Set(['box']));
    expect([l.get('box')!.z, l.get('c')!.z, l.get('top')!.z]).toEqual([1, 2, 3]);
  });
  it('un parent che non è un contenitore viene ignorato', () => {
    const l = computeLayout([w('a', 0, 0), w('b', 0, 0, { parent: 'a' })], [], view, 0, none);
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
    const l = computeLayout([box, w('i', 10, 10, { parent: 'box' })], [], view, 0, new Set(['box']));
    expect(l.get('box')!.h).toBe(BAR_H);
    expect(l.has('i')).toBe(false);
    expect(computeLayout([{ ...box, state: {} }, w('i', 10, 10, { parent: 'box' })], [], view, 0, new Set(['box'])).get('box')!.h).toBe(230);
  });
});

describe('quantità di inclinazione', () => {
  it('a 0 i widget sono dritti; altrimenti il margine di sporgenza cresce con la quantità', () => {
    const a = w('a', 0, 0, { rot: 3 });
    expect(computeLayout([a], [], view, 0, none).get('a')!.tilted).toBe(false);
    const half = computeLayout([a], [], view, 0.5, none).get('a')!;
    const full = computeLayout([a], [], view, 1, none).get('a')!;
    expect(half.tilted && full.tilted).toBe(true);
    expect(full.ext.x).toBeGreaterThan(half.ext.x);
  });
});

describe('da che lato si toccano', () => {
  const a = { x: 100, y: 100, w: 200, h: 100 };
  it('destra, sinistra, sotto, sopra', () => {
    expect(contactSide(a, { x: 300, y: 120, w: 50, h: 50 })).toBe('right');
    expect(contactSide(a, { x: 50, y: 120, w: 50, h: 50 })).toBe('left');
    expect(contactSide(a, { x: 120, y: 200, w: 50, h: 50 })).toBe('below');
    expect(contactSide(a, { x: 120, y: 50, w: 50, h: 50 })).toBe('above');
  });
  it('niente se non si toccano o se il tratto in comune è troppo corto', () => {
    expect(contactSide(a, { x: 310, y: 120, w: 50, h: 50 })).toBeNull();
    expect(contactSide(a, { x: 300, y: 190, w: 50, h: 50 })).toBeNull(); // 10px in comune
  });
});

describe('chi segue un ridimensionamento', () => {
  // a in alto a sinistra; b alla sua destra; c sotto b; d sotto a; e a sinistra di a
  const rects = new Map([
    ['a', { x: 100, y: 100, w: 200, h: 100 }],
    ['b', { x: 300, y: 100, w: 200, h: 100 }],
    ['c', { x: 300, y: 200, w: 200, h: 100 }],
    ['d', { x: 100, y: 200, w: 200, h: 100 }],
    ['e', { x: 0, y: 100, w: 100, h: 100 }],
  ]);
  it('i widget a destra seguono con tutto ciò che è agganciato a loro; quelli sotto seguono in verticale', () => {
    const f = followers('a', rects, [['a', 'b'], ['b', 'c']]);
    expect(f).toEqual([{ ids: ['b', 'c'], axis: 'x' }]);
    expect(followers('a', rects, [['a', 'd']])).toEqual([{ ids: ['d'], axis: 'y' }]);
  });
  it('quelli a sinistra o sopra non si muovono', () => {
    expect(followers('a', rects, [['a', 'e']])).toEqual([]);
    expect(followers('d', rects, [['a', 'd']])).toEqual([]); // a è sopra d
  });
  it('destra e sotto insieme: ognuno il suo gruppo', () => {
    const f = followers('a', rects, [['a', 'b'], ['a', 'd']]);
    expect(f.map((x) => [x.ids, x.axis])).toEqual([[['b'], 'x'], [['d'], 'y']]);
  });
  it('due vicini sullo stesso lato, agganciati fra loro, sono un gruppo solo', () => {
    const r = new Map([
      ['t', { x: 0, y: 0, w: 400, h: 100 }],
      ['u1', { x: 0, y: 100, w: 200, h: 100 }],
      ['u2', { x: 200, y: 100, w: 200, h: 100 }],
    ]);
    const f = followers('t', r, [['t', 'u1'], ['t', 'u2'], ['u1', 'u2']]);
    expect(f).toHaveLength(1);
    expect(f[0]!.ids.sort()).toEqual(['u1', 'u2']);
    expect(f[0]!.axis).toBe('y');
  });
  it('non seguono i gruppi agganciati da due lati diversi, né quelli con un widget fissato', () => {
    // b a destra e d sotto, ma c li lega: spostamenti incompatibili
    const r = new Map([...rects, ['c', { x: 300, y: 200, w: 200, h: 100 }]]);
    expect(followers('a', r, [['a', 'b'], ['a', 'd'], ['b', 'c'], ['c', 'd']])).toEqual([]);
    expect(followers('a', rects, [['a', 'b'], ['b', 'c']], new Set(['c']))).toEqual([]);
  });
  it('un widget senza agganci, o sconosciuto, non ha chi lo segue', () => {
    expect(followers('a', rects, [])).toEqual([]);
    expect(followers('zz', rects, [['a', 'b']])).toEqual([]);
  });
  it('lo spazio in cui possono spostarsi dentro la finestra', () => {
    const f = { ids: ['b', 'c'], axis: 'x' as const };
    expect(followRoom(f, rects, { w: 700, h: 600 })).toBe(200);
    expect(followRoom(f, rects, { w: 400, h: 600 })).toBe(0); // già fuori: mai negativo
    expect(followRoom({ ids: ['c'], axis: 'y' }, rects, { w: 700, h: 350 })).toBe(50);
  });
});

describe('scorrere un widget agganciato lungo il bordo', () => {
  const view = { w: 1000, h: 900 };
  // b sta a destra di a, un po' più in basso
  const rects = new Map([
    ['a', { x: 100, y: 300, w: 200, h: 200 }],
    ['b', { x: 300, y: 340, w: 200, h: 200 }],
  ]);
  it('scorre sull\'asse del bordo e resta toccato', () => {
    const s = slideRange('b', rects, [['a', 'b']], view)!;
    expect(s.axis).toBe('y');
    expect(s.lo).toBe(300 + 24 - 540); // il bordo superiore di a più MIN_OVERLAP, meno il bordo inferiore di b
    expect(s.hi).toBe(300 + 200 - 24 - 340);
  });
  it('conosce gli allineamenti: bordo superiore, inferiore e centro', () => {
    expect(slideRange('b', rects, [['a', 'b']], view)!.stops.sort((x, y) => x - y)).toEqual([-40, -40, -40]);
    const taller = new Map([['a', { x: 100, y: 300, w: 200, h: 300 }], ['b', { x: 300, y: 320, w: 200, h: 100 }]]);
    expect(slideRange('b', taller, [['a', 'b']], view)!.stops.sort((x, y) => x - y)).toEqual([-20, 80, 180]); // alto, centro, basso
  });
  it('scatta sull\'allineamento solo se è vicino, e resta nei limiti', () => {
    const s = slideRange('b', rects, [['a', 'b']], view)!;
    expect(snapSlide(-45, s)).toBe(-40); // a 5px: scatta
    expect(snapSlide(-20, s)).toBe(-20); // lontano: libero
    expect(snapSlide(9999, s)).toBe(s.hi);
    expect(snapSlide(-9999, s)).toBe(s.lo);
  });
  it('non esce dalla finestra', () => {
    const edge = new Map([['a', { x: 100, y: 0, w: 200, h: 200 }], ['b', { x: 300, y: 10, w: 200, h: 200 }]]);
    expect(slideRange('b', edge, [['a', 'b']], view)!.lo).toBe(-10); // non sopra il bordo superiore
  });
  it('dai bordi sopra e sotto si scorre in orizzontale', () => {
    const r = new Map([['a', { x: 100, y: 100, w: 200, h: 100 }], ['b', { x: 140, y: 200, w: 200, h: 100 }]]);
    expect(slideRange('b', r, [['a', 'b']], view)!.axis).toBe('x');
  });
  it('senza agganci, con agganci su lati diversi o toccati male: niente scorrimento', () => {
    expect(slideRange('b', rects, [], view)).toBeNull();
    const l = new Map([['a', { x: 0, y: 0, w: 200, h: 200 }], ['b', { x: 200, y: 0, w: 200, h: 200 }], ['c', { x: 200, y: 200, w: 200, h: 100 }]]);
    expect(slideRange('b', l, [['a', 'b'], ['b', 'c']], view)).toBeNull(); // uno a sinistra, uno sotto
    expect(slideRange('b', new Map([['a', { x: 0, y: 0, w: 100, h: 100 }], ['b', { x: 500, y: 0, w: 100, h: 100 }]]), [['a', 'b']], view)).toBeNull();
  });
});
