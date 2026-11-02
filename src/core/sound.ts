// Suoni dei timer, sintetizzati con WebAudio (nessun file, nessuna rete): campane morbide e lente, pensate per non spaventare.
let ctx: AudioContext | undefined;
let enabled = true;

/** Attiva o spegne i suoni dei timer (impostazione "Timer sounds"). */
export const setTimerSound = (on: boolean) => { enabled = on; };

// Do-mi-sol, una scala maggiore che sale piano; ogni nota ha un po' di armonici e si spegne in un paio di secondi.
const NOTES = [523.25, 659.25, 783.99];

function bell(c: AudioContext, freq: number, at: number, volume: number) {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.linearRampToValueAtTime(volume, at + 0.04); // attacco morbido
  out.gain.exponentialRampToValueAtTime(0.0001, at + 2.4);
  out.connect(c.destination);
  for (const [mult, level] of [[1, 1], [2, 0.28], [3.01, 0.08]] as const) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    g.gain.value = level;
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + 2.5);
  }
}

function play(notes: number[], gap: number, volume: number) {
  if (!enabled) return;
  try {
    const c = (ctx ??= new AudioContext());
    void c.resume(); // il browser può averlo sospeso finché la pagina non ha avuto un gesto
    const now = c.currentTime + 0.02;
    notes.forEach((f, i) => bell(c, f, now + i * gap, volume));
  } catch { /* audio non disponibile: il timer funziona lo stesso */ }
}

/** Fine di un timer: tre note che salgono piano. */
export const chime = () => play(NOTES, 0.45, 0.16);

/** Cambio di fase (riposo/lavoro): una nota sola, più discreta. */
export const ping = () => play([NOTES[1]!], 0, 0.11);
