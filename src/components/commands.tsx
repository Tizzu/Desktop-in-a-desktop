import { createContext, useContext, useMemo } from 'react';
import { findWidgets } from '../core/find';
import { useT } from '../core/i18n';
import { listTemplates } from '../core/templates';
import type { AppData } from '../core/types';
import type { WidgetDef } from '../widgets/registry';

/** Tutto ciò che serve a cercare e a eseguire i comandi della scrivania: lo fornisce l'app, lo usano la palette e la barra di ricerca. */
export interface Commands {
  data: AppData;
  tools: WidgetDef[];
  /** Nome di un widget (già tradotto) da cercare e mostrare. */
  labelOf: (type: string, state: unknown) => string;
  canUndo: boolean;
  canRedo: boolean;
  /** Spazio bloccato: non si aggiungono widget. */
  locked: boolean;
  onJump: (ws: string, id: string) => void;
  onSwitch: (ws: string) => void;
  onAddTool: (def: WidgetDef) => void;
  /** Crea uno spazio, vuoto o dal modello con quell'id. */
  onNewSpace: (templateId?: string) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const CommandsContext = createContext<Commands | null>(null);
export const useCommands = () => useContext(CommandsContext);

export interface Item { key: string; icon: string; text: string; hint?: string; group: string; run: () => void }

const fold = (s: string) => s.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
const MAX_PER_GROUP = 8;

/**
 * Le voci che corrispondono a `query`: widget trovati (nel nome o nel testo, in ogni spazio), spazi, comandi e tool da aggiungere.
 * `done` si chiama prima di eseguire una voce (chiude la palette, svuota la barra…). Senza comandi non ci sono voci.
 */
export function useItems(query: string, done: () => void, cmds: Commands | null): Item[] {
  const t = useT();
  return useMemo(() => {
    if (!cmds) return [];
    const { data, tools, labelOf, canUndo, canRedo, locked, onJump, onSwitch, onAddTool, onNewSpace, onUndo, onRedo } = cmds;
    const q = fold(query.trim());
    const match = (s: string) => !q || fold(s).includes(q);
    const out: Item[] = [];
    const run = (fn: () => void) => () => { done(); fn(); };
    for (const f of findWidgets(data, query, labelOf, MAX_PER_GROUP)) {
      out.push({ key: `f:${f.id}`, icon: '🔎', text: f.label, hint: [f.snippet, f.space].filter(Boolean).join(' · '), group: 'Widgets', run: run(() => onJump(f.ws, f.id)) });
    }
    for (const w of [...data.workspaces].sort((a, b) => a.order - b.order)) {
      if (match(w.name)) out.push({ key: `s:${w.id}`, icon: '🗂️', text: t('Go to {name}', { name: w.name }), group: 'Spaces', run: run(() => onSwitch(w.id)) });
    }
    const commands: Item[] = [
      { key: 'c:undo', icon: '↶', text: t('Undo'), group: 'Commands', run: run(onUndo) },
      { key: 'c:redo', icon: '↷', text: t('Redo'), group: 'Commands', run: run(onRedo) },
      { key: 'c:new', icon: '＋', text: t('New space'), group: 'Commands', run: run(() => onNewSpace()) },
      ...listTemplates(data, t).map((tpl) => ({ key: `c:${tpl.id}`, icon: tpl.icon, text: t('New space: {name}', { name: tpl.name }), group: 'Commands', run: run(() => onNewSpace(tpl.id)) })),
    ].filter((c) => (c.key !== 'c:undo' || canUndo) && (c.key !== 'c:redo' || canRedo) && match(c.text));
    out.push(...commands);
    if (q && !locked) {
      for (const d of tools.filter((d) => match(t(d.label))).slice(0, MAX_PER_GROUP)) {
        out.push({ key: `a:${d.type}`, icon: d.icon, text: t('Add {name}', { name: t(d.label) }), group: 'Add a tool', run: run(() => onAddTool(d)) });
      }
    }
    return out;
  }, [cmds, query, done, t]);
}

interface ListProps {
  items: Item[];
  /** Indice della voce evidenziata (−1 = nessuna). */
  current: number;
  /** Prefisso degli id degli elementi (per `aria-activedescendant`). */
  idPrefix: string;
  onHover: (i: number) => void;
}

/** Elenco di voci a gruppi, uguale nella palette e nel menu della barra di ricerca. */
export function ItemList({ items, current, idPrefix, onHover }: ListProps) {
  const t = useT();
  return (
    <>
      {items.map((it, i) => (
        <li key={it.key} role="presentation">
          {(i === 0 || items[i - 1]!.group !== it.group) && <div className="palette-group">{t(it.group)}</div>}
          <div id={`${idPrefix}${it.key}`} role="option" aria-selected={i === current} className={`palette-item${i === current ? ' on' : ''}`} onMouseMove={() => onHover(i)} onClick={it.run}>
            <span aria-hidden>{it.icon}</span>
            <span className="palette-text">{it.text}</span>
            {it.hint && <small>{it.hint}</small>}
          </div>
        </li>
      ))}
    </>
  );
}
