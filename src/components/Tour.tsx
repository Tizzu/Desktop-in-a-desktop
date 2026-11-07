import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useT } from '../core/i18n';

interface Step {
  id: string;
  title: string;
  body: string;
  /** Zona da evidenziare (selettore CSS); senza, la scheda sta al centro. */
  target?: string;
  art?: ReactNode;
}

const PAD = 8; // margine attorno alla zona evidenziata
const CARD_W = 360;

/** Schemi disegnati con l'HTML dell'app stessa: niente immagini da caricare, seguono il tema. */
const Anatomy = ({ labels }: { labels: [string, string, string] }) => (
  <div className="tour-art tour-anatomy" aria-hidden>
    <div className="mock">
      <div className="mock-bar"><span>📝</span><b>×</b><em className="pin p1">1</em><em className="pin p3">3</em></div>
      <div className="mock-body" />
      <i className="mock-grip" /><em className="pin p2">2</em>
    </div>
    <ol>{labels.map((l, i) => <li key={l}><em className="pin">{i + 1}</em>{l}</li>)}</ol>
  </div>
);

const Snap = () => (
  <div className="tour-art tour-snap" aria-hidden>
    <div className="mock mini"><div className="mock-bar" /><div className="mock-body" /></div>
    <span className="join">⛓</span>
    <div className="mock mini"><div className="mock-bar" /><div className="mock-body" /></div>
  </div>
);

const Box = () => (
  <div className="tour-art tour-box" aria-hidden>
    <div className="mock wide">
      <div className="mock-bar"><span>📦 Work</span><b>✎ ▾ ×</b></div>
      <div className="mock-inner"><div className="mock mini" /><div className="mock mini" /></div>
    </div>
  </div>
);

interface Props {
  onClose: () => void;
}

/** Visita guidata: una scheda alla volta, con la zona di cui parla in evidenza sul resto della pagina. */
export function Tour({ onClose }: Props) {
  const t = useT();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const next = useRef<HTMLButtonElement>(null);

  const steps: Step[] = [
    { id: 'welcome', title: t('Welcome to your desk'), body: t('Desktop in a Desktop turns your new tab into a free-form desk of widgets. This one-minute tour shows how it works; you can skip it and replay it later from Settings.') },
    { id: 'drawer', target: '.drawer-track', title: t('Your tools'), body: t('These are the widgets. Drag one from here and drop it anywhere on the desk. The icons on the left switch between categories.') },
    {
      id: 'move',
      title: t('Move, resize, remove'),
      body: t('Grab a widget by its title bar to move it (give it a flick and it keeps sliding). Drag the corner to resize it.'),
      art: <Anatomy labels={[t('Title bar: drag to move'), t('Corner: drag to resize'), t('Cross: remove')]} />,
    },
    {
      id: 'snap',
      title: t('Stick widgets together'),
      body: t('Bring one widget\'s edge close to another\'s and they snap together: from then on they move as one, whichever title bar you grab. Hover the join and press the broken chain to detach them. Hold Alt while dragging to avoid snapping.'),
      art: <Snap />,
    },
    {
      id: 'box',
      title: t('Containers'),
      body: t('The Container (under Layout) holds other widgets: drop them inside, take them out whenever you like. Rename it with the pencil, and close it with the arrow to hide everything inside.'),
      art: <Box />,
    },
    { id: 'spaces', target: '.tabs', title: t('Spaces'), body: t('Each space is a separate desk, like browser tabs. Add one with the plus, double-click a name to rename it, and use the ⚙ next to the name for that space\'s own options.') },
    { id: 'settings', target: '.settings-btn', title: t('Make it yours'), body: t('Colours, tilt, the search bar and its shortcut, privacy mode, language… and Export / Import to back up or share your desk, even as a text you can paste into a chat.') },
    { id: 'done', title: t('That\'s it!'), body: t('You can replay this tour any time from Settings → Quick tour. Enjoy your desk.') },
  ];
  const step = steps[i]!;
  const last = i === steps.length - 1;

  // Misura la zona evidenziata, e la rimisura se la finestra cambia.
  useLayoutEffect(() => {
    const measure = () => {
      const el = step.target ? document.querySelector(step.target) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step.target]);

  useEffect(() => next.current?.focus(), [i]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setI((n) => Math.min(steps.length - 1, n + 1));
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, steps.length]);

  // La scheda sta sotto la zona se questa è nella metà alta della finestra, sopra altrimenti; senza zona, al centro.
  const card: React.CSSProperties = rect
    ? {
        left: Math.max(12, Math.min(window.innerWidth - CARD_W - 12, rect.left + rect.width / 2 - CARD_W / 2)),
        ...(rect.top + rect.height / 2 < window.innerHeight / 2 ? { top: rect.bottom + PAD + 14 } : { bottom: window.innerHeight - rect.top + PAD + 14 }),
      }
    : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={t('Quick tour')}>
      <div className={`tour-shade${rect ? '' : ' dim'}`} />
      {rect && (
        <div
          className="tour-hole"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      )}
      <div className="tour-card" style={{ width: CARD_W, ...card }}>
        <span className="tour-count">{i + 1} / {steps.length}</span>
        <h2>{step.title}</h2>
        {step.art}
        <p>{step.body}</p>
        <div className="tour-actions">
          {!last && <button className="tour-skip" onClick={onClose}>{t('Skip tour')}</button>}
          <span />
          {i > 0 && <button className="tour-btn" onClick={() => setI(i - 1)}>{t('Back')}</button>}
          <button ref={next} className="tour-btn primary" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? t('Done') : t('Next')}</button>
        </div>
      </div>
    </div>
  );
}
