import { registerWidget, type WidgetProps } from './registry';

interface LabelState { text: string; size: number }

function Label({ state, onChange }: WidgetProps<LabelState>) {
  return (
    <div className="label-widget">
      <input value={state.text} placeholder="Titolo" aria-label="Testo" style={{ fontSize: state.size }} onChange={(e) => onChange({ ...state, text: e.target.value })} />
      <div className="label-sizes">
        <button className="chip" aria-label="Più piccolo" onClick={() => onChange({ ...state, size: Math.max(14, state.size - 6) })}>A−</button>
        <button className="chip" aria-label="Più grande" onClick={() => onChange({ ...state, size: Math.min(72, state.size + 6) })}>A+</button>
      </div>
    </div>
  );
}

registerWidget({
  type: 'label',
  label: 'Etichetta',
  icon: '🏷️',
  category: 'media',
  defaultSize: { w: 300, h: 110 },
  initialState: () => ({ text: '', size: 32 }),
  Component: Label,
});
