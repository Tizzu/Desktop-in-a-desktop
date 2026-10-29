export interface UnitGroup {
  label: string;
  units: { id: string; label: string; factor: number }[];
}

// `factor` = quante unità base valgono 1 unità (m, kg, l, m/s). La temperatura è gestita a parte.
export const UNIT_GROUPS: Record<string, UnitGroup> = {
  length: { label: 'Lunghezza', units: [
    { id: 'm', label: 'm', factor: 1 }, { id: 'km', label: 'km', factor: 1000 }, { id: 'cm', label: 'cm', factor: 0.01 },
    { id: 'mm', label: 'mm', factor: 0.001 }, { id: 'mi', label: 'miglia', factor: 1609.344 },
    { id: 'ft', label: 'piedi', factor: 0.3048 }, { id: 'in', label: 'pollici', factor: 0.0254 }, { id: 'yd', label: 'iarde', factor: 0.9144 },
  ] },
  mass: { label: 'Massa', units: [
    { id: 'kg', label: 'kg', factor: 1 }, { id: 'g', label: 'g', factor: 0.001 }, { id: 'mg', label: 'mg', factor: 1e-6 },
    { id: 'lb', label: 'libbre', factor: 0.45359237 }, { id: 'oz', label: 'once', factor: 0.028349523125 },
  ] },
  volume: { label: 'Volume', units: [
    { id: 'l', label: 'l', factor: 1 }, { id: 'ml', label: 'ml', factor: 0.001 }, { id: 'cup', label: 'tazze (US)', factor: 0.2365882365 },
    { id: 'tbsp', label: 'cucchiai (US)', factor: 0.01478676478125 }, { id: 'tsp', label: 'cucchiaini (US)', factor: 0.00492892159375 },
    { id: 'floz', label: 'fl oz (US)', factor: 0.0295735295625 }, { id: 'gal', label: 'galloni (US)', factor: 3.785411784 },
  ] },
  speed: { label: 'Velocità', units: [
    { id: 'ms', label: 'm/s', factor: 1 }, { id: 'kmh', label: 'km/h', factor: 1 / 3.6 },
    { id: 'mph', label: 'mph', factor: 0.44704 }, { id: 'kn', label: 'nodi', factor: 0.514444 },
  ] },
  temperature: { label: 'Temperatura', units: [
    { id: 'c', label: '°C', factor: 1 }, { id: 'f', label: '°F', factor: 1 }, { id: 'k', label: 'K', factor: 1 },
  ] },
};

const toKelvin = (u: string, v: number) => (u === 'c' ? v + 273.15 : u === 'f' ? ((v - 32) * 5) / 9 + 273.15 : v);
const fromKelvin = (u: string, k: number) => (u === 'c' ? k - 273.15 : u === 'f' ? ((k - 273.15) * 9) / 5 + 32 : k);

export function convert(group: string, from: string, to: string, value: number): number {
  if (group === 'temperature') return fromKelvin(to, toKelvin(from, value));
  const units = UNIT_GROUPS[group]?.units ?? [];
  const f = units.find((u) => u.id === from)?.factor;
  const t = units.find((u) => u.id === to)?.factor;
  return f === undefined || t === undefined ? NaN : (value * f) / t;
}

export const formatResult = (n: number) => (Number.isFinite(n) ? String(parseFloat(n.toPrecision(8))) : '—');
