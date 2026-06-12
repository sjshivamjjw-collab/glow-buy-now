## Problem

On the post detail page (`/p/:id`), images render with `w-full max-h-[60vh] object-contain`. Because most uploaded posts are now standardized to a 4:5 portrait, `object-contain` + the `60vh` cap can letterbox the photo and leave visible black side bars on tall screens — the image doesn't feel edge-to-edge.

## Fix

In `src/pages/PostDetailPage.tsx`, change each carousel slide's image wrapper so the picture truly fills the device width with the standardized 4:5 aspect:

- Slide container: keep the `w-screen left-1/2 -translate-x-1/2 bg-[#0a0a0a]` escape that already breaks out of the `max-w-lg` column.
- Each slide (`basis-full` div): give it `aspect-[4/5] w-full` and remove the centering flex so the image occupies the entire slide rect.
- `<img>`: drop `max-h-[60vh]`, switch to `w-full h-full object-cover` so the standardized 4:5 image fills the full viewport width with no padding or letterbox bars.
- Videos: keep `object-contain` (legacy posts may be any ratio and we don't want to crop video). Same `aspect-[4/5] w-full` wrapper, video uses `w-full h-full object-contain` on a black background — visually edge-to-edge for portrait videos, letterboxed only when truly needed.

The page counter pill (`{mediaIdx + 1} / {media.length}`) stays absolutely positioned over the carousel — unaffected.

## Out of scope

- Feed cover, profile grid, comments, header — unchanged.
- No changes to compose/export pipeline; existing 1200×1500 JPEGs already match the new 4:5 slot exactly.
- Legacy non-4:5 images uploaded before standardization will be center-cropped to 4:5 in the detail view. If you'd rather show them with letterboxing instead, say so and I'll gate `object-cover` to standardized posts only.

## Verification

1. Open a new (post-standardization) single-image post on mobile → image fills full width, no side or top/bottom bars.
2. Open a multi-image post → swipe left/right; every slide is full-width 4:5, counter pill still visible.
3. Open a video post → video fills width on portrait clips; landscape clips show black bars (acceptable).
