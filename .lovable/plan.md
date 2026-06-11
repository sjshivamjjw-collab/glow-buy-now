# Fix landscape cover image looking letterboxed on Discover

## What's happening

The Discover cover card is `aspect-[4/5]` with `object-contain`. A separate `cover_url` (cropped to 4:5) is what gets shown there. The Create flow already prompts a 4:5 crop the first time you upload, but that's the only moment it runs. Once a post has images, several actions silently change which image is the cover **without** re-cropping:

1. Skipping the initial crop dialog (Cancel/Skip) — original landscape becomes the cover.
2. Reordering tiles so a different photo becomes image #1.
3. Deleting the current first image — image #2 becomes the cover untouched.
4. In **Edit Post**, replacing or reordering the first image (no crop step exists there at all).

When the resulting cover isn't 4:5, `object-contain` shows the black bars the user marked.

## Fix: treat "first image = cover" as a contract and enforce a 4:5 crop every time the first image changes

A single rule across Create and Edit: whatever sits in slot #1 must be a 4:5-cropped image. Everywhere that mutates the order or contents of slot #1, route through the existing `ImageCropperDialog` (aspect = 4/5) before committing.

### Create Post (`src/pages/CreatePostPage.tsx`)
- **Initial upload**: keep current behavior, but make the crop step required — remove the Skip path for the cover (Cancel still discards the file entirely). User can reposition/zoom but cannot bypass.
- **Reorder (drag-end)**: if the item now at index 0 differs from the previous index-0 (and isn't a video), open the cropper on its original file before updating `coverFile` / `coverMediaId`.
- **Remove first image**: if a new image is promoted to index 0, open the cropper on it.
- **Manual "edit cover" tap** (already wired via `onCrop` on tile 0): no change.
- The "Use photo" button stays primary; secondary "Cancel" reverts the action that triggered it (e.g. snaps the order back, or undoes the removal).

### Edit Post (`src/pages/EditPostPage.tsx`)
- Mirror the same rule. Add `ImageCropperDialog` invocations for: replacing image #1, reordering so a different image becomes #1, and deleting image #1. The cropped output becomes the new `cover_url` that gets uploaded on save (overwriting the stale one — already implemented from the previous fix).
- Add a small "Recrop cover" affordance on tile 0 (same icon button as Create) so the user can re-adjust without re-uploading.

### Videos as first slot
Videos can't be cropped here. When the first slot is a video, fall back to the existing video-thumbnail cover path (no crop dialog). Only enforce cropping when slot #1 is an image.

### No render changes
`DiscoverPage` keeps `object-contain` — once the cover is guaranteed 4:5, contain == cover and there are no bars. (Switching to `object-cover` would silently chop content from already-correct covers, so we don't.)

## Files

- `src/pages/CreatePostPage.tsx` — gate reorder/remove/initial-upload through the cropper for slot #1; remove the Skip path on the cover crop.
- `src/pages/EditPostPage.tsx` — add the same gating + a recrop button on tile 0; ensure cropped output is used as the uploaded `cover_url`.
- `src/components/ImageCropperDialog.tsx` — small prop tweak to hide the Skip button when `onSkip` isn't provided (already conditional on `onSkip` — just stop passing it for cover crops).

## Out of scope

- 2×2 grid covers (already fixed to 4:5 in `composeLayout.ts`).
- Changing the Discover card aspect ratio.
- Auto-detecting a focal point — manual reposition is clearer and matches what the user already does on first upload.
