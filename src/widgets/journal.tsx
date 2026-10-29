import { DayEntries } from './dayentries';
import { registerWidget, type WidgetProps } from './registry';

interface JournalState { entries: Record<string, string[]> }

registerWidget({
  type: 'journal',
  label: 'Diario',
  icon: '📔',
  category: 'notes',
  defaultSize: { w: 280, h: 160 },
  initialState: () => ({ entries: {} }),
  Component: ({ state, onChange }: WidgetProps<JournalState>) => (
    <DayEntries entries={state.entries} lines={1} placeholder="Una riga sulla giornata" onChange={(entries) => onChange({ entries })} />
  ),
});
