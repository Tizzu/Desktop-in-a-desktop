import { useRef, type DragEvent } from 'react';
import { registerWidget, type WidgetProps } from './registry';

interface ImageState { src: string | null }

/** Riduce l'immagine (lato max 900px) prima di salvarla, per non gonfiare il database. */
async function toDataUrl(file: File, max = 900): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * scale);
  cv.height = Math.round(bmp.height * scale);
  cv.getContext('2d')!.drawImage(bmp, 0, 0, cv.width, cv.height);
  bmp.close();
  return cv.toDataURL('image/webp', 0.85);
}

function ImageWidget({ state, onChange }: WidgetProps<ImageState>) {
  const input = useRef<HTMLInputElement>(null);

  const load = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    try { onChange({ src: await toDataUrl(file) }); } catch { /* file non decodificabile */ }
  };
  const drop = (e: DragEvent) => { e.preventDefault(); void load(e.dataTransfer.files[0]); };

  return (
    <div className="img" onDragOver={(e) => e.preventDefault()} onDrop={drop}>
      {state.src ? <img src={state.src} alt="" draggable={false} /> : <p>Trascina qui un’immagine<br />oppure sceglila dal computer</p>}
      <div className="img-actions">
        <button className="chip" onClick={() => input.current?.click()}>{state.src ? 'Cambia' : 'Scegli…'}</button>
        {state.src && <button className="chip" onClick={() => onChange({ src: null })}>Togli</button>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { void load(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}

registerWidget({
  type: 'image',
  label: 'Immagine',
  icon: '🖼️',
  category: 'media',
  defaultSize: { w: 280, h: 240 },
  initialState: () => ({ src: null }),
  Component: ImageWidget,
});
