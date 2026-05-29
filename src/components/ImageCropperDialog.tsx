import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, X, RotateCw } from 'lucide-react';

interface Props {
  file: File | null;
  open: boolean;
  onCancel: () => void;
  onApply: (croppedFile: File) => void;
  onSkip?: () => void;
  title?: string;
}


type AspectKey = 'free' | '1' | '4_5' | '16_9';

const ASPECTS: { key: AspectKey; label: string; value: number | undefined }[] = [
  { key: 'free', label: 'Free', value: undefined },
  { key: '1', label: '1:1', value: 1 },
  { key: '4_5', label: '4:5', value: 4 / 5 },
  { key: '16_9', label: '16:9', value: 16 / 9 },
];

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

async function getCroppedFile(file: File, area: Area, rotation: number): Promise<File> {
  const src = await readFileAsDataURL(file);
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rotW = img.width * cos + img.height * sin;
  const rotH = img.width * sin + img.height * cos;

  // First draw rotated full image to an offscreen canvas
  const off = document.createElement('canvas');
  off.width = rotW;
  off.height = rotH;
  const offCtx = off.getContext('2d')!;
  offCtx.translate(rotW / 2, rotH / 2);
  offCtx.rotate(rad);
  offCtx.drawImage(img, -img.width / 2, -img.height / 2);

  // Then crop
  const out = document.createElement('canvas');
  out.width = Math.round(area.width);
  out.height = Math.round(area.height);
  const ctx = out.getContext('2d')!;
  
  ctx.drawImage(
    off,
    Math.round(area.x),
    Math.round(area.y),
    Math.round(area.width),
    Math.round(area.height),
    0,
    0,
    out.width,
    out.height,
  );

  const blob: Blob = await new Promise((resolve, reject) =>
    out.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.9),
  );
  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg' });
}

export const ImageCropperDialog = ({ file, open, onCancel, onApply, onSkip, title }: Props) => {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectKey, setAspectKey] = useState<AspectKey>('1');
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!file) { setSrc(null); return; }
    let cancelled = false;
    readFileAsDataURL(file).then(d => { if (!cancelled) setSrc(d); });
    return () => { cancelled = true; };
  }, [file]);

  // Reset transform when a new file opens
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setAspectKey('1');
      setCroppedArea(null);
    }
  }, [open, file]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const aspect = ASPECTS.find(a => a.key === aspectKey)?.value;

  const handleApply = async () => {
    if (!file || !croppedArea) return;
    setWorking(true);
    try {
      const out = await getCroppedFile(file, croppedArea, rotation);
      onApply(out);
    } catch (e) {
      console.error('crop failed', e);
      onCancel();
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-lg w-[95vw] p-0 gap-0 overflow-hidden bg-[#0a0a0a] border-[#2a2a2a] text-white">
        <div className="relative w-full h-[60vh] bg-black">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              restrictPosition={false}
            />
          )}
        </div>

        <div className="p-3 space-y-3 bg-[#0a0a0a]">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {ASPECTS.map(a => (
              <button
                key={a.key}
                type="button"
                onClick={() => setAspectKey(a.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 border transition-colors ${
                  aspectKey === a.key
                    ? 'bg-[#ef4444] border-[#ef4444] text-white'
                    : 'bg-[#161616] border-[#2a2a2a] text-[#e5e5e5]'
                }`}
              >
                {a.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="ml-auto w-9 h-9 rounded-full bg-[#161616] border border-[#2a2a2a] text-white flex items-center justify-center shrink-0"
              aria-label="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#a0a0a0] uppercase tracking-wider w-10">Zoom</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#ef4444]"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {title ? <span className="text-[11px] text-[#a0a0a0] truncate">{title}</span> : <span />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={working}
                className="px-3 py-2 rounded-xl bg-[#161616] border border-[#2a2a2a] text-white text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  disabled={working}
                  className="px-3 py-2 rounded-xl bg-[#161616] border border-[#2a2a2a] text-white text-sm font-semibold disabled:opacity-50"
                >
                  Skip crop
                </button>
              )}
              <button
                type="button"
                onClick={handleApply}
                disabled={working || !croppedArea}
                className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {working ? 'Applying…' : 'Apply'}
              </button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
