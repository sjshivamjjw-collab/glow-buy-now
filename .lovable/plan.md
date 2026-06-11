## Problem
Discover/feed cover cards are rendered at `aspect-[4/5]` with `object-contain`. The cost-breakdown layout already composes a 4:5 (1200×1500) image so it fills edge-to-edge. The 2x2 grid layout composes a 1:1 square (1440×1440), so when it becomes the cover it gets letterboxed inside the 4:5 card — the blank strips top/bottom you marked.

## Fix
Change `composeGrid` in `src/lib/composeLayout.ts` to output a 4:5 portrait canvas instead of a square, so it fills the cover card the same way the cost breakdown does.

- Canvas: 1200 wide × 1500 tall (4:5), matching cost breakdown dimensions.
- 2×2 cells become 4:5 each: cell width = (1200 − gutter)/2 = 599, cell height = (1500 − gutter)/2 = 749.
- Keep the hairline gutter (2px) and white background.
- `drawCover` already handles non-square targets correctly via posX/posY/scale, so existing per-cell pan/zoom state continues to work — each image just crops to a slightly taller frame.
- Overlays use proportional x/y so their relative placement is preserved.

No changes needed in `DiscoverPage`, `EditPostPage`, or the grid editor — only the final composed output aspect changes. New grid posts will fill the cover card edge-to-edge; existing already-composed square grid posts would need a re-save to re-compose at the new aspect (acceptable, the user can re-edit the affected post).

## Files
- `src/lib/composeLayout.ts` — update `composeGrid` constants (SIZE → W/H, cell math).
