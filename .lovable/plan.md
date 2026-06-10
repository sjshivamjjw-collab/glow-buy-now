## Goal

Replace the current "Add photo/video" flow on the New Post page with a bottom sheet that offers three layout templates. Every layout is composed into one or more flat JPEG images via canvas at submit time, then uploaded through the existing `post-media` pipeline. The feed, post detail, and database stay unchanged.

## Flow

1. User taps the existing media/add button on `src/pages/CreatePostPage.tsx`.
2. A bottom sheet (shadcn `Sheet` side="bottom") opens with three large cards: Single Image with Text, 2x2 Grid with Text, Cost Breakdown.
3. Picking a card opens a full-screen editor for that layout.
4. "Done" returns to CreatePostPage, with the composed image(s) appended into the existing `pendingMedia` state. From there the existing submit/upload path is reused unchanged.
5. The old direct "pick from gallery" picker is removed — the bottom sheet is the only way to attach media.

## Layout 1 — Single Image with Text (carousel)

Editor screen:
- "Add from gallery" → multi-select images (existing file input pattern).
- Horizontal swipeable carousel of selected slides (embla, already in deps).
- Each slide stores its own overlay: `{ text, x, y, size, color, bgEnabled }`. Default placement is centered.
- Tap the overlay → inline `contentEditable` input + the 4-tool mini menu (see "Text tools" below).
- "X" on the overlay clears that slide's text.
- Reorder + delete slide controls match the existing media grid.
- "Done" flattens each slide: draw image to an offscreen canvas at natural size, draw overlay on top (with blurred translucent box if bgEnabled), export JPEG via `canvas.toBlob`, wrap in `File`, push to pendingMedia.

## Layout 2 — 2x2 Grid with Text

Editor screen:
- Requires exactly 4 images. Submit disabled until 4 are picked; each cell shows "Tap to add" until filled.
- Preview is a square grid with a 2px white gutter between cells.
- One text overlay anchored over the lower third by default; "+ Add text" adds more draggable overlays.
- Each overlay uses the same 4-tool menu and X-to-delete.
- "Done" composes a single square JPEG (e.g. 1440×1440): draw each image cropped `object-cover` into its quadrant, draw 2px gutters, draw overlays, export, push as one image to pendingMedia.

## Layout 3 — Cost Breakdown

Editor screen:
- Card with solid `#F5F0E8` background.
- Centered 2-column table. Both headers and all body cells are `contentEditable`.
- Initial rows: 3 (e.g. "Item" / "Amount" placeholders).
- "+ Add row" below the table; trash icon at the end of each row.
- Right column min/max widths are constrained so it stays shorter than the left; left column flexes with text. Cells wrap automatically.
- Thin 1px hairline rows, no vertical borders — receipt feel.
- "Done" composes the card to a JPEG via canvas: paint beige background, render the table with measured text wrapping using `ctx.measureText` and a simple word-wrap helper, push as one image to pendingMedia.

## Text tools (Layouts 1 & 2)

Small popover anchored to the active overlay:
- Text input (max 60 chars).
- Size: Small / Medium / Large (maps to fixed px sizes proportional to canvas width).
- Color: White, Black, Cream (`#F5F0E8`), Charcoal (`#2B2B2B`).
- Background toggle: when on, render a `backdrop-blur` translucent pill behind the text in the preview, and a semi-transparent rounded rect in the canvas flatten.

## Edge-to-edge styling

All three editors render full-bleed on mobile: no horizontal padding on the image/grid/card surfaces, matching the recent PostDetail edge-to-edge change.

## Files

New:
- `src/components/createpost/LayoutPickerSheet.tsx` — the bottom sheet with 3 cards.
- `src/components/createpost/SingleImageTextEditor.tsx` — Layout 1 editor.
- `src/components/createpost/GridTextEditor.tsx` — Layout 2 editor.
- `src/components/createpost/CostBreakdownEditor.tsx` — Layout 3 editor.
- `src/components/createpost/TextOverlayMenu.tsx` — the 4-tool popover.
- `src/lib/composeLayout.ts` — canvas helpers: `composeSingleSlide`, `composeGrid`, `composeCostBreakdown`, plus a shared `wrapText` and `drawTextWithBg`.

Modified:
- `src/pages/CreatePostPage.tsx`:
  - Remove the existing direct `<input type="file">` trigger from the media add button.
  - Wire the button to open `LayoutPickerSheet`.
  - Add a small overlay router (`activeEditor: 'single' | 'grid' | 'cost' | null`) that mounts the chosen editor full-screen.
  - On editor "Done": receive `File[]` and append into the existing `pendingMedia` state via the same helper used today, so upload/submit code is untouched.

Nothing else changes — `post_media`, posts schema, feed, and PostDetail stay as-is because each layout returns plain JPEG `File`s.

## Out of scope

- Editing a layout after the post is created (flattened images aren't re-editable; matches the chosen approach).
- Storing structured cost-breakdown rows.
- Video support inside these layouts.
