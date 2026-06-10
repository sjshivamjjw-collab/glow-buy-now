import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, X, Check, Type, Circle, Highlighter } from 'lucide-react';
import { composeSingleSlide, type TextOverlay, type OverlayColor, type OverlaySize, COLOR_MAP, sizePx } from '@/lib/composeLayout';
import { useToast } from '@/hooks/use-toast';

interface Slide {
  id: string;
  file: File;
  previewUrl: string;
  overlay: TextOverlay;
  hasText: boolean;
}

interface Props {
  onDone: (files: File[]) => void;
  onCancel: () => void;
}

const makeOverlay = (id: string): TextOverlay => ({
  id,
  text: '',
  x: 0.5,
  y: 0.5,
  size: 'md',
  color: 'white',
  bgEnabled: true,
  width: 0.7,
});


const SIZES: OverlaySize[] = ['sm', 'md', 'lg'];
const SIZE_LABELS: Record<OverlaySize, string> = { sm: 'S', md: 'M', lg: 'L' };
const COLORS: OverlayColor[] = ['white', 'black', 'cream', 'charcoal', 'red', 'yellow', 'pink', 'blue', 'green', 'purple'];
const LIGHT_COLORS = new Set<OverlayColor>(['white', 'cream', 'yellow']);


type Tool = 'size' | 'color' | 'bg' | null;

