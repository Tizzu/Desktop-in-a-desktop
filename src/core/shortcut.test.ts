import { describe, expect, it } from 'vitest';
import { DEFAULT_SHORTCUT, eventToShortcut, matchesShortcut, shortcutLabel, validShortcut } from './shortcut';

const key = (k: string, mods: Partial<Record<'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey', boolean>> = {}) =>
  ({ key: k, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods });

describe('scorciatoie', () => {
  it('descrive il tasto con i suoi modificatori', () => {
    expect(eventToShortcut(key('\\'))).toBe('\\');
    expect(eventToShortcut(key('K', { ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+k');
    expect(eventToShortcut(key('k', { ctrlKey: true }))).toBe('Ctrl+k');
    expect(eventToShortcut(key('F2', { altKey: true }))).toBe('Alt+F2');
    expect(eventToShortcut(key(' '))).toBe('Space');
  });
  it('Shift non conta con i simboli: "?" è già il carattere', () => {
    expect(eventToShortcut(key('?', { shiftKey: true }))).toBe('?');
  });
  it('i soli modificatori non sono una scorciatoia', () => {
    for (const k of ['Control', 'Shift', 'Alt', 'Meta', 'Dead']) expect(eventToShortcut(key(k))).toBeNull();
  });
  it('confronta indipendentemente da maiuscole e blocco maiuscole', () => {
    expect(matchesShortcut('Ctrl+k', key('K', { ctrlKey: true }))).toBe(true);
    expect(matchesShortcut('Ctrl+k', key('k'))).toBe(false);
    expect(matchesShortcut('\\', key('\\', { ctrlKey: true }))).toBe(false);
  });
  it('etichetta e validazione', () => {
    expect(shortcutLabel('Ctrl+k')).toBe('Ctrl+K');
    expect(shortcutLabel('\\')).toBe('\\');
    expect(validShortcut('')).toBe(DEFAULT_SHORTCUT);
    expect(validShortcut(5)).toBe(DEFAULT_SHORTCUT);
    expect(validShortcut('x'.repeat(40))).toBe(DEFAULT_SHORTCUT);
    expect(validShortcut('Ctrl+k')).toBe('Ctrl+k');
  });
});
