import { useEffect, useState } from 'react';
import { useT } from '../core/i18n';
import { eventToShortcut, shortcutLabel } from '../core/shortcut';

interface Props {
  label: string;
  value: string;
  /** Scorciatoia di serie: si ripristina con Backspace. */
  fallback: string;
  /** Scorciatoie già usate altrove: non si possono scegliere. */
  taken?: string[];
  onChange: (key: string) => void;
}

/** Pulsante che, cliccato, aspetta il prossimo tasto (con i suoi modificatori) e lo adotta come scorciatoia. */
export function ShortcutPicker({ label, value, fallback, taken = [], onChange }: Props) {
  const t = useT();
  const [capturing, setCapturing] = useState(false);
  const [note, setNote] = useState('');

  // Mentre si attende, il prossimo tasto diventa la scorciatoia: lo si intercetta prima di ogni altro ascoltatore.
  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') return setCapturing(false);
      const key = e.key === 'Backspace' ? fallback : eventToShortcut(e);
      if (!key) return; // solo un modificatore: si aspetta il tasto vero
      if (taken.includes(key)) return setNote(t('That shortcut is already used.'));
      onChange(key);
      setCapturing(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing, fallback, taken, onChange, t]);

  return (
    <div className="shortcut-row">
      <span>{label}</span>
      <button
        className={`shortcut-btn${capturing ? ' on' : ''}`}
        title={t('Click, then press the new shortcut (Esc cancels, Backspace restores the default)')}
        onClick={() => { setNote(''); setCapturing(!capturing); }}
        onBlur={() => { setCapturing(false); setNote(''); }}
      >
        {capturing ? t('Press a key…') : shortcutLabel(value)}
      </button>
      {note && <small className="shortcut-note" role="status">{note}</small>}
    </div>
  );
}
