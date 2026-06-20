import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';

// Debounce parent onChange so typing doesn't re-render the (often large)
// host page on every keystroke. The DOM updates immediately via the browser;
// React state catches up shortly after.
const ONCHANGE_DEBOUNCE_MS = 200;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderPastedInline(node: Node): string {
  if (node.nodeType === 3) return escapeHtml(node.textContent || '');
  if (node.nodeType !== 1) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') return '<br>';
  const inner = Array.from(el.childNodes).map(renderPastedInline).join('');
  if (tag === 'b' || tag === 'strong') return `<strong>${inner}</strong>`;
  if (tag === 'i' || tag === 'em') return `<em>${inner}</em>`;
  if (tag === 'u' || tag === 'ins') return `<u>${inner}</u>`;
  if (tag === 'a') return inner;
  const style = el.getAttribute('style') || '';
  let out = inner;
  if (/font-weight:\s*(bold|[6-9]00)/i.test(style) || /mso-bidi-font-weight:\s*bold/i.test(style)) out = `<strong>${out}</strong>`;
  if (/font-style:\s*italic/i.test(style)) out = `<em>${out}</em>`;
  if (/text-decoration:[^;]*underline/i.test(style)) out = `<u>${out}</u>`;
  return out;
}

const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'blockquote']);

function convertPastedHtml(rawHtml: string): string {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
  doc.querySelectorAll('script,style,meta,link,head').forEach(n => n.remove());
  // Strip MS Word namespaced tags (o:p, w:*, m:*) — querySelectorAll can't
  // match namespaced selectors, so walk all elements and check tagName.
  Array.from(doc.querySelectorAll('*')).forEach(n => {
    const t = n.tagName;
    if (t && (t.includes(':') || /^(O|W|M):/i.test(t))) n.remove();
  });

  const blocks: string[] = [];

  const isWordListItem = (el: HTMLElement) => {
    const cls = el.getAttribute('class') || '';
    const style = el.getAttribute('style') || '';
    return /MsoListParagraph/i.test(cls) || /mso-list:/i.test(style);
  };

  const processBlock = (node: Node): void => {
    if (node.nodeType === 3) {
      const t = (node.textContent || '').replace(/\s+/g, ' ');
      if (t.trim()) blocks.push(escapeHtml(t.trim()));
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'ul' || tag === 'ol') {
      let i = 0;
      Array.from(el.children).forEach(child => {
        if (child.tagName.toLowerCase() !== 'li') return;
        i += 1;
        const prefix = tag === 'ol' ? `${i}. ` : '• ';
        // Inline content of li, ignoring nested lists for now
        const inlineParts: string[] = [];
        const nested: HTMLElement[] = [];
        Array.from(child.childNodes).forEach(c => {
          if (c.nodeType === 1 && /^(ul|ol)$/i.test((c as HTMLElement).tagName)) {
            nested.push(c as HTMLElement);
          } else {
            inlineParts.push(renderPastedInline(c));
          }
        });
        const inner = inlineParts.join('').trim();
        if (inner) blocks.push(prefix + inner);
        nested.forEach(processBlock);
      });
      return;
    }

    if (BLOCK_TAGS.has(tag)) {
      const hasBlockChild = Array.from(el.children).some(c =>
        BLOCK_TAGS.has(c.tagName.toLowerCase()) || /^(ul|ol)$/i.test(c.tagName)
      );
      if (hasBlockChild) {
        Array.from(el.childNodes).forEach(processBlock);
      } else {
        const inner = Array.from(el.childNodes).map(renderPastedInline).join('').trim();
        if (!inner) return;
        if (isWordListItem(el)) {
          // Word exports list items as <p class="MsoListParagraph"> with a leading bullet glyph.
          const cleaned = inner.replace(/^([•·\u2022\u25CF\-\*o]\s*|&middot;\s*)+/, '').trim();
          blocks.push('• ' + cleaned);
        } else {
          blocks.push(inner);
        }
      }
      return;
    }

    if (tag === 'br') {
      blocks.push('');
      return;
    }

    // Inline element at root level → treat as inline addition to last block
    const inline = renderPastedInline(el);
    if (inline.trim()) blocks.push(inline);
  };

  Array.from(doc.body.childNodes).forEach(processBlock);

  // Join blocks with paragraph breaks, but keep consecutive bullets tight.
  const out: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const cur = blocks[i];
    out.push(cur);
    const next = blocks[i + 1];
    if (next == null) break;
    const curBullet = /^(•|\d+\.)\s/.test(cur);
    const nextBullet = /^(•|\d+\.)\s/.test(next);
    if (curBullet && nextBullet) out.push('<br>');
    else out.push('<br><br>');
  }
  return out.join('');
}

