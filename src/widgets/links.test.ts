import { describe, expect, it } from 'vitest';
import { normalizeUrl, placeItem, resolveQuery } from './links';

describe('normalizeUrl', () => {
  it('aggiunge https e accetta http/https', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/');
    expect(normalizeUrl('http://a.b/x')).toBe('http://a.b/x');
  });
  it('rifiuta schemi pericolosi e input vuoti', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('data:text/html,<b>x</b>')).toBeNull();
    expect(normalizeUrl('ftp://x.org')).toBeNull();
    expect(normalizeUrl('   ')).toBeNull();
  });
});

describe('resolveQuery', () => {
  it('riconosce gli indirizzi', () => {
    expect(resolveQuery('example.com/a')).toEqual({ kind: 'url', href: 'https://example.com/a' });
    expect(resolveQuery('https://x.org')).toEqual({ kind: 'url', href: 'https://x.org/' });
  });
  it('tratta il resto come ricerca (numeri, frasi, schemi pericolosi)', () => {
    expect(resolveQuery('3.14')).toEqual({ kind: 'search', text: '3.14' });
    expect(resolveQuery('ricetta pane')).toEqual({ kind: 'search', text: 'ricetta pane' });
    expect(resolveQuery('javascript:alert(1)')).toEqual({ kind: 'search', text: 'javascript:alert(1)' });
    expect(resolveQuery('  ')).toBeNull();
  });
});

describe('placeItem', () => {
  const l = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const ids = (x: { id: string }[]) => x.map((i) => i.id).join('');
  it('sposta in avanti e indietro', () => {
    expect(ids(placeItem(l, 'a', 2))).toBe('bca');
    expect(ids(placeItem(l, 'c', 0))).toBe('cab');
    expect(ids(placeItem(l, 'b', 1))).toBe('abc');
  });
  it('fuori misura va agli estremi; id sconosciuto non cambia nulla', () => {
    expect(ids(placeItem(l, 'a', 99))).toBe('bca');
    expect(ids(placeItem(l, 'c', -5))).toBe('cab');
    expect(placeItem(l, 'x', 1)).toBe(l);
  });
});
