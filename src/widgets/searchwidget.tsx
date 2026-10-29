import { SearchBox } from '../components/SearchBox';
import { registerWidget } from './registry';

registerWidget({
  type: 'search',
  label: 'Ricerca',
  icon: '🔍',
  category: 'media',
  defaultSize: { w: 380, h: 96 },
  initialState: () => ({}),
  Component: () => (
    <div className="search-widget">
      <SearchBox />
    </div>
  ),
});
