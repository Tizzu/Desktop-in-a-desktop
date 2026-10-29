import { describe, expect, it } from 'vitest';
import { moveCard, type Columns } from './board';
import { remaining } from './countdown';
import { daysBetween } from './dates';
import { canMove, deck, emptyGrid, FACES, slide, spawn, ticTacToe, type Mark } from './games';
import { intervalPhase, totalMs } from './intervals';
import { splitBill, totals } from './money';

describe('conto alla rovescia', () => {
  it('scompone il tempo che manca e riconosce il passato', () => {
    const now = Date.UTC(2026, 0, 1);
    expect(remaining(now + 2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000, now)).toEqual({ past: false, days: 2, hours: 3, minutes: 4 });
    expect(remaining(now - 3_600_000, now)).toMatchObject({ past: true, hours: 1 });
  });
});

describe('daysBetween', () => {
  it('conta i giorni di calendario, anche a cavallo di mesi e anni', () => {
    expect(daysBetween('2026-01-30', '2026-02-02')).toBe(3);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0);
    expect(daysBetween('2026-03-05', '2026-03-01')).toBe(-4);
  });
});

describe('intervalli', () => {
  const cfg = { work: 40, rest: 20, rounds: 2 };
  it('alterna lavoro e recupero, senza recupero dopo l’ultimo giro', () => {
    expect(intervalPhase(cfg, 0)).toEqual({ phase: 'work', round: 1, left: 40_000 });
    expect(intervalPhase(cfg, 45_000)).toEqual({ phase: 'rest', round: 1, left: 15_000 });
    expect(intervalPhase(cfg, 60_000)).toEqual({ phase: 'work', round: 2, left: 40_000 });
    expect(intervalPhase(cfg, 100_000).phase).toBe('done');
    expect(totalMs(cfg)).toBe(100_000);
  });
});

describe('soldi', () => {
  it('somma entrate e uscite', () => {
    const t = totals([{ id: 'a', label: '', amount: 100 }, { id: 'b', label: '', amount: -30.5 }, { id: 'c', label: '', amount: -9.5 }]);
    expect(t).toEqual({ income: 100, spent: 40, balance: 60 });
  });
  it('divide il conto con mancia, arrotondando per eccesso', () => {
    expect(splitBill(100, 3, 0).each).toBe(33.34);
    expect(splitBill(80, 4, 10)).toMatchObject({ withTip: 88, each: 22 });
    expect(splitBill(50, 0, -5).each).toBe(50); // persone e mancia fuori scala non rompono il calcolo
  });
});

describe('bacheca', () => {
  const cols: Columns = [[{ id: '1', text: 'a' }], [], []];
  it('sposta le carte tra colonne e ai bordi non fa nulla', () => {
    const moved = moveCard(cols, '1', 1);
    expect(moved[0]).toEqual([]);
    expect(moved[1]).toEqual([{ id: '1', text: 'a' }]);
    expect(moveCard(cols, '1', -1)).toBe(cols);
    expect(moveCard(moved, '1', 1)[2]).toHaveLength(1);
    expect(moveCard(moveCard(moved, '1', 1), '1', 1)[2]).toHaveLength(1);
  });
});

describe('2048', () => {
  it('fonde le coppie una sola volta per mossa', () => {
    const g = emptyGrid();
    g[0] = [2, 2, 2, 2];
    const r = slide(g, 'left');
    expect(r.grid[0]).toEqual([4, 4, 0, 0]);
    expect(r.gained).toBe(8);
  });
  it('vale per tutte e quattro le direzioni', () => {
    const g = emptyGrid();
    g[0]![0] = 2; g[3]![0] = 2;
    expect(slide(g, 'down').grid.map((r) => r[0])).toEqual([0, 0, 0, 4]);
    expect(slide(g, 'up').grid.map((r) => r[0])).toEqual([4, 0, 0, 0]);
    expect(slide(g, 'right').grid[0]).toEqual([0, 0, 0, 2]);
  });
  it('una mossa che non cambia nulla non vale; la griglia piena e bloccata è finita', () => {
    const g = emptyGrid();
    g[0]![0] = 2;
    expect(slide(g, 'left').moved).toBe(false);
    const full = [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]];
    expect(canMove(full)).toBe(false);
    expect(canMove(emptyGrid())).toBe(false);
  });
  it('aggiunge una sola tessera in una cella libera', () => {
    const g = spawn(emptyGrid(), () => 0);
    expect(g.flat().filter(Boolean)).toEqual([2]);
    expect(spawn([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]])).toBeTruthy();
  });
});

describe('tris', () => {
  it('riconosce vittorie, pareggio e partita in corso', () => {
    expect(ticTacToe(['X', 'X', 'X', '', 'O', 'O', '', '', ''])).toBe('X');
    expect(ticTacToe(['O', 'X', '', 'X', 'O', '', '', '', 'O'])).toBe('O');
    expect(ticTacToe('XOXXOOOXX'.split('') as Mark[])).toBe('draw');
    expect(ticTacToe(Array(9).fill('') as Mark[])).toBeNull();
  });
});

describe('memory', () => {
  it('il mazzo ha ogni faccia esattamente due volte', () => {
    const d = deck();
    expect(d).toHaveLength(16);
    FACES.forEach((f) => expect(d.filter((c) => c === f)).toHaveLength(2));
  });
});
