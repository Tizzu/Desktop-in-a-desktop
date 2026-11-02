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
  /** Vero se altri widget possono essere messi al suo interno (vedi `container.tsx`). */
  container?: boolean;
  /** Vero se lo stato contiene dati dell'utente: prima di rimuovere il widget si chiede conferma. */
  hasData?: (state: S) => boolean;
  /** Proporzioni (larghezza:altezza) del corpo del widget, sotto la barra: se presenti, ridimensionando si mantengono. */
  aspect?: { w: number; h: number };
  defaultSize: { w: number; h: number };
  initialState: () => S;
  Component: ComponentType<WidgetProps<S>>;
}

const defs = new Map<string, WidgetDef>();

export const registerWidget = (def: WidgetDef) => void defs.set(def.type, def);
export const getWidget = (type: string) => defs.get(type);
export const listWidgets = () => [...defs.values()];

export const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
  { id: 'notes', label: 'Notes', icon: '🗒️' },
  { id: 'time', label: 'Time', icon: '⏰' },
  { id: 'numbers', label: 'Numbers', icon: '🔢' },
  { id: 'wellbeing', label: 'Wellbeing', icon: '🌿' },
  { id: 'media', label: 'Links & images', icon: '🖼️' },
  { id: 'layout', label: 'Layout', icon: '🧩' },
  { id: 'fun', label: 'Fun', icon: '🎲' },
];
