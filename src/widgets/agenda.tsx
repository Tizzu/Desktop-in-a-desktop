import { useEffect, useRef, useState } from 'react';
import { dayKey } from './dates';
import { SLOT_COUNT, normalizeSlots, slotAt, slotKey } from './agendaslots';
import { useToday } from './useToday';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface AgendaState { /** Giorno a cui si riferiscono le voci: cambiato giorno, la pagina riparte vuota. */ day: string; slots: Record<string, string> }

const SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => slotKey(i));

function Agenda({ state, onChange }: WidgetProps<AgendaState>) {
  const t = useT();
  const today = useToday();
  const slots = state.day === today ? normalizeSlots(state.slots) : {};
  const [now, setNow] = useState(() => slotAt(new Date()));
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(slotAt(new Date())), 30_000);
    return () => clearInterval(id);
  }, []);

  // All'apertura la lista scorre fino alla mezz'ora attuale, così si vede subito cosa c'è adesso.
  useEffect(() => {
    const el = box.current, row = el?.querySelector<HTMLElement>('.now');
    if (el && row) el.scrollTop = row.offsetTop - el.clientHeight / 2 + row.clientHeight / 2;
  }, []);

  return (
    <div className="agenda" ref={box}>
      {SLOTS.map((time, i) => (
        <label key={time} className={i === now ? 'now' : ''}>
          <span>{time}</span>
          <input value={slots[time] ?? ''} aria-label={t('Time {time}', { time })} onChange={(e) => onChange({ day: today, slots: { ...slots, [time]: e.target.value } })} />
        </label>
      ))}
    </div>
  );
}

registerWidget({
  type: 'agenda',
  label: 'Agenda',
  icon: '🗓️',
  category: 'time',
  defaultSize: { w: 280, h: 400 },
  initialState: () => ({ day: dayKey(), slots: {} }),
  Component: Agenda,
});
