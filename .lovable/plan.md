## Goal

Make all three New Post layouts produce a uniform **1200×1500 (4:5 portrait)** cover so the feed cover slot always renders perfectly, regardless of source photo orientation. Give users pan/zoom control in the Single Image + Text editor so landscape/square photos don't lose important content silently.

## Changes

### 1. `src/components/createpost/SingleImageTextEditor.tsx`
- Change the stage wrapper to `aspect-[4/5]` (matches the 4:5 export).
- Per slide, track `posX`, `posY`, `scale` (same shape as grid cells), defaulting to `0.5 / 0.5 / 1`.
- Render the photo via a `drawCover`-equivalent CSS transform inside the 4:5 frame (object-cover + translate/scale), so the user sees exactly what will be exported.
- Add drag-to-pan + pinch/scroll-to-zoom on the image layer (reuse the grid cell's gesture handling pattern — same UX, same feel).
- Keep overlays layered on top of the image, positions still stored as 0–1 fractions of the stage (already correct for 4:5).

### 2. `src/lib/composeLayout.ts` — `composeSingleSlide`
- Switch to fixed canvas: `W = 1200, H = 1500`.
- Replace the natural-size `drawImage` with `drawCover(ctx, img, 0, 0, 1200, 1500, posX, posY, scale)`.
- Update signature to accept `posX`, `posY`, `scale` (optional, defaults `0.5/0.5/1`).
- Overlay rendering is unchanged — already uses canvas-relative fractions.

### 3. `src/lib/composeLayout.ts` — `SingleSlideState` type
- Add `posX: number; posY: number; scale: number` to each slide so framing persists across drafts.

### 4. `src/lib/draftMediaStore.ts`
- Extend the `single` serialize/deserialize branches to round-trip `posX / posY / scale` per slide (same pattern already used for grid cells).

### 5. `src/pages/CreatePostPage.tsx` (and `EditPostPage.tsx` if it composes single slides)
- Pass the new framing fields through when calling `composeSingleSlide`.
- Initialize `0.5 / 0.5 / 1` for any legacy/loaded slide missing them.

## Behavior after the change

- **Portrait photo (4:5 or taller):** fills the frame with no visible crop — same as today.
- **Square photo:** top and bottom of the source are kept; left/right untouched. User can pan vertically or zoom out within the cover-fit constraint.
- **Landscape photo:** center crop by default; user drags horizontally to choose which slice is shown, or pinch-zooms to recompose. WYSIWYG with the feed cover.
- All three templates now export identical 1200×1500 JPEGs → cover page is fully consistent.

## Out of scope

- No changes to the cost-breakdown or grid composers (already 4:5).
- No changes to feed/cover rendering components.
- No migration of already-published posts (they keep their current covers).

## Verification

1. `/post/new` → Single Image + Text → upload a landscape photo → pan/zoom → Done → confirm feed cover matches the editor preview pixel-for-pixel.
2. Repeat with square and portrait photos.
3. Reload mid-draft → confirm framing (posX/posY/scale) is restored from IndexedDB.
4. 2×2 Grid and Cost Breakdown still export correctly (regression check).
