# Fix: Can't add video / HEIC from file picker

## Root cause

When "Add media" is tapped on the Create Post page, it opens `LayoutPickerSheet` which only offers three **image-only** layouts: Single Image, 2×2 Grid, Cost Breakdown. Each layout's editor (`SingleImageTextEditor`, `GridTextEditor`) uses a hidden file input with:

```
accept="image/*,image/heic,image/heif"
```

So there is literally no UI path to upload a video, and HEIC files don't always appear in the system picker on Android/desktop because only MIME types (not `.heic`/`.heif` extensions) are listed.

`handleFiles` in `CreatePostPage.tsx` already supports videos (it splits images vs videos and adds them straight to the media list) — it's just never wired to any UI.

## Changes

1. **`src/components/createpost/LayoutPickerSheet.tsx`**
   - Add a 4th option `video` with a Film/Video icon, title "Video", subtitle "Upload a video clip".
   - Extend the `LayoutChoice` type union to include `'video'`.

2. **`src/pages/CreatePostPage.tsx`**
   - Add a hidden `<input type="file" accept="video/*" multiple>` with a ref.
   - When `LayoutPickerSheet` returns `'video'`, close the sheet and trigger that file input.
   - On change, call existing `handleFiles(e.target.files)` (already routes videos via `addMediaFile`) and reset the input value.
   - Update `onPick` handler so `'video'` does **not** set `activeLayout`.

3. **`src/components/createpost/SingleImageTextEditor.tsx`** and **`src/components/createpost/GridTextEditor.tsx`**
   - Broaden image `accept` to also include extensions for better Android/desktop coverage:
     `accept="image/*,image/heic,image/heif,.heic,.heif"`

## Out of scope (not changed)

- Auth, OTP, posting flow, upload pipeline, video transcoding.
- No new dependencies.
- EditPostPage already uses `image/*,video/*` so it's fine.

## Verification

- Open Create Post → tap "Add media" → see new "Video" option → picker shows videos.
- Picked video appears as a tile in the media grid (uses existing `LazyVideoThumbnail` rendering).
- On Android/desktop file picker, `.heic` files are no longer greyed out.
