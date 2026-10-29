export type Op = '+' | '−' | '×' | '÷';

export interface CalcState {
  display: string;
  acc: number | null;
  op: Op | null;
  /** Il prossimo tasto numerico inizia un nuovo numero. */
  fresh: boolean;
}

export const initialCalc = (): CalcState => ({ display: '0', acc: null, op: null, fresh: true });

const OPS = ['+', '−', '×', '÷'];
const MAX_DIGITS = 15;

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : a / b;
  }
}

const fmt = (n: number) => (Number.isFinite(n) ? String(parseFloat(n.toPrecision(12))) : 'Errore');

/** Applica un tasto allo stato. Nessun eval: solo le quattro operazioni. */
export function press(state: CalcState, key: string): CalcState {
  let s = state;
  if (s.display === 'Errore') {
    if (key === 'C') return initialCalc();
    s = initialCalc();
  }

  if (/^[0-9]$/.test(key)) {
    if (s.fresh) return { ...s, display: key, fresh: false };
    if (s.display.replace(/[-.]/g, '').length >= MAX_DIGITS) return s;
    return { ...s, display: s.display === '0' ? key : s.display + key };
  }
  if (key === '.') {
    if (s.fresh) return { ...s, display: '0.', fresh: false };
    return s.display.includes('.') ? s : { ...s, display: s.display + '.' };
  }
  if (OPS.includes(key)) {
    const op = key as Op;
    if (s.op && s.acc !== null && !s.fresh) {
      const result = compute(s.acc, Number(s.display), s.op);
      return { display: fmt(result), acc: Number.isFinite(result) ? result : null, op, fresh: true };
    }
    return { ...s, acc: Number(s.display), op, fresh: true };
  }
  if (key === '=') {
    if (!s.op || s.acc === null) return s;
    return { display: fmt(compute(s.acc, Number(s.display), s.op)), acc: null, op: null, fresh: true };
  }
  if (key === 'C') return initialCalc();
  if (key === '⌫') {
    if (s.fresh) return s;
    const d = s.display.slice(0, -1);
    return { ...s, display: d === '' || d === '-' ? '0' : d };
  }
  if (key === '±') {
    if (s.display === '0') return s;
    return { ...s, display: s.display.startsWith('-') ? s.display.slice(1) : '-' + s.display };
  }
  if (key === '%') return { ...s, display: fmt(Number(s.display) / 100), fresh: true };
  return s;
}
