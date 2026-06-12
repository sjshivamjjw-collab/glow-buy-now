## Problem

The 2×2 Grid + Text editor canvas is **square** (`aspect-square`), but the exported cover image from `composeGrid` is **4:5 portrait** (1200×1500). Because the feed/cover slot renders 4:5, a square-composed grid gets cropped/letterboxed and looks "off" — while the Single Image + Text editor already uses a portrait stage, which is why its cover renders correctly.

## Fix

Single, surgical change in `src/components/createpost/GridTextEditor.tsx`:

- Line 212: change the stage wrapper from `aspect-square` to `aspect-[4/5]` so the editor's 2×2 frame matches the 4:5 canvas that `composeGrid` actually exports.

That's it — no logic, no compose changes. Cell pan/zoom math is already aspect-aware via `drawCover`, and overlay positions are stored as 0–1 fractions of the stage, so they'll map 1:1 to the 4:5 output. The result: what the user sees in the editor is exactly what shows up on the feed cover.

## Verification

After the edit, open `/post/new` → 2×2 Grid + Text and confirm:
- The four cells render as a tall portrait frame (matching the Single Image template's proportions).
- Adding 4 photos + Done produces a cover whose framing matches what was previewed.
