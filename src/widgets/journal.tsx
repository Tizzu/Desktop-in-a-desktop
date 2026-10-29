import { DayEntries } from './dayentries';
import { registerWidget, type WidgetProps } from './registry';

interface JournalState { entries: Record<string, string[]> }

registerWidget({
  type: 'journal',
  label: 'Journal',
  icon: '📔',
  category: 'notes',
  defaultSize: { w: 280, h: 160 },
  initialState: () => ({ entries: {} }),
  Component: ({ state, onChange }: WidgetProps<JournalState>) => (
    <DayEntries entries={state.entries} lines={1} placeholder={'One line about the day'} onChange={(entries) => onChange({ entries })} />
  ),
});
