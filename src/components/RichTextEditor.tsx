import { useEffect, useRef } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';

// Debounce parent onChange so typing doesn't re-render the (often large)
// host page on every keystroke. The DOM updates immediately via the browser;
// React state catches up shortly after.
const ONCHANGE_DEBOUNCE_MS = 200;

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
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<number | null>(null);
  const pendingHtmlRef = useRef<string | null>(null);

  // Keep latest onChange without re-binding listeners.
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Flush any pending debounced update (e.g. on blur / unmount / format).
  const flush = () => {
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingHtmlRef.current != null) {
      const html = pendingHtmlRef.current;
      pendingHtmlRef.current = null;
      onChangeRef.current(html);
    }
  };

  const scheduleChange = (html: string) => {
    pendingHtmlRef.current = html;
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      const next = pendingHtmlRef.current;
      pendingHtmlRef.current = null;
      if (next != null) onChangeRef.current(next);
    }, ONCHANGE_DEBOUNCE_MS);
  };

  // Sync external value into the DOM only when it actually differs AND the
  // editor is not currently focused, AND there's no pending local edit.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (pendingHtmlRef.current != null) return;
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, [value]);

  useEffect(() => () => flush(), []);

  const exec = (cmd: 'bold' | 'italic' | 'underline') => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand(cmd);
    scheduleChange(el.innerHTML);
  };

  const handleInput = () => {
    const el = ref.current;
    if (!el) return;
    if (maxLength && (el.innerText || '').length > maxLength) {
      const text = (el.innerText || '').slice(0, maxLength);
      el.innerText = text;
    }
    scheduleChange(el.innerHTML);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const el = ref.current;
    // On Enter, auto-continue bullet list: each new line gets a "• " prefix.
    // If the current line is an empty bullet ("• "), exit the list instead.
    if (e.key === 'Enter' && !e.shiftKey && el) {
      e.preventDefault();
      try {
        if (document.queryCommandState('bold')) document.execCommand('bold');
        if (document.queryCommandState('italic')) document.execCommand('italic');
        if (document.queryCommandState('underline')) document.execCommand('underline');
      } catch {}

      // Inspect current line's text via selection.
      const sel = window.getSelection();
      let currentLine = '';
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0).cloneRange();
        range.setStart(el, 0);
        currentLine = range.toString().split('\n').pop() ?? '';
      }
      const trimmed = currentLine.trim();
      const isEmptyBullet = trimmed === '•' || trimmed === '';

      if (isEmptyBullet && trimmed === '•') {
        // Remove the lonely bullet and insert plain newline to exit list.
        for (let i = 0; i < 2; i++) document.execCommand('delete');
        document.execCommand('insertHTML', false, '<br><br>');
      } else {
        document.execCommand('insertHTML', false, '<br>• ');
      }
      onChange(el.innerHTML);
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
          onKeyDown={handleKeyDown}
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
