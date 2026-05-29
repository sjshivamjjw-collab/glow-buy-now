import React from 'react';

// Lightweight inline formatter:
//   **bold**     -> <strong>
//   *italic*     -> <em>
//   __underline__-> <u>
// No nesting beyond one level, no block elements. Line breaks preserved.

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

export function renderRichText(text: string | null | undefined): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {renderInline(line, String(i))}
      {i < lines.length - 1 && '\n'}
    </React.Fragment>
  ));
}

export type WrapStyle = 'bold' | 'italic' | 'underline';

const WRAPPERS: Record<WrapStyle, string> = {
  bold: '**',
  italic: '*',
  underline: '__',
};

/**
 * Wrap (or unwrap) the current selection in the given textarea with the marker
 * for the requested style, then update `setValue` and restore the selection.
 */
export function applyTextStyle(
  textarea: HTMLTextAreaElement,
  value: string,
  setValue: (next: string) => void,
  style: WrapStyle,
) {
  const marker = WRAPPERS[style];
  const start = textarea.selectionStart ?? value.length;
  const end = textarea.selectionEnd ?? start;
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);

  // Toggle off if selection is already wrapped
  const isWrapped =
    selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2;

  let next: string;
  let cursorStart: number;
  let cursorEnd: number;

  if (isWrapped) {
    const inner = selected.slice(marker.length, selected.length - marker.length);
    next = before + inner + after;
    cursorStart = start;
    cursorEnd = start + inner.length;
  } else if (selected.length === 0) {
    // Insert empty markers and place cursor in the middle
    next = before + marker + marker + after;
    cursorStart = cursorEnd = start + marker.length;
  } else {
    next = before + marker + selected + marker + after;
    cursorStart = start + marker.length;
    cursorEnd = end + marker.length;
  }

  setValue(next);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorStart, cursorEnd);
  });
}
