# Add image cropping to post composer

When a user picks an image in `CreatePostPage`, open a crop dialog before the image is added to the media grid. Videos remain untouched. Existing thumbnails in the grid also get a "Crop" action so users can re-crop after the fact.

## UX

1. User taps "Add photo/video" and picks files.
2. For each image, a fullscreen modal opens with:
   - Pan + pinch/zoom crop area
   - Aspect ratio chips: Free, 1:1 (square), 4:5 (portrait), 16:9 (landscape)
   - Zoom slider
   - "Skip" (use original) and "Apply" buttons
3. After Apply, the cropped JPEG replaces the original `File` in `PendingMedia` and shows in the grid.
4. On each existing image tile, a small crop icon (next to the remove X) reopens the cropper for that item.
5. Videos bypass the cropper entirely.

## Implementation

- Add dependency `react-easy-crop` (small, MIT, touch-friendly, works on mobile + desktop).
- New component `src/components/ImageCropperDialog.tsx`:
  - Props: `file: File`, `open: boolean`, `onCancel()`, `onApply(croppedFile: File)`
  - Uses `react-easy-crop` for the UI
  - On Apply: draws cropped region to a canvas, exports JPEG at 0.9 quality, preserves original filename with `-cropped` suffix, returns a `File`
  - Uses `<Dialog>` from `@/components/ui/dialog` for shell
- `CreatePostPage` changes:
  - Add a queue state `pendingCropQueue: File[]` and `currentCropIndex`
  - `handleFiles` splits images vs videos: videos go straight into `media`; images go into the crop queue, opening the dialog one at a time
  - On Apply/Skip, advance the queue; when empty, close dialog
  - Update `SortableMediaTile` to accept an `onCrop` callback (images only) and render a small crop button
  - `onCrop` reopens the dialog targeting that single tile and replaces its `file` + `previewUrl` on Apply
- Revoke old `previewUrl` whenever a file is replaced to avoid blob leaks.

## Out of scope

- No server-side processing — cropping happens client-side before upload.
- No filters/rotation/adjustments (can be a follow-up).
- Video trimming is not included.
