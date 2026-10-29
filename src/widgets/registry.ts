import type { ComponentType } from 'react';
import type { CategoryId } from '../core/types';

export interface WidgetProps<S = any> {
  state: S;
  onChange: (state: S) => void;
}

export interface WidgetDef<S = any> {
  type: string;
  label: string;
  icon: string;
  category: CategoryId;
  defaultSize: { w: number; h: number };
  initialState: () => S;
  Component: ComponentType<WidgetProps<S>>;
}

const defs = new Map<string, WidgetDef>();

export const registerWidget = (def: WidgetDef) => void defs.set(def.type, def);
export const getWidget = (type: string) => defs.get(type);
export const listWidgets = () => [...defs.values()];

export const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
  { id: 'notes', label: 'Appunti', icon: '🗒️' },
  { id: 'time', label: 'Tempo', icon: '⏰' },
  { id: 'numbers', label: 'Numeri', icon: '🔢' },
  { id: 'wellbeing', label: 'Benessere', icon: '🌿' },
  { id: 'media', label: 'Link e immagini', icon: '🖼️' },
  { id: 'fun', label: 'Svago', icon: '🎲' },
];
