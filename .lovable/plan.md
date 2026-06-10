## Goal
Allow up to **18 media items** (images + videos combined) per post, and raise the per-file size cap to **50 MB**.

## Changes

### 1. `src/pages/CreatePostPage.tsx`
- `MAX_FILES`: `10` → `18`
- `MAX_FILE_MB`: `25` → `50`

### 2. `src/pages/EditPostPage.tsx`
- `MAX_FILES`: `10` → `18`
- `MAX_FILE_MB`: `25` → `50`
- Helper text below the media grid already reads from these constants, so it'll update automatically.

### 3. Storage bucket (`post-media`)
- Current `file_size_limit` on the bucket is the Lovable Cloud default (50 MB). 50 MB client-side stays within that, so **no bucket migration needed**.
- If a future bump above 50 MB is requested, we'll also need `supabase--storage_update_bucket` to raise the bucket limit.

## Out of scope
- No change to layout-specific editors (single image / 2×2 grid / cost table) — those have their own slot counts (1 and 4) and aren't affected by `MAX_FILES`.
- No change to video duration limits or transcoding.
- No DB schema changes.

## Verification
- Open `/post/new`, confirm helper text shows "Up to 18 files, 50MB each".
- Add 11+ images to verify the cap allows beyond 10.
- Try a ~30 MB file to confirm it no longer trips the size toast.
