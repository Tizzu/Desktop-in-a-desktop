import { DayEntries } from './dayentries';
import { registerWidget, type WidgetProps } from './registry';

interface GratitudeState { entries: Record<string, string[]> }

registerWidget({
  type: 'gratitude',
  label: 'Gratitude',
  icon: '🙏',
  category: 'wellbeing',
  defaultSize: { w: 280, h: 220 },
  initialState: () => ({ entries: {} }),
  Component: ({ state, onChange }: WidgetProps<GratitudeState>) => (
    <DayEntries entries={state.entries} lines={3} placeholder={'Today I am grateful for'} onChange={(entries) => onChange({ entries })} />
  ),
});
