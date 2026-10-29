import { useCallback, useEffect, useRef } from 'react';

/** Tratto con coordinate normalizzate (0..1), così il disegno segue il ridimensionamento. */
export interface Stroke { c: string; p: number[]; w?: number }

interface Props {
  strokes: Stroke[];
  color: string;
  width?: number;
  active: boolean;
  onStroke: (s: Stroke) => void;
}

export function DrawLayer({ strokes, color, width = 2.6, active, onStroke }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef<number[] | null>(null);

  const draw = useCallback(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const paint = (c: string, lw: number, p: number[]) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let i = 0; i < p.length; i += 2) {
        const x = p[i]! * w, y = p[i + 1]! * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (p.length === 2) ctx.lineTo(p[0]! * w + 0.01, p[1]! * h);
      ctx.stroke();
    };
    strokes.forEach((s) => paint(s.c, s.w ?? 2.6, s.p));
    if (live.current) paint(color, width, live.current);
  }, [strokes, color, width]);

  useEffect(draw, [draw]);
  useEffect(() => {
    const ro = new ResizeObserver(draw);
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, [draw]);

  // offsetX/Y è già nel sistema di coordinate dell'elemento, anche con il widget inclinato.
  const point = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => [
    e.nativeEvent.offsetX / e.currentTarget.clientWidth,
    e.nativeEvent.offsetY / e.currentTarget.clientHeight,
  ];

  return (
    <canvas
      ref={ref}
      className={`draw-layer${active ? ' active' : ''}`}
      onPointerDown={(e) => {
        if (!active) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        live.current = [...point(e)];
        draw();
      }}
      onPointerMove={(e) => {
        if (!live.current) return;
        live.current.push(...point(e));
        draw();
      }}
      onPointerUp={() => {
        if (!live.current) return;
        onStroke({ c: color, w: width, p: live.current.map((n) => Math.round(n * 1000) / 1000) });
        live.current = null;
      }}
    />
  );
}
