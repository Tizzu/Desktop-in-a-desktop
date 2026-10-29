import { DayEntries } from './dayentries';
import { registerWidget, type WidgetProps } from './registry';

interface GratitudeState { entries: Record<string, string[]> }

registerWidget({
  type: 'gratitude',
  label: 'Gratitudine',
  icon: '🙏',
  category: 'wellbeing',
  defaultSize: { w: 280, h: 220 },
  initialState: () => ({ entries: {} }),
  Component: ({ state, onChange }: WidgetProps<GratitudeState>) => (
    <DayEntries entries={state.entries} lines={3} placeholder="Oggi sono grato per" onChange={(entries) => onChange({ entries })} />
  ),
});
