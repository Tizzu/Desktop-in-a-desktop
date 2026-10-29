import { describe, expect, it } from 'vitest';
import { clampPct, percent, type ProgressState } from './progress';

const base: ProgressState = { title: '', mode: 'manual', value: 0, tasks: [] };
const task = (done: boolean) => ({ id: String(Math.random()), text: 't', done });

describe('progresso', () => {
  it('manuale: limita il valore tra 0 e 100', () => {
    expect(percent({ ...base, value: 40 })).toBe(40);
    expect(percent({ ...base, value: 140 })).toBe(100);
    expect(percent({ ...base, value: -5 })).toBe(0);
    expect(clampPct(NaN)).toBe(0);
  });
  it('sotto-task: deriva dai task completati', () => {
    const s = { ...base, mode: 'tasks' as const, tasks: [task(true), task(false), task(true), task(false)] };
    expect(percent(s)).toBe(50);
    expect(percent({ ...s, tasks: [task(true), task(true), task(false)] })).toBe(67);
  });
  it('sotto-task: senza task è 0, non una divisione per zero', () => {
    expect(percent({ ...base, mode: 'tasks' })).toBe(0);
  });
  it('il valore manuale resta salvato quando si passa ai sotto-task', () => {
    const s = { ...base, value: 30, mode: 'tasks' as const };
    expect(s.value).toBe(30);
  });
});
