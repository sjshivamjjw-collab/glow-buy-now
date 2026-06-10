import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, X, Check, Plus, Type, Circle, Highlighter } from 'lucide-react';
import { composeGrid, type TextOverlay, type OverlayColor, type OverlaySize, COLOR_MAP, sizePx } from '@/lib/composeLayout';
import { useToast } from '@/hooks/use-toast';

interface Cell { file: File | null; previewUrl: string | null }

interface Props {
  onDone: (files: File[]) => void;
  onCancel: () => void;
}

const SIZES: OverlaySize[] = ['sm', 'md', 'lg'];
const SIZE_LABELS: Record<OverlaySize, string> = { sm: 'S', md: 'M', lg: 'L' };
const COLORS: OverlayColor[] = ['white', 'black', 'cream', 'charcoal', 'red', 'yellow', 'pink', 'blue', 'green', 'purple'];
const LIGHT_COLORS = new Set<OverlayColor>(['white', 'cream', 'yellow']);

type Tool = 'size' | 'color' | null;

const newOverlay = (id: string): TextOverlay => ({
  id, text: '', x: 0.5, y: 0.5, size: 'md', color: 'white', bgEnabled: true, width: 0.7,
});

export const GridTextEditor = ({ onDone, onCancel }: Props) => {
  const { toast } = useToast();
  const [cells, setCells] = useState<Cell[]>([
    { file: null, previewUrl: null },
    { file: null, previewUrl: null },
    { file: null, previewUrl: null },
    { file: null, previewUrl: null },
  ]);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openTool, setOpenTool] = useState<Tool>(null);
  const [busy, setBusy] = useState(false);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const dragState = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number; w: number; h: number; moved: boolean } | null>(null);
  const resizeState = useRef<{ id: string; startX: number; startY: number; startW: number; startH: number; stageW: number } | null>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});

  useEffect(() => () => cells.forEach((c) => c.previewUrl && URL.revokeObjectURL(c.previewUrl)), []); // eslint-disable-line

  const setFile = (idx: number, fl: FileList | null) => {
    if (!fl || !fl[0]) return;
    const file = fl[0];
    if (!file.type.startsWith('image/')) return;
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
      const out = await composeGrid(files, overlays.filter((o) => o.text.trim()));
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
    setOverlays((p) => [...p, newOverlay(id)]);
    setActiveId(id);
    setEditingId(id);
    setOpenTool(null);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const updateOverlay = (id: string, patch: Partial<TextOverlay>) => {
    setOverlays((p) => p.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const removeOverlay = (id: string) => {
    setOverlays((p) => p.filter((o) => o.id !== id));
    if (activeId === id) setActiveId(null);
    if (editingId === id) setEditingId(null);
  };

  // Drag
  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (editingId === id) return;
    const stage = surfaceRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const o = overlays.find((ov) => ov.id === id);
    if (!o) return;
    setActiveId(id);
    setOpenTool(null);
    dragState.current = {
      id, startX: e.clientX, startY: e.clientY,
      ox: o.x, oy: o.y, w: rect.width, h: rect.height, moved: false,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.w;
    const dy = (e.clientY - d.startY) / d.h;
    if (Math.abs(e.clientX - d.startX) > 4 || Math.abs(e.clientY - d.startY) > 4) d.moved = true;
    updateOverlay(d.id, {
      x: Math.max(0.05, Math.min(0.95, d.ox + dx)),
      y: Math.max(0.05, Math.min(0.95, d.oy + dy)),
    });
  };
  const onPointerUp = (e: React.PointerEvent, id: string) => {
    const d = dragState.current;
    dragState.current = null;
    if (d && !d.moved && d.id === id) {
      setEditingId(id);
      setOpenTool(null);
      setTimeout(() => editInputRef.current?.focus(), 50);
    }
  };

  const active = overlays.find((o) => o.id === activeId) ?? null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={(e) => {
        if ((e.target as HTMLElement).dataset.dismissTool === '1') setOpenTool(null);
      }}
    >
      <div className="flex items-center justify-between px-3 py-3 text-white pt-[calc(env(safe-area-inset-top)+12px)]" data-dismiss-tool="1">
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

      <div className="flex-1 flex items-center justify-center px-0 relative" data-dismiss-tool="1">
        <div ref={surfaceRef} className="relative w-full aspect-square bg-white">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[2px] bg-white">
            {cells.map((c, i) => (
              <label
                key={i}
                className="relative bg-[#1a1a1a] overflow-hidden flex items-center justify-center cursor-pointer"
              >
                {c.previewUrl ? (
                  <img src={c.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/70 gap-1">
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-[10px] font-semibold">Tap to add</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => { setFile(i, e.target.files); e.target.value = ''; }}
                />
              </label>
            ))}
          </div>

          {/* Overlays */}
          {overlays.map((o) => {
            const stageW = surfaceRef.current?.clientWidth ?? 360;
            const fontPx = Math.max(9, sizePx(o.size, stageW));
            const textColor = COLOR_MAP[o.color];
            const bgColor = o.bgEnabled
              ? (LIGHT_COLORS.has(o.color) ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)')
              : 'transparent';
            const boxWidthPx = Math.round((o.width ?? 0.7) * stageW);
            const isEditing = editingId === o.id;
            const isActive = activeId === o.id;

            const onResizeDown = (e: React.PointerEvent) => {
              e.stopPropagation();
              resizeState.current = {
                id: o.id, startX: e.clientX, startY: e.clientY,
                startW: o.width ?? 0.7, startH: heights[o.id] ?? 0, stageW,
              };
              (e.target as Element).setPointerCapture?.(e.pointerId);
            };
            const onResizeMove = (e: React.PointerEvent) => {
              const r = resizeState.current;
              if (!r || r.id !== o.id) return;
              e.stopPropagation();
              const dxFrac = ((e.clientX - r.startX) * 2) / r.stageW;
              updateOverlay(o.id, { width: Math.max(0.18, Math.min(0.95, r.startW + dxFrac)) });
              const newH = Math.max(0, r.startH + (e.clientY - r.startY));
              setHeights((h) => ({ ...h, [o.id]: newH }));
            };
            const onResizeUp = () => { resizeState.current = null; };

            return (
              <div
                key={o.id}
                className="absolute select-none"
                style={{
                  left: `${o.x * 100}%`,
                  top: `${o.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${boxWidthPx}px`,
                  maxWidth: '95%',
                  touchAction: 'none',
                  zIndex: isActive ? 5 : 4,
                  pointerEvents: 'none',
                }}
              >
                <div className={`relative ${isActive && !isEditing ? 'ring-2 ring-[#ef4444] rounded-lg' : ''}`} style={{ pointerEvents: 'auto' }}>
                  {isEditing ? (
                    <textarea
                      ref={editInputRef}
                      value={o.text}
                      onChange={(e) => updateOverlay(o.id, { text: e.target.value })}
                      onBlur={() => {
                        setEditingId(null);
                        if (!o.text.trim()) removeOverlay(o.id);
                      }}
                      rows={1}
                      placeholder="Type…"
                      className="block w-full resize-none bg-transparent outline-none text-center font-semibold px-3 py-1.5 rounded-lg"
                      style={{
                        color: textColor,
                        backgroundColor: bgColor,
                        fontSize: `${fontPx}px`,
                        lineHeight: 1.25,
                        caretColor: textColor,
                        minHeight: `${Math.max(fontPx * 1.6, heights[o.id] ?? 0)}px`,
                      }}
                    />
                  ) : (
                    <div
                      onPointerDown={(e) => onPointerDown(e, o.id)}
                      onPointerMove={onPointerMove}
                      onPointerUp={(e) => onPointerUp(e, o.id)}
                      onPointerCancel={(e) => onPointerUp(e, o.id)}
                      className={`w-full px-3 py-1.5 rounded-lg font-semibold text-center cursor-move ${o.bgEnabled ? 'backdrop-blur-md' : ''}`}
                      style={{
                        color: textColor,
                        backgroundColor: bgColor,
                        fontSize: `${fontPx}px`,
                        lineHeight: 1.25,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        minHeight: heights[o.id] ? `${heights[o.id]}px` : undefined,
                      }}
                    >
                      {o.text || 'Tap to type'}
                    </div>
                  )}
                  <button
                    onClick={() => removeOverlay(o.id)}
                    aria-label="Delete text"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/80 text-white border border-white/40 flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {isActive && (
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
                        <path d="M9 1 L1 9 M9 5 L5 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating right toolbar (when an overlay is active) */}
        {active && (
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
                      onClick={() => updateOverlay(active.id, { size: sz })}
                      className={`w-9 h-9 rounded-full text-sm font-bold flex items-center justify-center ${active.size === sz ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                    >{SIZE_LABELS[sz]}</button>
                  ))}
                </div>
              )}
            />
            <ToolButton
              icon={<Circle className="w-5 h-5" fill={COLOR_MAP[active.color]} stroke="white" />}
              active={openTool === 'color'}
              onClick={() => setOpenTool(openTool === 'color' ? null : 'color')}
              expanded={openTool === 'color' && (
                <div className="flex flex-col gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateOverlay(active.id, { color: c })}
                      aria-label={c}
                      className={`w-9 h-9 rounded-full border-2 ${active.color === c ? 'border-[#ef4444]' : 'border-white/60'}`}
                      style={{ backgroundColor: COLOR_MAP[c] }}
                    />
                  ))}
                </div>
              )}
            />
            <ToolButton
              icon={<Highlighter className="w-5 h-5" />}
              active={active.bgEnabled}
              onClick={() => updateOverlay(active.id, { bgEnabled: !active.bgEnabled })}
            />
            <ToolButton
              icon={<Plus className="w-5 h-5" />}
              onClick={addOverlay}
            />
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-black/80 text-white flex items-center justify-between pb-[calc(env(safe-area-inset-bottom)+12px)]" data-dismiss-tool="1">
        <span className="text-xs opacity-80">{filledCount}/4 photos</span>
        <button type="button" onClick={addOverlay} className="flex items-center gap-1 text-sm font-semibold">
          <Plus className="w-4 h-4" /> Add text
        </button>
      </div>
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
