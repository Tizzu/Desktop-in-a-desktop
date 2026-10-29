import { describe, expect, it } from 'vitest';
import { convert, formatResult } from './convert';

describe('convertitore', () => {
  it('converte lunghezze e masse', () => {
    expect(convert('length', 'mi', 'km', 1)).toBeCloseTo(1.609344, 6);
    expect(convert('mass', 'kg', 'lb', 1)).toBeCloseTo(2.20462, 4);
  });
  it('converte le temperature passando dai kelvin', () => {
    expect(convert('temperature', 'c', 'f', 100)).toBeCloseTo(212, 6);
    expect(convert('temperature', 'k', 'c', 0)).toBeCloseTo(-273.15, 6);
  });
  it('unità sconosciuta dà NaN e viene mostrata come trattino', () => {
    expect(formatResult(convert('length', 'x', 'm', 1))).toBe('—');
  });
});
