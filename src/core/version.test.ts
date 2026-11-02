import { describe, expect, it } from 'vitest';
import { compareVersions } from './version';

describe('confronto di versioni', () => {
  it('ordina numericamente, non come testo', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
    expect(compareVersions('0.2.0', '0.10.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0);
  });
  it('uguali o con parti mancanti', () => {
    expect(compareVersions('0.4.0', '0.4.0')).toBe(0);
    expect(compareVersions('0.4', '0.4.0')).toBe(0);
    expect(compareVersions('0.4.1', '0.4')).toBeGreaterThan(0);
  });
  it('una versione vuota (mai vista) è la più vecchia', () => {
    expect(compareVersions('0.4.0', '')).toBeGreaterThan(0);
    expect(compareVersions('', '')).toBe(0);
  });
});
