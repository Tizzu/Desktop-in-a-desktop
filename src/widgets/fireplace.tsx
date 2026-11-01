import { useLayoutEffect, useRef } from 'react';
import { registerWidget } from './registry';
import { useT } from '../core/i18n';

const SCENE = { w: 260, h: 200 };

function Fireplace() {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);

  // La scena si ingrandisce o si riduce in blocco per stare nel widget, senza deformarsi.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const s = Math.max(0.2, Math.min(el.clientWidth / SCENE.w, el.clientHeight / SCENE.h));
      if (scene.current) scene.current.style.transform = `translateX(-50%) scale(${s})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="fire" ref={box} aria-label={t('Fireplace, lit')} role="img">
      <div className="fire-scene" ref={scene}>
        <div className="flames"><i /><i /><i /><i /><i /></div>
        <div className="logs" />
      </div>
    </div>
  );
}

registerWidget({
  type: 'fireplace',
  label: 'Fireplace',
  icon: '🔥',
  category: 'fun',
  defaultSize: { w: 260, h: 230 },
  aspect: { w: SCENE.w, h: SCENE.h },
  initialState: () => ({}),
  Component: Fireplace,
});
