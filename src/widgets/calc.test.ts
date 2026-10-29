import { describe, expect, it } from 'vitest';
import { initialCalc, press } from './calc';

const run = (keys: string[]) => keys.reduce(press, initialCalc()).display;

describe('calcolatrice', () => {
  it('somma e concatena le operazioni', () => {
    expect(run(['1', '2', '+', '3', '=']).toString()).toBe('15');
    expect(run(['2', '+', '3', '×', '4', '='])).toBe('20');
  });
  it('gestisce decimali senza errori di virgola mobile', () => {
    expect(run(['0', '.', '1', '+', '0', '.', '2', '='])).toBe('0.3');
  });
  it('segnala la divisione per zero e riparte dopo un tasto', () => {
    expect(run(['5', '÷', '0', '='])).toBe('Error');
    expect(run(['5', '÷', '0', '=', '7'])).toBe('7');
  });
  it('supporta cambio segno, percentuale e cancellazione', () => {
    expect(run(['5', '±'])).toBe('-5');
    expect(run(['5', '0', '%'])).toBe('0.5');
    expect(run(['1', '2', '3', '⌫'])).toBe('12');
    expect(run(['9', 'C'])).toBe('0');
  });
});
