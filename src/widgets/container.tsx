import { registerWidget } from './registry';

// Il contenitore non disegna i widget che ospita: li gestisce la tela (Canvas), che li tiene dentro il suo corpo.
// Qui c'è solo l'area tratteggiata; il suggerimento "trascina qui" è nello stile quando è vuoto.
function Container() {
  return <div className="container-widget" />;
}

registerWidget({
  type: 'container',
  label: 'Container',
  icon: '📦',
  category: 'media',
  container: true,
  defaultSize: { w: 420, h: 320 },
  initialState: () => ({}),
  Component: Container,
});
