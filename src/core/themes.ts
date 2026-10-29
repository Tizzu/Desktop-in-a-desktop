import type { ThemeId } from './types';

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'warm', label: 'Calore', swatch: '#d98e3a' },
  { id: 'forest', label: 'Bosco', swatch: '#5f9a6b' },
  { id: 'sea', label: 'Mare', swatch: '#4a9bb8' },
  { id: 'lavender', label: 'Lavanda', swatch: '#9a7cc4' },
  { id: 'blossom', label: 'Ciliegio', swatch: '#d9708a' },
  { id: 'system', label: 'Accento del sistema', swatch: 'conic-gradient(#e0565b, #e8a23b, #5fb760, #4a8fe0, #a665d6, #e0565b)' },
];
