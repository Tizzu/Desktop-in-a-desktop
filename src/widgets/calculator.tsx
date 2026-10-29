import type { KeyboardEvent } from 'react';
import { initialCalc, press, type CalcState } from './calc';
import { registerWidget, type WidgetProps } from './registry';

const KEYS = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '⌫', '0', '.', '='];
const KEYBOARD: Record<string, string> = { '-': '−', '*': '×', '/': '÷', Enter: '=', Backspace: '⌫', Escape: 'C', ',': '.' };

function Calculator({ state, onChange }: WidgetProps<CalcState>) {
  const onKey = (e: KeyboardEvent) => {
    const key = KEYBOARD[e.key] ?? e.key;
    if (KEYS.includes(key)) {
      e.preventDefault();
      onChange(press(state, key));
    }
  };
  return (
    <div className="calc" tabIndex={0} onKeyDown={onKey}>
      <div className="calc-display" aria-live="polite">{state.display}</div>
      <div className="calc-keys">
        {KEYS.map((k) => (
          <button key={k} className={/[÷×−+=]/.test(k) ? 'op' : k === 'C' || k === '⌫' ? 'fn' : ''} onClick={() => onChange(press(state, k))}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

registerWidget({
  type: 'calculator',
  label: 'Calculator',
  icon: '🧮',
  category: 'numbers',
  defaultSize: { w: 230, h: 320 },
  initialState: initialCalc,
  Component: Calculator,
});
