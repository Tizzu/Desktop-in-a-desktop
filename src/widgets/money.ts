export interface Entry { id: string; label: string; amount: number }

/** Entrate (positive) e uscite (negative) di un elenco di movimenti. */
export function totals(entries: Entry[]) {
  const income = entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const spent = entries.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0);
  return { income, spent, balance: income - spent };
}

/** Parte a testa per un conto diviso, con mancia in percentuale. Centesimi arrotondati per eccesso. */
export function splitBill(total: number, people: number, tipPercent: number) {
  const n = Math.max(1, Math.floor(people));
  const withTip = total * (1 + Math.max(0, tipPercent) / 100);
  return { withTip, each: Math.ceil((withTip / n) * 100 - 1e-9) / 100 };
}

export const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
