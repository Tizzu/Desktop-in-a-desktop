import type { ThemeId } from './types';

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'warm', label: 'Warmth', swatch: '#d98e3a' },
  { id: 'forest', label: 'Forest', swatch: '#5f9a6b' },
  { id: 'sea', label: 'Sea', swatch: '#4a9bb8' },
  { id: 'lavender', label: 'Lavender', swatch: '#9a7cc4' },
  { id: 'blossom', label: 'Blossom', swatch: '#d9708a' },
  { id: 'system', label: 'System accent', swatch: 'conic-gradient(#e0565b, #e8a23b, #5fb760, #4a8fe0, #a665d6, #e0565b)' },
];
