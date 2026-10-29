import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface FrameState { color: number }

const COLORS = ['#e9a23b', '#c8693f', '#7a9e6b', '#5b8a9e', '#a37fb0', '#d97a8a'];

function Frame({ state, onChange }: WidgetProps<FrameState>) {
  const t = useT();
  return (
    <div className="frame-widget" style={{ boxShadow: `inset 0 0 0 4px ${COLORS[state.color]}` }}>
      <div className="frame-colors">
        {COLORS.map((c, i) => (
          <button key={c} className={`dot${i === state.color ? ' on' : ''}`} aria-label={t('Colour {c}', { c: i + 1 })} style={{ background: c }} onClick={() => onChange({ color: i })} />
        ))}
      </div>
    </div>
  );
}

registerWidget({
  type: 'frame',
  label: 'Frame',
  icon: '🖼️',
  category: 'media',
  defaultSize: { w: 360, h: 260 },
  initialState: () => ({ color: 0 }),
  Component: Frame,
});
