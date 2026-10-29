import { useState } from 'react';
import { makePalette } from './palette';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface PaletteState { colors: string[]; locked: boolean[] }

function Palette({ state, onChange }: WidgetProps<PaletteState>) {
  const t = useT();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (c: string) => {
    void navigator.clipboard?.writeText(c).then(() => { setCopied(c); setTimeout(() => setCopied(null), 1200); }).catch(() => {});
  };
  return (
    <div className="palette">
      <div className="swatches">
        {state.colors.map((c, i) => (
          <div key={i} className="swatch" style={{ background: c }}>
            <button className="swatch-hex" onClick={() => copy(c)} title={t('Copy')}>{copied === c ? t('Copied!') : c}</button>
            <button
              className="icon-btn"
              aria-label={state.locked[i] ? t('Unlock colour') : t('Lock colour')}
              aria-pressed={!!state.locked[i]}
              onClick={() => onChange({ ...state, locked: state.locked.map((l, j) => (j === i ? !l : l)) })}
            >{state.locked[i] ? '🔒' : '🔓'}</button>
          </div>
        ))}
      </div>
      <button className="btn primary" onClick={() => onChange({ ...state, colors: makePalette(state.colors, state.locked) })}>{t('New palette')}</button>
    </div>
  );
}

registerWidget({
  type: 'palette',
  label: 'Palette',
  icon: '🎨',
  category: 'media',
  defaultSize: { w: 330, h: 170 },
  initialState: () => ({ colors: makePalette(Array(5).fill('#000000'), Array(5).fill(false)), locked: Array(5).fill(false) }),
  Component: Palette,
});
