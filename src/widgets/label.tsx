import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface LabelState { text: string; size: number }

function Label({ state, onChange }: WidgetProps<LabelState>) {
  const t = useT();
  return (
    <div className="label-widget">
      <input value={state.text} placeholder={t('Title')} aria-label={t('Text')} style={{ fontSize: state.size }} onChange={(e) => onChange({ ...state, text: e.target.value })} />
      <div className="label-sizes">
        <button className="chip" aria-label={t('Smaller')} onClick={() => onChange({ ...state, size: Math.max(14, state.size - 6) })}>A−</button>
        <button className="chip" aria-label={t('Larger')} onClick={() => onChange({ ...state, size: Math.min(72, state.size + 6) })}>A+</button>
      </div>
    </div>
  );
}

registerWidget({
  type: 'label',
  label: 'Label',
  icon: '🏷️',
  category: 'media',
  defaultSize: { w: 300, h: 110 },
  initialState: () => ({ text: '', size: 32 }),
  Component: Label,
});
