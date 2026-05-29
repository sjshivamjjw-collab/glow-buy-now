import React from 'react';

// Storage model:
//   New posts store body as a small HTML subset produced by RichTextEditor
//   (<strong>, <em>, <u>, <br>, <div>, <p>, <span>).
//   Older posts may still contain markdown-style markers:
//     **bold**, *italic*, __underline__
//   renderRichText() handles both transparently.

const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'br', 'div', 'p', 'span']);

/** Strip any tags/attributes we don't allow. Keeps inner text intact. */
export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  // Drop all attributes & disallowed tags. Self-closing void tags handled too.
  return html.replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?\/?>/g, (_m, tag: string, _attrs) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(t)) return '';
    if (t === 'br') return '<br>';
    return _m.startsWith('</') ? `</${t}>` : `<${t}>`;
  });
}

// ---------- Legacy markdown fallback ----------
const TOKEN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|__[^_\n]+__)/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(TOKEN);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('__') && part.endsWith('__') && part.length > 4) {
      return <u key={key}>{part.slice(2, -2)}</u>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {renderInline(line, String(i))}
      {i < lines.length - 1 && '\n'}
    </React.Fragment>
  ));
}

/** Render either HTML (new) or markdown (legacy) safely. */
export function renderRichText(text: string | null | undefined): React.ReactNode {
  if (!text) return null;
  // Heuristic: if it contains any of our allowed tags, treat as HTML.
  if (/<(strong|b|em|i|u|br|div|p|span)\b/i.test(text)) {
    const safe = sanitizeRichHtml(text);
    return <span dangerouslySetInnerHTML={{ __html: safe }} />;
  }
  return renderMarkdown(text);
}

/** Convert a legacy markdown body to our HTML subset (used when loading
 *  existing drafts / posts into the editor). */
export function markdownToHtml(text: string): string {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const withInline = escaped
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<u>$1</u>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return withInline.replace(/\n/g, '<br>');
}

/** True if the rich-text value has any visible content. */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  return html.replace(/<[^>]+>/g, '').replace(/\u00a0/g, ' ').trim().length === 0;
}
