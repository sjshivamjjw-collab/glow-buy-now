import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, X, Check, Plus } from 'lucide-react';
import { composeGrid, type TextOverlay, COLOR_MAP, sizePx } from '@/lib/composeLayout';
import { TextOverlayMenu } from './TextOverlayMenu';
import { useToast } from '@/hooks/use-toast';

interface Cell { file: File | null; previewUrl: string | null }

interface Props {
  onDone: (files: File[]) => void;
  onCancel: () => void;
}

const newOverlay = (id: string, y: number): TextOverlay => ({
  id, text: '', x: 0.08, y, size: 'md', color: 'white', bgEnabled: true,
});

export const GridTextEditor = ({ onDone, onCancel }: Props) => {
  const { toast } = useToast();
  const [cells, setCells] = useState<Cell[]>([
    { file: null, previewUrl: null },
    { file: null, previewUrl: null },
    { file: null, previewUrl: null },
    { file: null, previewUrl: null },
  ]);
  const [overlays, setOverlays] = useState<TextOverlay[]>([newOverlay('o-1', 0.72)]);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickingIdx = useRef<number | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => cells.forEach((c) => c.previewUrl && URL.revokeObjectURL(c.previewUrl)), []); // eslint-disable-line

  const pickFor = (i: number) => { pickingIdx.current = i; fileRef.current?.click(); };

  const setFile = (fl: FileList | null) => {
    if (!fl || !fl[0]) return;
    const file = fl[0];
    const idx = pickingIdx.current;
    if (idx == null) return;
    setCells((prev) => {
      const c = [...prev];
      if (c[idx].previewUrl) URL.revokeObjectURL(c[idx].previewUrl!);
      c[idx] = { file, previewUrl: URL.createObjectURL(file) };
      return c;
    });
  };

  const filledCount = cells.filter((c) => c.file).length;

  const handleDone = async () => {
    if (filledCount !== 4) {
      toast({ title: 'Pick 4 photos to continue', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const files = cells.map((c) => c.file!) as [File, File, File, File];
      const out = await composeGrid(files, overlays);
      onDone([out]);
    } catch (e) {
      console.error(e);
      toast({ title: 'Could not export grid', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const addOverlay = () => {
    const id = `o-${Date.now()}`;
    setOverlays((p) => [...p, newOverlay(id, 0.5)]);
    setActiveOverlay(id);
  };

  const updateActive = (next: TextOverlay) => {
    setOverlays((p) => p.map((o) => (o.id === next.id ? next : o)));
  };

  const removeOverlay = (id: string) => {
    setOverlays((p) => p.filter((o) => o.id !== id));
    if (activeOverlay === id) setActiveOverlay(null);
  };

  const active = overlays.find((o) => o.id === activeOverlay) ?? null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-3 py-3 text-white pt-[calc(env(safe-area-inset-top)+12px)]">
        <button onClick={onCancel} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></button>
        <span className="text-sm font-semibold">2×2 Grid + Text</span>
        <button
          onClick={handleDone}
          disabled={filledCount !== 4 || busy}
          className="px-3 py-1.5 rounded-full bg-[#ef4444] text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          <Check className="w-4 h-4" /> Done
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-0">
        <div ref={surfaceRef} className="relative w-full aspect-square bg-white">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[2px] bg-white">
            {cells.map((c, i) => (
              <button
                key={i}
                onClick={() => pickFor(i)}
                className="relative bg-[#1a1a1a] overflow-hidden flex items-center justify-center"
              >
                {c.previewUrl ? (
                  <img src={c.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/70 gap-1">
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-[10px] font-semibold">Tap to add</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          {/* Overlays */}
          {overlays.map((o) => (
            <div
              key={o.id}
              className="absolute"
              style={{ left: `${o.x * 100}%`, top: `${o.y * 100}%`, maxWidth: '86%' }}
            >
              <button
                onClick={() => setActiveOverlay(o.id)}
                className={`inline-block px-3 py-1.5 rounded-lg font-semibold text-left ${o.bgEnabled ? 'backdrop-blur-md' : ''} ${activeOverlay === o.id ? 'ring-2 ring-[#ef4444]' : ''}`}
                style={{
                  color: COLOR_MAP[o.color],
                  backgroundColor: o.bgEnabled
                    ? (o.color === 'white' || o.color === 'cream' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)')
                    : 'transparent',
                  fontSize: `${Math.max(13, sizePx(o.size, surfaceRef.current?.clientWidth ?? 360))}px`,
                  whiteSpace: 'pre-wrap',
                }}
              >{o.text.trim() || '+ Tap to add text'}</button>
              <button
                onClick={() => removeOverlay(o.id)}
                aria-label="Remove text"
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 bg-black/80 text-white flex items-center justify-between pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <span className="text-xs opacity-80">{filledCount}/4 photos</span>
        <button onClick={addOverlay} className="flex items-center gap-1 text-sm font-semibold">
          <Plus className="w-4 h-4" /> Add text
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { setFile(e.target.files); e.target.value = ''; pickingIdx.current = null; }}
      />

      {active && (
        <TextOverlayMenu overlay={active} onChange={updateActive} onClose={() => setActiveOverlay(null)} />
      )}
    </div>
  );
};
