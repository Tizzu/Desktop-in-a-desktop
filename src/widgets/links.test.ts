import { describe, expect, it } from 'vitest';
import { normalizeUrl, resolveQuery } from './links';

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
