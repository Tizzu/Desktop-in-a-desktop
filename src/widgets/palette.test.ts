import { describe, expect, it } from 'vitest';
import { hslToHex, makePalette } from './palette';

describe('palette', () => {
  it('converte HSL in esadecimale', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
  });
  it('mantiene i colori bloccati e produce hex validi', () => {
    const p = makePalette(['#111111', '#222222', '#333333'], [true, false, false]);
    expect(p[0]).toBe('#111111');
    expect(p.every((c) => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
  });
});
