import { useState } from 'react';
import { addDays, dayKey } from './dates';
import { useToday } from './useToday';

/** Righe di testo per giorno, con frecce per sfogliare i giorni (usato da diario e gratitudine). */
export function DayEntries({ entries, lines, placeholder, onChange }: {
  entries: Record<string, string[]>;
  lines: number;
  placeholder: string;
  onChange: (entries: Record<string, string[]>) => void;
}) {
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const day = dayKey(addDays(new Date(`${today}T12:00`), offset));
  const rows = Array.from({ length: lines }, (_, i) => entries[day]?.[i] ?? '');
  const write = (i: number, v: string) => onChange({ ...entries, [day]: rows.map((r, j) => (j === i ? v : r)) });
  return (
    <div className="dayentries">
      <div className="dayentries-nav">
        <button className="icon-btn" aria-label="Giorno prima" onClick={() => setOffset(offset - 1)}>‹</button>
        <span>{offset === 0 ? 'Oggi' : new Date(`${day}T12:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <button className="icon-btn" aria-label="Giorno dopo" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>›</button>
      </div>
      {rows.map((r, i) => (
        <input key={i} value={r} placeholder={`${placeholder}${lines > 1 ? ` ${i + 1}` : ''}`} aria-label={`${placeholder} ${i + 1}`} onChange={(e) => write(i, e.target.value)} />
      ))}
    </div>
  );
}
