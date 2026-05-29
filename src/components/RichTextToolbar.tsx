import { Bold, Italic, Underline } from 'lucide-react';
import { applyTextStyle, type WrapStyle } from '@/lib/richText';

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
  className?: string;
}

const BUTTONS: { style: WrapStyle; icon: typeof Bold; label: string }[] = [
  { style: 'bold', icon: Bold, label: 'Bold' },
  { style: 'italic', icon: Italic, label: 'Italic' },
  { style: 'underline', icon: Underline, label: 'Underline' },
];

export default function RichTextToolbar({ textareaRef, value, onChange, className }: Props) {
  const trigger = (style: WrapStyle) => {
    const ta = textareaRef.current;
    if (!ta) return;
    applyTextStyle(ta, value, onChange, style);
  };

  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      {BUTTONS.map(({ style, icon: Icon, label }) => (
        <button
          key={style}
          type="button"
          aria-label={label}
          // Use onMouseDown/onTouchStart with preventDefault so the textarea
          // keeps focus & selection while we apply the style.
          onMouseDown={(e) => { e.preventDefault(); trigger(style); }}
          onTouchStart={(e) => { e.preventDefault(); trigger(style); }}
          className="w-9 h-9 rounded-lg bg-white border border-[#e5e5e5] flex items-center justify-center text-[#0a0a0a] active:bg-[#f5f5f5] active:scale-95 transition-all shadow-sm"
        >
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </button>
      ))}
      <span className="ml-1 text-[10px] text-[#9b9b9b] leading-tight hidden sm:inline">Select text, then tap</span>
    </div>
  );
}
