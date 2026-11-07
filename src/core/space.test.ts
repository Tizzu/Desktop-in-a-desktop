import { describe, expect, it } from 'vitest';
import { MAX_TILT, clampTilt, effectiveSearchBar, effectiveTilt, pinnedIds, randomTilt } from './space';

const w = (id: string, pinned?: boolean) => ({ id, type: 'postit', x: 0, y: 0, w: 1, h: 1, z: 1, rot: 0, pinned, state: {} });

describe('impostazioni per spazio', () => {
  const settings = { tilt: 1, searchBar: false };
  it('uno spazio senza impostazioni proprie segue quelle globali', () => {
    expect(effectiveTilt(settings, {})).toBe(1);
    expect(effectiveSearchBar(settings, { overrides: {} })).toBe(false);
  });
  it('le impostazioni proprie vincono, anche se valgono 0 o false', () => {
    expect(effectiveTilt(settings, { overrides: { tilt: 0 } })).toBe(0);
    expect(effectiveTilt(settings, { overrides: { tilt: 0.4 } })).toBe(0.4);
    expect(effectiveSearchBar(settings, { overrides: { searchBar: true } })).toBe(true);
    expect(effectiveSearchBar({ searchBar: true }, { overrides: { searchBar: false } })).toBe(false);
  });
});

describe('inclinazione', () => {
  it('resta entro il limite', () => {
    expect(clampTilt(10)).toBe(MAX_TILT);
    expect(clampTilt(-10)).toBe(-MAX_TILT);
    expect(clampTilt(1.5)).toBe(1.5);
    for (let i = 0; i < 200; i++) expect(Math.abs(randomTilt())).toBeLessThanOrEqual(MAX_TILT);
  });
});

describe('widget fissati', () => {
  it('sono quelli con il pin, o tutti se lo spazio è bloccato', () => {
    const widgets = [w('a', true), w('b'), w('c', false)];
    expect([...pinnedIds({ widgets })]).toEqual(['a']);
    expect([...pinnedIds({ widgets, locked: false })]).toEqual(['a']);
    expect([...pinnedIds({ widgets, locked: true })].sort()).toEqual(['a', 'b', 'c']);
  });
});
