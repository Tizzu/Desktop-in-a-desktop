import { useMemo } from 'react';
import type { WidgetDef } from '../widgets/registry';
import { useT } from '../core/i18n';

/** Copia non interattiva del widget, scalata: usata nei cassetti e come "fantasma" durante il trascinamento. */
export function WidgetPreview({ def, scale = 1, rot = 0 }: { def: WidgetDef; scale?: number; rot?: number }) {
  const t = useT();
  const state = useMemo(() => def.initialState(), [def]);
  const { w, h } = def.defaultSize;
  return (
    <div className="preview" style={{ width: w * scale, height: h * scale }} aria-hidden>
      <div
        className="widget preview-inner"
        style={{ width: w, height: h, transform: `scale(${scale}) rotate(${rot}deg)` }}
      >
        <header className="widget-bar"><span>{def.icon} {t(def.label)}</span></header>
        <div className="widget-body">
          <def.Component state={state} onChange={() => {}} />
        </div>
      </div>
    </div>
  );
}
