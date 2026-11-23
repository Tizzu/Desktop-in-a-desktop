import { useEffect } from 'react';

export interface ToastData { id: number; text: string; action?: { label: string; run: () => void } }

/** Avviso breve in basso, con un'azione facoltativa (es. «Annulla»); sparisce da solo. */
export function Toast({ toast, onClose, ms = 6000 }: { toast: ToastData; onClose: () => void; ms?: number }) {
  useEffect(() => {
    const id = setTimeout(onClose, ms);
    return () => clearTimeout(id);
  }, [toast.id, ms, onClose]);
  return (
    <div className="toast" role="status">
      <span>{toast.text}</span>
      {toast.action && <button onClick={() => { toast.action!.run(); onClose(); }}>{toast.action.label}</button>}
    </div>
  );
}
