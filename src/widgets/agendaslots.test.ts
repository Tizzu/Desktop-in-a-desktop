import { describe, expect, it } from 'vitest';
import { SLOT_COUNT, normalizeSlots, slotAt, slotKey } from './agendaslots';

describe('agenda a mezz\'ore', () => {
  it('copre le 24 ore in 48 fasce', () => {
    expect(SLOT_COUNT).toBe(48);
    expect(slotKey(0)).toBe('00:00');
    expect(slotKey(1)).toBe('00:30');
    expect(slotKey(19)).toBe('09:30');
    expect(slotKey(47)).toBe('23:30');
  });
  it('trova la fascia di un istante', () => {
    expect(slotAt(new Date(2026, 0, 1, 0, 0))).toBe(0);
    expect(slotAt(new Date(2026, 0, 1, 9, 29))).toBe(18);
    expect(slotAt(new Date(2026, 0, 1, 9, 30))).toBe(19);
    expect(slotAt(new Date(2026, 0, 1, 23, 59))).toBe(47);
  });
  it('le voci a ore intere di prima passano alle ore e mezza', () => {
    expect(normalizeSlots({ 9: 'dentista', '14': 'riunione', '09:30': 'caffè' })).toEqual({ '09:00': 'dentista', '14:00': 'riunione', '09:30': 'caffè' });
  });
});
