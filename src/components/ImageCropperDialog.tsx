import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, X } from 'lucide-react';

interface Props {
  file: File | null;
  open: boolean;
  onCancel: () => void;
  onApply: (croppedFile: File) => void;
  onSkip?: () => void;
  title?: string;
}

// Instagram feed standard: 4:5 portrait (1080 x 1350).
const INSTAGRAM_ASPECT = 4 / 5;

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

async function getCroppedFile(file: File, area: Area): Promise<File> {
  const src = await readFileAsDataURL(file);
  const img = await loadImage(src);

  const out = document.createElement('canvas');
  out.width = Math.round(area.width);
  out.height = Math.round(area.height);
  const ctx = out.getContext('2d')!;

  ctx.drawImage(
    img,
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
      setCroppedArea(null);
    }
  }, [open, file]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const handleApply = async () => {
    if (!file || !croppedArea) return;
    setWorking(true);
    try {
      const out = await getCroppedFile(file, croppedArea);
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
        <div className="relative w-full h-[70vh] bg-black touch-none">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={4}
              aspect={INSTAGRAM_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              showGrid={true}
              zoomWithScroll={true}
            />
          )}
        </div>

        <div className="p-3 bg-[#0a0a0a]">
          <p className="text-center text-[11px] text-[#a0a0a0] mb-3">
            {title ?? 'Drag to reposition • Pinch or scroll to zoom'}
          </p>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={working}
              aria-label="Cancel"
              className="w-11 h-11 rounded-full bg-[#161616] border border-[#2a2a2a] text-white flex items-center justify-center disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                disabled={working}
                className="h-11 px-4 rounded-full bg-[#161616] border border-[#2a2a2a] text-white text-sm font-semibold disabled:opacity-50"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={handleApply}
              disabled={working || !croppedArea}
              className="flex-1 max-w-[220px] h-11 rounded-full bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {working ? 'Applying…' : 'Use photo'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
