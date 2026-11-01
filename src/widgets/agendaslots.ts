/** Mezze ore di una giornata, da 00:00 a 23:30. */
export const SLOT_COUNT = 48;

const pad = (n: number) => String(n).padStart(2, '0');

/** Chiave della mezz'ora `i` (0..47): "00:00", "00:30", … "23:30". */
export const slotKey = (i: number) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`;

/** Indice della mezz'ora in cui cade l'istante `d`. */
export const slotAt = (d: Date) => d.getHours() * 2 + (d.getMinutes() >= 30 ? 1 : 0);

/** Le voci salvate quando l'agenda era a ore intere (chiave "9") passano a "09:00". */
export function normalizeSlots(slots: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(slots)) out[/^\d{1,2}$/.test(k) ? `${pad(Number(k))}:00` : k] = v;
  return out;
}
