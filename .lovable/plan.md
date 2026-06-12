## Problem

The new 4:5 stage uses **cover-fit** (drawCover) by default with `scale=1`, so any image taller than 4:5 — i.e. most phone portraits (3:4, 9:16) — gets auto-cropped on top/bottom to fill the frame. Previously, Single Image + Text preserved the photo's native aspect, so tall portraits showed fully.

## Fix

Switch Single Image + Text default fit mode from **cover** → **contain** (letterbox onto the black stage). The whole image is always visible by default; users who want to fill the frame can pinch-zoom (and pan) exactly like they do today.

### Changes

1. **`src/lib/composeLayout.ts` — `composeSingleSlide`**
   - Add a `fit: 'cover' | 'contain'` option, default `'contain'`.
   - When `contain`: compute the largest dest rect that fits inside 1200×1500 preserving the image's aspect, center it, leave the rest filled with the existing black background. Apply pan/zoom only when scale > 1 (then switch to cover-style drawing so user-zoomed framing is honored).
   - When `cover`: existing drawCover behavior (used once the user zooms in).

2. **`src/components/createpost/SingleImageTextEditor.tsx` — `PanZoomImage`**
   - When `scale === 1`: render the photo with `object-contain` semantics — show the entire image centered, no crop. (Match the composer exactly.)
   - When `scale > 1`: switch to the current cover + translate behavior so pinch-to-zoom and pan still work and the preview stays WYSIWYG with the export.
   - Pinch-to-zoom: starting from contain at scale 1, allow zooming up to the same max (4×). First nudge above 1 transitions to cover-fit at that scale, so there's no visual jump (we use cover's baseW/baseH as the reference at scale=1 boundary — see technical notes).

3. **`SingleSlideState` default `scale`**
   - Stays `1`. No data migration needed.

## Result

- **Portrait (3:4, 9:16, etc.):** fully visible, letterboxed with thin black side/top-bottom bars on the 4:5 stage. Same smooth feel as before.
- **Square:** fully visible, black bars on top/bottom.
- **Landscape:** fully visible, black bars on top/bottom (instead of being auto-center-cropped). User pinches to zoom in if they want to fill the frame.
- **All three layouts still export 1200×1500** → the feed cover slot is consistent across templates. The only difference is portrait covers may show small black bars instead of cropping content, which matches the pre-change behavior the user liked.

## Technical notes (single-image only — grid + cost unchanged)

The seamless transition between contain (scale=1) and cover (scale>1) needs the same reference rect on both sides of the boundary:

- Contain rect at scale 1: fits inside the 4:5 frame, no crop.
- Cover rect at scale 1: fills the 4:5 frame, may crop.
- We interpolate by keeping `scale` user-facing (1 = "default fit"). At exactly 1 we render contain. As soon as the user pinches above 1 we switch to cover with `effectiveScale = scale` and animate to it; the small visual snap is acceptable since the user is actively pinching.

If a perfectly smooth transition matters more than parity, an alternative is to do contain-only and disable zoom entirely — let me know which you prefer.

## Out of scope

- 2×2 Grid (already does cover and looks correct because each cell is a small tile — cropping is expected and the user has explicit pan/zoom per cell).
- Cost Breakdown layout (no images).
- Feed cover rendering.

## Verification

1. `/post/new` → Single Image + Text → upload a 3:4 portrait → confirm full image is visible with thin black side bars, no top crop.
2. Upload a 9:16 portrait → same, fully visible.
3. Upload a landscape → fully visible with black bars top/bottom; pinch to zoom to fill.
4. Feed cover for each of the above matches the editor preview.
