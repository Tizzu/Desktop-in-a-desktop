/** Scorciatoia predefinita per portare il focus sulla barra di ricerca fissa. */
export const DEFAULT_SHORTCUT = '\\';

/** Scorciatoia predefinita della modalità privacy: con i modificatori, così scatta anche mentre si scrive. */
export const DEFAULT_PRIVACY_KEY = 'Ctrl+Shift+h';

type KeyInfo = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>;

const MODIFIER_KEYS = ['Control', 'Shift', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'Dead', 'Unidentified'];

/**
 * Scorciatoia corrispondente a un tasto premuto, come testo ("\", "Ctrl+k", "Alt+F2"), oppure null se è solo un
 * modificatore. Shift conta solo con lettere e tasti con nome: per un simbolo (es. "?") è già nel carattere.
 */
export function eventToShortcut(e: KeyInfo): string | null {
  if (!e.key || MODIFIER_KEYS.includes(e.key)) return null;
  const single = e.key.length === 1;
  const key = e.key === ' ' ? 'Space' : single ? e.key.toLowerCase() : e.key;
  return [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && (!single || /\p{L}/u.test(e.key)) && 'Shift', e.metaKey && 'Meta', key]
    .filter(Boolean)
    .join('+');
}

export const matchesShortcut = (shortcut: string, e: KeyInfo) => eventToShortcut(e) === shortcut;

/** Testo da mostrare: l'ultima lettera in maiuscolo ("Ctrl+K"). */
export const shortcutLabel = (shortcut: string) => shortcut.replace(/[a-z]$/, (c) => c.toUpperCase());

/** Una scorciatoia letta dai dati salvati: testo non vuoto e ragionevole, altrimenti quella predefinita. */
export const validShortcut = (v: unknown, fallback = DEFAULT_SHORTCUT): string => (typeof v === 'string' && v.length > 0 && v.length <= 24 ? v : fallback);