function convertPastedText(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const parts: string[] = [];
  lines.forEach(line => {
    const t = line.replace(/\s+$/, '');
    if (!t.trim()) { parts.push(''); return; }
    const bullet = t.match(/^\s*[•\u2022\-\*]\s+(.*)$/);
    if (bullet) { parts.push('• ' + escapeHtml(bullet[1])); return; }
    const num = t.match(/^\s*(\d+)[\.\)]\s+(.*)$/);
    if (num) { parts.push(`${num[1]}. ` + escapeHtml(num[2])); return; }
    parts.push(escapeHtml(t.trim()));
  });
  // Collapse runs of empty lines into a single paragraph break
  const html: string[] = [];
  let prevEmpty = false;
  for (const p of parts) {
    if (!p) {
      if (!prevEmpty && html.length) html.push('<br>');
      prevEmpty = true;
    } else {
      if (html.length && !prevEmpty) html.push('<br>');
      html.push(p);
      prevEmpty = false;
    }
  }
  return html.join('');
}

interface Props {
  value: string;            // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;       // applies to plain-text length
  rows?: number;            // min height (visual)
  className?: string;
  onFocus?: () => void;
}

export interface RichTextEditorHandle {
  /** Insert raw HTML at the current caret position. Falls back to appending
   *  at the end if the editor is not focused. Flushes through onChange. */
  insertHtml: (html: string) => void;
  /** Remove a previously-inserted block tagged with data-pill="<key>". */
  removeByPill: (pillKey: string) => void;
  focus: () => void;
}

/**
 * Mobile-friendly WYSIWYG editor. Stores content as a small HTML subset
 * (<strong>, <em>, <u>, <br>, <div>). Toolbar uses execCommand so the
 * formatting is applied in-place — users see real bold/italic/underline
 * instead of `**markdown**` markers.
 */
const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(function RichTextEditor({
  value, onChange, placeholder, maxLength, rows = 5, className, onFocus,
}, ref) {
  const elRef = useRef<HTMLDivElement>(null);
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
    const el = elRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (pendingHtmlRef.current != null) return;
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, [value]);

  useEffect(() => () => flush(), []);

  const exec = (cmd: 'bold' | 'italic' | 'underline') => {
    const el = elRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(cmd);
    scheduleChange(el.innerHTML);
  };

  const handleInput = () => {
    const el = elRef.current;
    if (!el) return;
    if (maxLength && (el.innerText || '').length > maxLength) {
      const text = (el.innerText || '').slice(0, maxLength);
      el.innerText = text;
    }
    scheduleChange(el.innerHTML);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const el = elRef.current;
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
      scheduleChange(el.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Convert pasted content into our allowed HTML subset so bullets,
    // paragraphs and line breaks from Word/Docs/etc. are preserved without
    // dragging in foreign fonts, colors, or huge inline styles.
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const insert = html ? convertPastedHtml(html) : convertPastedText(text);
    if (insert) document.execCommand('insertHTML', false, insert);
  };

  useImperativeHandle(ref, () => ({
    focus: () => { elRef.current?.focus(); },
    insertHtml: (html: string) => {
      const el = elRef.current;
      if (!el) return;
      flush();
      const sel = window.getSelection();
      const selInside =
        document.activeElement === el &&
        sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer);
      if (selInside) {
        document.execCommand('insertHTML', false, html);
      } else {
        // Append at the end WITHOUT focusing the editor, so the user can
        // keep tapping pills and only focus when they actually want to type.
        el.insertAdjacentHTML('beforeend', html);
      }
      // Push the new HTML through the normal change pipeline (and flush so
      // the parent receives it immediately — important for draft auto-save).
      pendingHtmlRef.current = el.innerHTML;
      onChangeRef.current(el.innerHTML);
      pendingHtmlRef.current = null;
    },

    removeByPill: (pillKey: string) => {
      const el = elRef.current;
      if (!el) return;
      flush();
      const node = el.querySelector(`[data-pill="${CSS.escape(pillKey)}"]`);
      if (!node) return;
      // Drop a trailing <br> immediately after the block so we don't leave
      // an extra blank line behind.
      const next = node.nextSibling;
      if (next && next.nodeType === 1 && (next as Element).tagName === 'BR') {
        next.parentNode?.removeChild(next);
      }
      node.parentNode?.removeChild(node);
      pendingHtmlRef.current = el.innerHTML;
      onChangeRef.current(el.innerHTML);
      pendingHtmlRef.current = null;
    },
  }), []);

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
          ref={elRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={flush}
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
});

export default RichTextEditor;
