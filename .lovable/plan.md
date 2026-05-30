# Make post creation typing feel native

## Goal
Typing in the title and body should feel as smooth as WhatsApp — zero perceptible lag, even on long posts or mid-range Android.

## Why it still feels slow
Even after the 200ms debounce, every burst of typing still:
1. Updates `body` state on the page → re-renders the entire CreatePostPage tree (media grid + DnD context, music card, location effect deps, draft autosave with `JSON.stringify` of the whole draft).
2. The contentEditable's `onInput` reads `el.innerText` on every keystroke (forces layout, scales with body length).
3. The title `<input>` calls `setTitle` on every keystroke → same full-page re-render.

The browser itself handles keystrokes instantly inside the field — all the lag comes from React work happening alongside it.

## Approach
Isolate the editor and title from the rest of the page so typing causes **zero React work in the parent**. State only syncs on blur, on pause (1s), or on submit.

### 1. RichTextEditor → fully uncontrolled
- Remove the value→DOM sync effect (already mostly bypassed). Editor owns its DOM content after mount.
- Expose an imperative `ref` with `getHTML()` / `setHTML()` / `focus()`.
- Stop calling `onChange` on every keystroke. Instead:
  - Call `onChange` on **blur** only (for autosave + validation).
  - Optionally a single `onPauseChange` after 1s of idle (for draft persistence while user keeps the field focused for a long time).
- Drop the per-keystroke `el.innerText` length check; only enforce `maxLength` on blur/paste (it's currently unused anyway — no maxLength is passed).
- Wrap in `React.memo` with empty prop comparator so parent re-renders never touch it.

### 2. Title input → uncontrolled subcomponent
- Extract `<TitleField />` that owns its own state via `defaultValue` + ref.
- Parent reads the value on submit via ref, and on blur for draft autosave.
- Character counter lives inside `TitleField` so it updates locally without bubbling.

### 3. Draft autosave → ref-driven, not state-driven
- Parent keeps `bodyRef` / `titleRef` instead of state.
- Single `setInterval` (every 2s) or a `'visibilitychange'` + `beforeunload` + blur-driven save reads from refs and writes to localStorage. No render needed.
- Remove `body` and `title` from any other `useEffect` deps.

### 4. Memoize the heavy siblings
- `React.memo` on `SortableMediaTile` (already mostly fine, but make sure callbacks are stable via `useCallback`).
- Move the `BODY_PLACEHOLDERS` lookup out of the IIFE into a `useMemo` keyed on `category, reviewSub`.

### 5. Hydration
- On mount, push the persisted draft HTML into the editor once via the imperative ref, then never touch it again.

## What stays the same
- All existing features: bold/italic/underline toolbar, bullet auto-continue on Enter, plain-text paste, placeholder overlay, draft restore banner, "Discard" button, submit validation (`isRichTextEmpty`).
- Visual layout, styles, copy — no UI changes.
- Other rich-text consumers (if any) keep working through a compatibility shim: if no ref is passed, the editor falls back to its current controlled behaviour.

## Risk
- The placeholder overlay currently keys off `value` being empty. With uncontrolled editor, we'll track empty-state with an internal `useState` flipped in `handleInput` (cheap — only flips twice per session).
- Draft restore on the same page after Discard needs the imperative `setHTML('')` call — handled in `discardDraft`.

## Files touched
- `src/components/RichTextEditor.tsx` — refactor to uncontrolled + memo + forwardRef.
- `src/pages/CreatePostPage.tsx` — extract `TitleField`, switch body to ref, move autosave to interval/blur, useMemo placeholders.

## Expected result
Typing produces no React renders in the parent. Only renders happen on blur, submit, category change, media add, and music pick — same as WhatsApp where the input is isolated from the chat list.
