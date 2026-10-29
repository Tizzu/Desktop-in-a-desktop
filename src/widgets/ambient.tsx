import { useEffect, useRef, useState } from 'react';
import { registerWidget, type WidgetProps } from './registry';
import { useT } from '../core/i18n';

interface AmbientState { volumes: Record<string, number> }
interface Engine { setVolume: (v: number) => void; stop: () => void }

// Tutti i suoni sono sintetizzati con WebAudio: nessun file, nessuna rete.
function noise(ctx: AudioContext, kind: 'white' | 'brown') {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w * 0.5;
    else { last = (last + 0.02 * w) / 1.02; d[i] = last * 2.8; }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start();
  return src;
}

const filter = (ctx: AudioContext, type: BiquadFilterType, freq: number, q = 1) => {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
};

function simple(ctx: AudioContext, kind: 'white' | 'brown', chain: BiquadFilterNode[], base: number, lfoHz = 0, lfoDepth = 0): Engine {
  const out = ctx.createGain();
  const src = noise(ctx, kind);
  [src as AudioNode, ...chain, out].reduce((a, b) => (a.connect(b), b));
  out.connect(ctx.destination);
  let lfo: OscillatorNode | undefined;
  let lfoGain: GainNode | undefined;
  if (lfoHz) {
    lfo = ctx.createOscillator();
    lfo.frequency.value = lfoHz;
    lfoGain = ctx.createGain();
    lfo.connect(lfoGain).connect(out.gain);
    lfo.start();
  }
  return {
    setVolume(v) {
      out.gain.value = v * base;
      if (lfoGain) lfoGain.gain.value = v * base * lfoDepth;
    },
    stop() {
      src.stop();
      lfo?.stop();
      out.disconnect();
    },
  };
}

function fire(ctx: AudioContext): Engine {
  const bed = simple(ctx, 'brown', [filter(ctx, 'lowpass', 320)], 0.5);
  let vol = 0;
  let alive = true;
  let timer: ReturnType<typeof setTimeout>;
  const crackle = () => {
    if (!alive) return;
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol * (0.15 + Math.random() * 0.5);
    s.connect(filter(ctx, 'highpass', 1200)).connect(g).connect(ctx.destination);
    s.start();
    timer = setTimeout(crackle, 60 + Math.random() * 520);
  };
  crackle();
  return {
    setVolume(v) { vol = v; bed.setVolume(v); },
    stop() { alive = false; clearTimeout(timer); bed.stop(); },
  };
}

const SOUNDS: { id: string; label: string; icon: string; make: (ctx: AudioContext) => Engine }[] = [
  { id: 'rain', label: 'Rain', icon: '🌧️', make: (c) => simple(c, 'white', [filter(c, 'highpass', 800), filter(c, 'lowpass', 7000)], 0.6) },
  { id: 'waves', label: 'Waves', icon: '🌊', make: (c) => simple(c, 'brown', [filter(c, 'lowpass', 700)], 0.7, 0.11, 0.7) },
  { id: 'wind', label: 'Wind', icon: '🍃', make: (c) => simple(c, 'brown', [filter(c, 'bandpass', 500, 0.6)], 0.8, 0.07, 0.6) },
  { id: 'fire', label: 'Fireplace', icon: '🔥', make: fire },
  { id: 'white', label: 'White noise', icon: '📻', make: (c) => simple(c, 'white', [filter(c, 'lowpass', 12000)], 0.3) },
];

function Ambient({ state, onChange }: WidgetProps<AmbientState>) {
  const t = useT();
  const ctxRef = useRef<AudioContext>(undefined);
  const engines = useRef(new Map<string, Engine>());
  const [on, setOn] = useState<Record<string, boolean>>({});
  const vol = (id: string) => state.volumes[id] ?? 0.5;

  useEffect(() => {
    const map = engines.current;
    return () => {
      map.forEach((e) => e.stop());
      map.clear();
      void ctxRef.current?.close();
    };
  }, []);

  const toggle = (id: string) => {
    const existing = engines.current.get(id);
    if (existing) {
      existing.stop();
      engines.current.delete(id);
      setOn((o) => ({ ...o, [id]: false }));
      return;
    }
    const ctx = (ctxRef.current ??= new AudioContext());
    void ctx.resume();
    const engine = SOUNDS.find((s) => s.id === id)!.make(ctx);
    engine.setVolume(vol(id));
    engines.current.set(id, engine);
    setOn((o) => ({ ...o, [id]: true }));
  };

  const setVolume = (id: string, v: number) => {
    engines.current.get(id)?.setVolume(v);
    onChange({ volumes: { ...state.volumes, [id]: v } });
  };

  return (
    <ul className="ambient">
      {SOUNDS.map((s) => (
        <li key={s.id}>
          <button className={`chip${on[s.id] ? ' on' : ''}`} aria-pressed={!!on[s.id]} onClick={() => toggle(s.id)}>{s.icon} {t(s.label)}</button>
          <input type="range" min={0} max={1} step={0.01} value={vol(s.id)} aria-label={t('{sound} volume', { sound: t(s.label) })} onChange={(e) => setVolume(s.id, Number(e.target.value))} />
        </li>
      ))}
    </ul>
  );
}

registerWidget({
  type: 'ambient',
  label: 'Sounds',
  icon: '🎧',
  category: 'wellbeing',
  defaultSize: { w: 260, h: 250 },
  initialState: () => ({ volumes: {} }),
  Component: Ambient,
});
