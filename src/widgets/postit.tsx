import { DrawLayer, type Stroke } from './DrawLayer';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface PostItState {
  text: string;
  strokes?: Stroke[];
  mode?: 'text' | 'draw';
  ink?: string;
}

const COLORS = ['#3b2f23', '#c0392b', '#2e7d5b', '#2b6cb0'];

function PostIt({ state, onChange }: WidgetProps<PostItState>) {
  const t = useT();
  const strokes = state.strokes ?? [];
  const drawing = state.mode === 'draw';
  const color = state.ink ?? COLORS[0]!;
  const setInk = (ink: string) => onChange({ ...state, ink });

  return (
    <div className="postit">
      <textarea
        value={state.text}
        readOnly={drawing}
        placeholder={t('Write here…')}
        onChange={(e) => onChange({ ...state, text: e.target.value })}
      />
      <DrawLayer
        strokes={strokes}
        color={color}
        active={drawing}
        onStroke={(s) => onChange({ ...state, strokes: [...strokes, s] })}
      />
      <div className="postit-tools">
        <button className="chip" onClick={() => onChange({ ...state, mode: drawing ? 'text' : 'draw' })}>
          {drawing ? t('Aa Text') : t('✎ Draw')}
        </button>
        {drawing && (
          <>
            {COLORS.map((c) => (
              <button key={c} className={`dot${c === color ? ' on' : ''}`} style={{ background: c }} aria-label={t('Colour {c}', { c })} onClick={() => setInk(c)} />
            ))}
            <button className="chip" aria-label={t('Undo last stroke')} disabled={strokes.length === 0} onClick={() => onChange({ ...state, strokes: strokes.slice(0, -1) })}>↶</button>
            <button className="chip" aria-label={t('Clear drawing')} disabled={strokes.length === 0} onClick={() => onChange({ ...state, strokes: [] })}>🗑</button>
          </>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'postit',
  label: 'Sticky note',
  icon: '📝',
  category: 'notes',
  defaultSize: { w: 220, h: 200 },
  initialState: () => ({ text: '', strokes: [], mode: 'text' }),
  Component: PostIt,
});
