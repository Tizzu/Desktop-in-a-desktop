import { convert, formatResult, UNIT_GROUPS } from './convert';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface ConverterState { group: string; from: string; to: string; value: string }

const defaults = (group: string) => {
  const u = UNIT_GROUPS[group]!.units;
  return { from: u[0]!.id, to: u[1]!.id };
};

function Converter({ state, onChange }: WidgetProps<ConverterState>) {
  const t = useT();
  const group = UNIT_GROUPS[state.group] ?? UNIT_GROUPS.length!;
  const result = formatResult(convert(state.group, state.from, state.to, Number(state.value.replace(',', '.'))));
  const unitSelect = (key: 'from' | 'to') => (
    <select value={state[key]} aria-label={key === 'from' ? t('From') : t('To')} onChange={(e) => onChange({ ...state, [key]: e.target.value })}>
      {group.units.map((u) => <option key={u.id} value={u.id}>{t(u.label)}</option>)}
    </select>
  );
  return (
    <div className="conv">
      <select value={state.group} aria-label={t('Quantity')} onChange={(e) => onChange({ ...state, group: e.target.value, ...defaults(e.target.value) })}>
        {Object.entries(UNIT_GROUPS).map(([id, g]) => <option key={id} value={id}>{t(g.label)}</option>)}
      </select>
      <div className="conv-row">
        <input inputMode="decimal" value={state.value} aria-label={t('Value')} onChange={(e) => onChange({ ...state, value: e.target.value })} />
        {unitSelect('from')}
      </div>
      <button className="chip" onClick={() => onChange({ ...state, from: state.to, to: state.from })}>{t('⇅ Swap')}</button>
      <div className="conv-row">
        <output className="conv-out">{result}</output>
        {unitSelect('to')}
      </div>
    </div>
  );
}

registerWidget({
  type: 'converter',
  label: 'Converter',
  icon: '📏',
  category: 'numbers',
  defaultSize: { w: 270, h: 230 },
  initialState: () => ({ group: 'length', ...defaults('length'), value: '1' }),
  Component: Converter,
});
