## Goal
A user editing a New Post on laptop should be able to open the same draft on their phone (and vice versa), instead of only seeing it on the device that created it.

## Current behavior
- Text fields persisted to `localStorage` (`createPostDraft:v1`).
- Media (files, overlays, layout) persisted to **IndexedDB** via `src/lib/draftMediaStore.ts`.
- Both stores are per-device, so the other device sees nothing.

## Approach
Move drafts to the backend. One draft per user (matches today's single-draft model). Text syncs continuously; media files are uploaded to a private storage bucket as they're added.

### 1. Database — `post_drafts` table
One row per user (`user_id` PK, FK to `auth.users`).
Columns:
- `payload jsonb` — the full text draft (category, reviewSub, recommendation, title, body, location, hashtags, music, postAnonymously)
- `media jsonb` — ordered array of `{ id, kind, storage_path, file_name, file_type, editor_state }`
- `updated_at timestamptz`, `device_label text` (last device that wrote, for the "restored from your laptop" hint)

RLS: owner-only select/insert/update/delete (`auth.uid() = user_id`).
GRANTs: `authenticated` full CRUD; `service_role` all.

### 2. Storage — `post-drafts` bucket (private)
Path: `{user_id}/{draft_media_id}.{ext}`.
RLS on `storage.objects` so a user can only read/write/delete files under their own folder.
Files are deleted when the draft is published or discarded.

### 3. Client sync layer (replaces `draftMediaStore.ts` usage)
New `src/lib/draftSync.ts`:
- `loadRemoteDraft()` — fetches row + downloads each media file as a Blob → returns the same `PersistedDraft` + `StoredMedia[]` shape the page already consumes.
- `saveRemoteDraft(payload, media)` — debounced upsert of the text row + uploads any new media files (idempotent by `id`), removes storage objects no longer in the list.
- `clearRemoteDraft()` — deletes the row + all media objects.

### 4. `CreatePostPage.tsx` wiring
- On mount: load **local** draft (instant, offline-friendly) AND fire `loadRemoteDraft()`. If remote `updated_at` is newer than local, swap in remote content and show "Picked up from your other device" toast (replaces existing "Picked up where you left off"). If local is newer, push it up.
- Debounced effect that already calls `flushTextDraft` / `flushMediaDraft` also calls `saveRemoteDraft` (longer debounce for media, e.g. 1.5s, to coalesce uploads).
- `clearDraft()` / `discardDraft()` / successful publish path also call `clearRemoteDraft()`.
- Local IndexedDB + localStorage stay as the fast cache; remote is the source of truth across devices.

### 5. Conflict handling
Last-write-wins by `updated_at`. If two devices edit simultaneously, the most recent save replaces the earlier one (acceptable for a single-user drafting flow; matches user expectation of "continue where I left off").

### 6. Cleanup
- On successful post publish (existing `clearDraft()` in submit handler around line 709) → also `clearRemoteDraft()`.
- A simple SQL scheduled task is **not** added now; orphan cleanup can be revisited if storage grows.

## Files changed
- new migration: `post_drafts` table + RLS + GRANTs
- new storage bucket `post-drafts` (private) + RLS policies on `storage.objects`
- new `src/lib/draftSync.ts`
- edit `src/pages/CreatePostPage.tsx` — hydrate from remote, push to remote, clear on publish/discard
- `draftMediaStore.ts` kept as local cache; no breaking changes

## Out of scope
- Multiple concurrent drafts per user (still one)
- Real-time co-editing
- Edit-post drafts (only the New Post flow)