export const SingleImageTextEditor = ({ onDone, onCancel }: Props) => {
  const { toast } = useToast();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [openTool, setOpenTool] = useState<Tool>(null);
  const [editingText, setEditingText] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const dragState = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number; w: number; h: number; moved: boolean } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; startW: number; stageW: number } | null>(null);


  useEffect(() => () => slides.forEach((s) => URL.revokeObjectURL(s.previewUrl)), []); // eslint-disable-line

  const addFiles = (fl: FileList | null) => {
    if (!fl) return;
    const next: Slide[] = [];
    for (const f of Array.from(fl)) {
      if (!f.type.startsWith('image/')) continue;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      next.push({ id, file: f, previewUrl: URL.createObjectURL(f), overlay: makeOverlay(id), hasText: false });
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

  const updateOverlay = (next: Partial<TextOverlay>) => {
    setSlides((prev) => prev.map((s, i) => (i === active ? { ...s, overlay: { ...s.overlay, ...next } } : s)));
  };

  const handleScroll = () => {
    const t = trackRef.current;
    if (!t) return;
    const idx = Math.round(t.scrollLeft / t.clientWidth);
    if (idx !== active) {
      setActive(idx);
      setOpenTool(null);
      setEditingText(false);
    }
  };

  const handleDone = async () => {
    if (!slides.length) return;
    setBusy(true);
    try {
      const files = await Promise.all(
        slides.map((s, i) => composeSingleSlide(s.file, s.hasText ? s.overlay : { ...s.overlay, text: '' }, i)),
      );
      onDone(files);
    } catch (e) {
      console.error(e);
      toast({ title: 'Could not export slides', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const addOrFocusText = () => {
    const s = slides[active];
    if (!s) return;
    if (!s.hasText) {
      setSlides((prev) => prev.map((sl, i) => (i === active ? { ...sl, hasText: true } : sl)));
    }
    setOpenTool(null);
    setEditingText(true);
    setTimeout(() => textInputRef.current?.focus(), 50);
  };

  const deleteText = () => {
    setSlides((prev) => prev.map((sl, i) => (i === active ? { ...sl, hasText: false, overlay: { ...sl.overlay, text: '' } } : sl)));
    setEditingText(false);
    setOpenTool(null);
  };

  // Drag (pointer events) - press & hold to move
  const onPointerDown = (e: React.PointerEvent, slideId: string) => {
    if (editingText) return;
    const stage = stageRefs.current[slideId];
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const s = slides.find((sl) => sl.id === slideId);
    if (!s) return;
    dragState.current = {
      id: slideId,
      startX: e.clientX,
      startY: e.clientY,
      ox: s.overlay.x,
      oy: s.overlay.y,
      w: rect.width,
      h: rect.height,
      moved: false,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.w;
    const dy = (e.clientY - d.startY) / d.h;
    if (Math.abs(e.clientX - d.startX) > 4 || Math.abs(e.clientY - d.startY) > 4) d.moved = true;
    const nx = Math.max(0.05, Math.min(0.95, d.ox + dx));
    const ny = Math.max(0.05, Math.min(0.95, d.oy + dy));
    updateOverlay({ x: nx, y: ny });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragState.current;
    dragState.current = null;
    if (d && !d.moved) {
      // tap on text → edit
      addOrFocusText();
    }
  };

  const activeSlide = slides[active];

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={(e) => {
        // collapse expanded tool when tapping empty area
        if ((e.target as HTMLElement).dataset.dismissTool === '1') setOpenTool(null);
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-3 text-white pt-[calc(env(safe-area-inset-top)+12px)]" data-dismiss-tool="1">
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
      <div className="flex-1 relative overflow-hidden" data-dismiss-tool="1">
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
            {slides.map((s, i) => {
              const isActive = i === active;
              const fontPx = Math.max(14, sizePx(s.overlay.size, trackRef.current?.clientWidth ?? 360));
              const textColor = COLOR_MAP[s.overlay.color];
              const bgColor = s.overlay.bgEnabled
                ? (LIGHT_COLORS.has(s.overlay.color) ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)')
                : 'transparent';
              return (
                <div
                  key={s.id}
                  ref={(el) => { stageRefs.current[s.id] = el; }}
                  className="relative shrink-0 w-full h-full snap-center flex items-center justify-center"
                  data-dismiss-tool="1"
                  onClick={(e) => {
                    // Tap blank canvas → add text if none, else dismiss tool
                    if (e.target === e.currentTarget) {
                      if (isActive && !s.hasText) addOrFocusText();
                      else setOpenTool(null);
                    }
                  }}
                >
                  <img src={s.previewUrl} alt="" className="max-h-full max-w-full object-contain pointer-events-none" />

                  {/* Remove slide */}
                  <button
                    onClick={() => removeSlide(i)}
                    aria-label="Remove slide"
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Draggable + resizable text overlay */}
                  {isActive && s.hasText && (() => {
                    const stageW = stageRefs.current[s.id]?.clientWidth ?? 360;
                    const boxWidthPx = Math.round((s.overlay.width ?? 0.7) * stageW);
                    const onResizeDown = (e: React.PointerEvent) => {
                      e.stopPropagation();
                      resizeState.current = {
                        startX: e.clientX,
                        startY: e.clientY,
                        startW: s.overlay.width ?? 0.7,
                        stageW,
                      };
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                    };
                    const onResizeMove = (e: React.PointerEvent) => {
                      const r = resizeState.current;
                      if (!r) return;
                      e.stopPropagation();
                      // Box grows symmetrically (anchor is center), so 1px drag = 2px width.
                      const dxFrac = ((e.clientX - r.startX) * 2) / r.stageW;
                      const nw = Math.max(0.18, Math.min(0.95, r.startW + dxFrac));
                      updateOverlay({ width: nw });
                    };
                    const onResizeUp = (e: React.PointerEvent) => {
                      resizeState.current = null;
                    };
                    return (
                      <div
                        className="absolute select-none"
                        style={{
                          left: `${s.overlay.x * 100}%`,
                          top: `${s.overlay.y * 100}%`,
                          transform: 'translate(-50%, -50%)',
                          width: `${boxWidthPx}px`,
                          maxWidth: '95%',
                          touchAction: 'none',
                        }}
                      >
                        <div className="relative">
                          {editingText ? (
                            <textarea
                              ref={textInputRef}
                              value={s.overlay.text}
                              onChange={(e) => updateOverlay({ text: e.target.value })}
                              onBlur={() => setEditingText(false)}
                              rows={1}
                              placeholder="Type…"
                              className="block w-full resize-none bg-transparent outline-none text-center font-semibold px-3 py-1.5 rounded-lg"
                              style={{
                                color: textColor,
                                backgroundColor: bgColor,
                                fontSize: `${fontPx}px`,
                                lineHeight: 1.25,
                                caretColor: textColor,
                                minHeight: `${fontPx * 1.6}px`,
                              }}
                            />
                          ) : (
                            <div
                              onPointerDown={(e) => onPointerDown(e, s.id)}
                              onPointerMove={onPointerMove}
                              onPointerUp={onPointerUp}
                              onPointerCancel={onPointerUp}
                              className={`w-full px-3 py-1.5 rounded-lg font-semibold text-center cursor-move ${s.overlay.bgEnabled ? 'backdrop-blur-md' : ''}`}
                              style={{
                                color: textColor,
                                backgroundColor: bgColor,
                                fontSize: `${fontPx}px`,
                                lineHeight: 1.25,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {s.overlay.text || 'Tap to type'}
                            </div>
                          )}
                          <button
                            onClick={deleteText}
                            aria-label="Delete text"
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/80 text-white border border-white/40 flex items-center justify-center"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {/* Resize handle (bottom-right) */}
                          <div
                            onPointerDown={onResizeDown}
                            onPointerMove={onResizeMove}
                            onPointerUp={onResizeUp}
                            onPointerCancel={onResizeUp}
                            aria-label="Resize"
                            className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-[#ef4444] flex items-center justify-center cursor-se-resize"
                            style={{ touchAction: 'none' }}
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" className="text-[#ef4444]">
                              <path d="M9 1 L1 9 M9 5 L5 9 M9 9 L9 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })()}


                  {/* Tap-to-add-text hint when empty */}
                  {isActive && !s.hasText && !editingText && (
                    <button
                      onClick={addOrFocusText}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-full bg-white/85 text-[#0a0a0a] text-xs font-semibold"
                    >
                      Tap to add text
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Floating right toolbar */}
        {activeSlide && activeSlide.hasText && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
            <ToolButton
              icon={<Type className="w-5 h-5" />}
              active={openTool === 'size'}
              onClick={() => setOpenTool(openTool === 'size' ? null : 'size')}
              expanded={openTool === 'size' && (
                <div className="flex flex-col gap-1.5">
                  {SIZES.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => updateOverlay({ size: sz })}
                      className={`w-9 h-9 rounded-full text-sm font-bold flex items-center justify-center ${activeSlide.overlay.size === sz ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                    >{SIZE_LABELS[sz]}</button>
                  ))}
                </div>
              )}
            />
            <ToolButton
              icon={<Circle className="w-5 h-5" fill={COLOR_MAP[activeSlide.overlay.color]} stroke="white" />}
              active={openTool === 'color'}
              onClick={() => setOpenTool(openTool === 'color' ? null : 'color')}
              expanded={openTool === 'color' && (
                <div className="flex flex-col gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateOverlay({ color: c })}
                      aria-label={c}
                      className={`w-9 h-9 rounded-full border-2 ${activeSlide.overlay.color === c ? 'border-[#ef4444]' : 'border-white/60'}`}
                      style={{ backgroundColor: COLOR_MAP[c] }}
                    />
                  ))}
                </div>
              )}
            />
            <ToolButton
              icon={<Highlighter className="w-5 h-5" />}
              active={activeSlide.overlay.bgEnabled}
              onClick={() => updateOverlay({ bgEnabled: !activeSlide.overlay.bgEnabled })}
            />
          </div>
        )}

        {/* Pagination dots */}
        {slides.length > 1 && (
          <div className="absolute left-0 right-0 bottom-20 flex justify-center gap-1.5 pointer-events-none">
            {slides.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === active ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-3 bg-black/80 text-white flex items-center justify-between pb-[calc(env(safe-area-inset-bottom)+12px)]" data-dismiss-tool="1">
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-sm font-semibold">
          <ImagePlus className="w-5 h-5" /> Add more
        </button>
        {activeSlide && !activeSlide.hasText && (
          <button onClick={addOrFocusText} className="px-3 py-1.5 rounded-full bg-white/15 text-sm font-semibold">
            Add text
          </button>
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
    </div>
  );
};

const ToolButton = ({
  icon,
  active,
  onClick,
  expanded,
}: {
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  expanded?: React.ReactNode | false;
}) => (
  <div className="flex items-center gap-2">
    {expanded && (
      <div className="bg-black/70 backdrop-blur rounded-full p-1.5 flex flex-col gap-1.5">{expanded}</div>
    )}
    <button
      onClick={onClick}
      className={`w-11 h-11 rounded-full flex items-center justify-center ${active ? 'bg-white text-black' : 'bg-black/60 text-white'} shadow-lg`}
    >
      {icon}
    </button>
  </div>
);
