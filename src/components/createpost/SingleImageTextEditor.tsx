import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, X, Check } from 'lucide-react';
import { composeSingleSlide, type TextOverlay, COLOR_MAP, sizePx } from '@/lib/composeLayout';
import { TextOverlayMenu } from './TextOverlayMenu';
import { useToast } from '@/hooks/use-toast';

interface Slide {
  id: string;
  file: File;
  previewUrl: string;
  overlay: TextOverlay;
}

interface Props {
  onDone: (files: File[]) => void;
  onCancel: () => void;
}

const makeOverlay = (id: string): TextOverlay => ({
  id,
  text: '',
  x: 0.07,
  y: 0.78,
  size: 'md',
  color: 'white',
  bgEnabled: true,
});

export const SingleImageTextEditor = ({ onDone, onCancel }: Props) => {
  const { toast } = useToast();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [active, setActive] = useState(0);
  const [editingOverlay, setEditingOverlay] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => slides.forEach((s) => URL.revokeObjectURL(s.previewUrl)), []); // eslint-disable-line

  const addFiles = (fl: FileList | null) => {
    if (!fl) return;
    const next: Slide[] = [];
    for (const f of Array.from(fl)) {
      if (!f.type.startsWith('image/')) continue;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      next.push({ id, file: f, previewUrl: URL.createObjectURL(f), overlay: makeOverlay(id) });
    }
    setSlides((prev) => [...prev, ...next]);
  };

  const removeSlide = (i: number) => {
    setSlides((prev) => {
      const c = [...prev];
      URL.revokeObjectURL(c[i].previewUrl);
      c.splice(i, 1);
      return c;
    });
    setActive(0);
  };

  const updateOverlay = (next: TextOverlay) => {
    setSlides((prev) => prev.map((s, i) => (i === active ? { ...s, overlay: next } : s)));
  };

  const handleScroll = () => {
    const t = trackRef.current;
    if (!t) return;
    const idx = Math.round(t.scrollLeft / t.clientWidth);
    if (idx !== active) {
      setActive(idx);
      setEditingOverlay(false);
    }
  };

  const handleDone = async () => {
    if (!slides.length) return;
    setBusy(true);
    try {
      const files = await Promise.all(slides.map((s, i) => composeSingleSlide(s.file, s.overlay, i)));
      onDone(files);
    } catch (e) {
      console.error(e);
      toast({ title: 'Could not export slides', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const activeSlide = slides[active];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-3 text-white pt-[calc(env(safe-area-inset-top)+12px)]">
        <button onClick={onCancel} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></button>
        <span className="text-sm font-semibold">Single Image + Text</span>
        <button
          onClick={handleDone}
          disabled={!slides.length || busy}
          className="px-3 py-1.5 rounded-full bg-[#ef4444] text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          <Check className="w-4 h-4" /> Done
        </button>
      </div>

      {/* Carousel */}
      <div className="flex-1 relative overflow-hidden">
        {slides.length === 0 ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 m-6 rounded-2xl border-2 border-dashed border-white/40 flex flex-col items-center justify-center text-white/80 gap-2"
          >
            <ImagePlus className="w-8 h-8" />
            <span className="text-sm font-semibold">Add images from gallery</span>
            <span className="text-xs opacity-70">Each slide gets its own caption</span>
          </button>
        ) : (
          <div
            ref={trackRef}
            onScroll={handleScroll}
            className="h-full w-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none' }}
          >
            {slides.map((s, i) => (
              <div key={s.id} className="relative shrink-0 w-full h-full snap-center flex items-center justify-center">
                <img src={s.previewUrl} alt="" className="max-h-full max-w-full object-contain" />
                {/* Overlay editor surface */}
                <button
                  onClick={() => { setActive(i); setEditingOverlay(true); }}
                  className="absolute"
                  style={{
                    left: `${s.overlay.x * 100}%`,
                    top: `${s.overlay.y * 100}%`,
                    maxWidth: '86%',
                  }}
                >
                  {s.overlay.text.trim() ? (
                    <span
                      className={`inline-block px-3 py-1.5 rounded-lg font-semibold text-left ${s.overlay.bgEnabled ? 'backdrop-blur-md' : ''}`}
                      style={{
                        color: COLOR_MAP[s.overlay.color],
                        backgroundColor: s.overlay.bgEnabled
                          ? (s.overlay.color === 'white' || s.overlay.color === 'cream' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)')
                          : 'transparent',
                        fontSize: `${Math.max(14, sizePx(s.overlay.size, (trackRef.current?.clientWidth ?? 360)))}px`,
                        whiteSpace: 'pre-wrap',
                      }}
                    >{s.overlay.text}</span>
                  ) : (
                    <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/85 text-[#0a0a0a]">+ Add caption</span>
                  )}
                </button>
                {s.overlay.text.trim() && i === active && (
                  <button
                    onClick={() => updateOverlay({ ...s.overlay, text: '' })}
                    aria-label="Clear text"
                    className="absolute w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                    style={{ left: `calc(${s.overlay.x * 100}% - 14px)`, top: `calc(${s.overlay.y * 100}% - 14px)` }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Remove slide */}
                <button
                  onClick={() => removeSlide(i)}
                  aria-label="Remove slide"
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination dots */}
        {slides.length > 1 && (
          <div className="absolute left-0 right-0 bottom-20 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === active ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-3 bg-black/80 text-white flex items-center justify-between pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-sm font-semibold">
          <ImagePlus className="w-5 h-5" /> Add more
        </button>
        {activeSlide && (
          <button
            onClick={() => setEditingOverlay(true)}
            className="px-3 py-1.5 rounded-full bg-white/15 text-sm font-semibold"
          >Edit text</button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
      />

      {editingOverlay && activeSlide && (
        <TextOverlayMenu
          overlay={activeSlide.overlay}
          onChange={updateOverlay}
          onClose={() => setEditingOverlay(false)}
        />
      )}
    </div>
  );
};
