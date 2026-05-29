## Goal
Make the 🐧 penguin in the "Work Diaries" subtitle render identically on mobile and desktop, using the cleaner desktop-style look the user prefers (instead of the colorful native iOS/Android emoji currently shown on mobile).

## Approach
Stop relying on the OS emoji font (which is why mobile and desktop look different). Replace the inline `🐧` character with a small inline `<img>` pointing to a single hosted SVG of the penguin so every device renders the exact same glyph.

Use OpenMoji's penguin SVG — it's a flat, lightly-colored outline style that closely matches the "desktop browser" look the user said they prefer:

```
https://cdn.jsdelivr.net/npm/openmoji@latest/color/svg/1F427.svg
```

Rendered as:

```tsx
<img
  src="https://cdn.jsdelivr.net/npm/openmoji@latest/color/svg/1F427.svg"
  alt="penguin"
  className="inline-block w-4 h-4 align-[-2px]"
/>
```

## Change
- `src/pages/CreatePostPage.tsx` (line 65): change the `subtitle` field of the `hidden_gems` category from the plain string `'option to post anonymous as 🐧 Rippler'` to a small JSX fragment that uses the `<img>` above for the penguin.
- Widen the `CATEGORIES` `subtitle` type from `string` to `ReactNode`. The render site (`{cat.subtitle}`) already accepts ReactNode, so no other code changes are needed.

## Notes
- Only one penguin emoji usage exists in the codebase, so this is the only file touched.
- SVG is ~3 KB, cached by jsdelivr — no install, no build impact.
- If the OpenMoji style turns out not to match what you saw on desktop, we can swap the URL for a different set (Twemoji, Noto, or a custom SVG) in one line.
