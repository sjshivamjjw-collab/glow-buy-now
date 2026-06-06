# Travel Diaries — Optional Post Structuring Helper

Add a lightweight, optional helper to the Travel Diaries (`category === 'trip'`) flow on the post creation page. It surfaces 9 section templates as pills that inject formatted snippets into the body editor at the cursor. Fully optional, no validation, no forced structure.

## Scope

- Only shown when `category === 'trip'`.
- Lives directly above the body editor in `src/pages/CreatePostPage.tsx`.
- Snippets get inserted into the existing `RichTextEditor`'s HTML body via the editor's contentEditable DOM (cursor-aware), with a fallback to append at the end.
- Also wire into `EditPostPage.tsx` so the same helper is available when editing a Travel Diaries post (consistency — minor add, same component).

## UI

Collapsed default state, directly above the body editor:

```text
Need help structuring your post? Click here
```

Subtle link styling (small text, muted color, underline on tap). When tapped, a compact panel expands underneath showing 9 pills in a 3×3 grid:

```text
[ 💰 Cost Breakdown ] [ 🙄 Overrated ]   [ 😲 Surprises ]
[ 💡 Mistakes ]       [ 📍 How To Reach ][ ⚠️ Rules & Scams ]
[ 🕒 Itinerary ]      [ ✨ Tips ]        [ ✍️ My Experience ]
```

- Small rounded pills, lightweight border, no card chrome.
- Selected pills get the existing red accent styling (`bg-[#ef4444]/10 border-[#ef4444] text-[#ef4444]`) used elsewhere for active toggles.
- Multi-select. Tapping a selected pill does NOT remove the injected text (text belongs to the user now); it just stays visually active so they remember they used it. Re-tapping an active pill is a no-op (won't double-inject).
- Helper can be collapsed again via the same link (toggle).

## Injection Behavior

On pill tap (first time only per pill):

1. Build the snippet as HTML matching the existing rich-text format used by `RichTextEditor` (lines separated by `<br>`, bullet glyph `•` on its own line, blank line padding before snippet if body is non-empty):

   ```text
   <br>💰 Cost Breakdown<br>• <br>• <br>
   ```

2. Insert at the current selection inside the editor's contentEditable div when it is focused and the selection is inside it; otherwise append to the end of the existing HTML.
3. Update the body state via the editor's `onChange` path so debounce/draft-save still works.

Exact snippet text per pill (heading line + two empty bullets):

- 💰 Cost Breakdown
- 🙄 What Felt Overrated
- 😲 What Surprised Me
- 💡 Mistakes To Avoid
- 📍 Getting There
- ⚠️ Things To Know
- 🕒 How I'd Plan This
- ✨ Tips & Advice
- ✍️ The Vibe & Experience

## Constraints (explicit non-goals)

- No validation that sections are filled.
- No locking, no required fields, no "completion" UI.
- Users can freely edit/delete/rewrite injected text — it is plain body content after insertion.
- No analytics events / no DB changes / no schema changes.

## Technical Notes

- New component `src/components/TravelStructureHelper.tsx`:
  - Props: `body: string`, `onInsert: (snippetHtml: string) => void`, `editorRef?: RefObject<HTMLDivElement>` (optional, for cursor-aware insertion).
  - Internal state: `open: boolean`, `usedKeys: Set<string>`.
- `RichTextEditor` needs a way to insert HTML at the current cursor. Cleanest path: expose an imperative handle via `forwardRef` + `useImperativeHandle` with `insertHtml(html: string)` that:
  - Focuses the editor.
  - If `document.activeElement` is the editor and a selection range is inside it, uses `document.execCommand('insertHTML', false, html)` (matches existing patterns in the editor).
  - Else appends to `el.innerHTML` and fires the existing change pipeline.
  - Then schedules the debounced `onChange` (reuse existing `scheduleChange`).
- In `CreatePostPage.tsx`, render the helper above the body block only when `category === 'trip'`. Pass the editor ref down. Add same block to `EditPostPage.tsx` for consistency.
- Pills styled with existing tokens (no new colors). Grid: `grid grid-cols-3 gap-2`.

## Out of Scope

- Other categories (Food, Beauty, Work) — not requested.
- Persisting which pills were used across sessions.
- Reordering / removing injected sections via the helper.
