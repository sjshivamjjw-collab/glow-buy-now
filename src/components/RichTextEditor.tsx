import { useEffect, useRef } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';

interface Props {
  value: string;            // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;       // applies to plain-text length
  rows?: number;            // min height (visual)
  className?: string;
  onFocus?: () => void;
}

/**
 * Mobile-friendly WYSIWYG editor. Stores content as a small HTML subset
 * (<strong>, <em>, <u>, <br>, <div>). Toolbar uses execCommand so the
 * formatting is applied in-place — users see real bold/italic/underline
 * instead of `**markdown**` markers.
 */
export default function RichTextEditor({
  value, onChange, placeholder, maxLength, rows = 5, className, onFocus,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value into the DOM only when it actually differs to avoid
  // wiping the user's caret position on every keystroke.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd: 'bold' | 'italic' | 'underline') => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // execCommand is deprecated but still the simplest cross-browser way to
    // toggle inline formatting inside a contentEditable region on mobile.
    document.execCommand(cmd);
    onChange(el.innerHTML);
  };

  const handleInput = () => {
    const el = ref.current;
    if (!el) return;
    if (maxLength && (el.innerText || '').length > maxLength) {
      const text = (el.innerText || '').slice(0, maxLength);
      el.innerText = text;
    }
    onChange(el.innerHTML);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // On Enter, drop any active inline formatting so the next line starts
    // unformatted (matches user expectation: bold a word, hit enter, type
    // plain text).
    if (e.key === 'Enter' && !e.shiftKey) {
      setTimeout(() => {
        try {
          if (document.queryCommandState('bold')) document.execCommand('bold');
          if (document.queryCommandState('italic')) document.execCommand('italic');
          if (document.queryCommandState('underline')) document.execCommand('underline');
        } catch {}
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Force plain-text paste so we don't inherit foreign styles/markup.
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const plain = (value || '').replace(/<[^>]+>/g, '').trim();
  const isEmpty = plain.length === 0;

  return (
    <div className="w-full">
      <div className="flex items-center gap-1 mb-1.5">
        {[
          { cmd: 'bold' as const, Icon: Bold, label: 'Bold' },
          { cmd: 'italic' as const, Icon: Italic, label: 'Italic' },
          { cmd: 'underline' as const, Icon: Underline, label: 'Underline' },
        ].map(({ cmd, Icon, label }) => (
          <button
            key={cmd}
            type="button"
            aria-label={label}
            onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
            onTouchStart={(e) => { e.preventDefault(); exec(cmd); }}
            className="w-9 h-9 rounded-lg bg-white border border-[#e5e5e5] flex items-center justify-center text-[#0a0a0a] active:bg-[#f5f5f5] active:scale-95 transition-all shadow-sm"
          >
            <Icon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        ))}
      </div>
      <div className="relative">
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={onFocus}
          className={`w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-[13px] whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${className ?? ''}`}
          style={{ minHeight: `${rows * 1.5 + 1}rem` }}
        />
        {isEmpty && placeholder && (
          <div className="pointer-events-none absolute left-4 top-3 right-4 text-[#a0a0a0] text-[13px] whitespace-pre-wrap">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
