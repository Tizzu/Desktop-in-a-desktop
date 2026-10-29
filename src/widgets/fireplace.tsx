import { registerWidget } from './registry';
import { useT } from '../core/i18n';

function Fireplace() {
  const t = useT();
  return (
    <div className="fire" aria-label={t('Fireplace, lit')} role="img">
      <div className="flames"><i /><i /><i /><i /><i /></div>
      <div className="logs" />
    </div>
  );
}

registerWidget({
  type: 'fireplace',
  label: 'Fireplace',
  icon: '🔥',
  category: 'fun',
  defaultSize: { w: 260, h: 200 },
  initialState: () => ({}),
  Component: Fireplace,
});
