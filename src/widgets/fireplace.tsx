import { registerWidget } from './registry';

function Fireplace() {
  return (
    <div className="fire" aria-label="Caminetto acceso" role="img">
      <div className="flames"><i /><i /><i /><i /><i /></div>
      <div className="logs" />
    </div>
  );
}

registerWidget({
  type: 'fireplace',
  label: 'Caminetto',
  icon: '🔥',
  category: 'fun',
  defaultSize: { w: 260, h: 200 },
  initialState: () => ({}),
  Component: Fireplace,
});
