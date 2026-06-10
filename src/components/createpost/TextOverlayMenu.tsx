import { COLOR_MAP, type OverlayColor, type OverlaySize, type TextOverlay } from '@/lib/composeLayout';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';

interface Props {
  overlay: TextOverlay;
  onChange: (next: TextOverlay) => void;
  onClose: () => void;
}

const SIZES: { key: OverlaySize; label: string }[] = [
  { key: 'sm', label: 'Small' },
  { key: 'md', label: 'Medium' },
  { key: 'lg', label: 'Large' },
];

const COLORS: { key: OverlayColor; label: string }[] = [
  { key: 'white', label: 'White' },
  { key: 'black', label: 'Black' },
  { key: 'cream', label: 'Cream' },
  { key: 'charcoal', label: 'Charcoal' },
];

export const TextOverlayMenu = ({ overlay, onChange, onClose }: Props) => {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] bg-white border-t border-[#e5e5e5] shadow-[0_-8px_24px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide">Text</span>
        <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-4 py-3 space-y-3">
        <input
          autoFocus
          value={overlay.text}
          onChange={(e) => onChange({ ...overlay, text: e.target.value.slice(0, 60) })}
          placeholder="Add a caption…"
          maxLength={60}
          className="w-full px-3 py-2.5 rounded-lg bg-[#f5f5f5] border border-[#e5e5e5] text-sm focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#6b6b6b] uppercase">Size</span>
          <div className="flex gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s.key}
                onClick={() => onChange({ ...overlay, size: s.key })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${overlay.size === s.key ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'bg-white text-[#0a0a0a] border-[#e5e5e5]'}`}
              >{s.label}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#6b6b6b] uppercase">Color</span>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => onChange({ ...overlay, color: c.key })}
                aria-label={c.label}
                className={`w-7 h-7 rounded-full border-2 ${overlay.color === c.key ? 'border-[#ef4444]' : 'border-[#e5e5e5]'}`}
                style={{ backgroundColor: COLOR_MAP[c.key] }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#6b6b6b] uppercase">Background</span>
          <Switch checked={overlay.bgEnabled} onCheckedChange={(v) => onChange({ ...overlay, bgEnabled: v })} />
        </div>
      </div>
    </div>
  );
};
