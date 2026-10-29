import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Fuori dall'estensione non esiste l'API browser.*: i widget non devono comunque rompersi al render.
vi.mock('wxt/browser', () => ({ browser: { alarms: { create: vi.fn(), clear: vi.fn() } } }));

import { CATEGORIES } from './registry';
import { listWidgets } from './index';

describe('registro dei widget', () => {
  const defs = listWidgets();

  it('ha tipi unici e categorie valide', () => {
    const types = defs.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
    const cats = new Set(CATEGORIES.map((c) => c.id));
    defs.forEach((d) => expect(cats.has(d.category), d.type).toBe(true));
    CATEGORIES.forEach((c) => expect(defs.some((d) => d.category === c.id), c.id).toBe(true));
  });

  it.each(defs.map((d) => [d.type, d] as const))('%s si renderizza con lo stato iniziale', (_t, def) => {
    const html = renderToString(createElement(def.Component, { state: def.initialState(), onChange: () => {} }));
    expect(html.length).toBeGreaterThan(0);
  });

  it('lo stato iniziale è serializzabile (salvabile in IndexedDB)', () => {
    defs.forEach((d) => expect(() => structuredClone(d.initialState()), d.type).not.toThrow());
  });
});
