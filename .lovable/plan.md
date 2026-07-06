# Add engagement metrics to your profile posts

Own-profile post tiles will show four metrics as a subtle overlay at the bottom of each thumbnail: views, likes, comments, saves. Other users' profiles remain unchanged.

## 1. Track views (new)

New table `post_views` with `post_id`, `viewer_id` (nullable for guests), `session_key` (for guest dedup), `created_at`. Unique index on `(post_id, viewer_id)` for signed-in users and `(post_id, session_key)` for guests — a viewer counts once per post.

Denormalized `view_count int` column on `posts` maintained by an `AFTER INSERT` trigger, mirroring how `like_count`/`comment_count` work.

RLS:
- Anyone (anon + authenticated) can INSERT a view row.
- Authors can SELECT their own posts' view rows; nobody else needs to read the table (the count is exposed via `posts.view_count`).

Trigger fires from `PostDetailPage` on mount (dedupes via unique index → ignore duplicates). Guest session key = random id stored in `localStorage`.

## 2. Add saves count per post

`posts.save_count int` (default 0) maintained by trigger on `post_saves` insert/delete, same pattern as likes.

Backfill both `view_count` (0) and `save_count` (from existing `post_saves`) in the migration.

## 3. Profile UI

`ProfilePage` fetches `id, title, like_count, comment_count, view_count, save_count, is_anonymous` for own posts and passes them to `PostsGrid`.

`PostsGrid` in `src/pages/UserProfilePage.tsx` gets a small overlay strip at the bottom of each tile **only when `isOwner` is true**:

```text
👁 1.2k · ♥ 34 · 💬 5 · 🔖 3
```

Rendered as a translucent black pill row with lucide icons (`Eye`, `Heart`, `MessageCircle`, `Bookmark`), using `formatCount()` for compact numbers. Placed above the existing "Only visible to you" ribbon for anonymous posts so both remain readable.

Other users' `UserProfilePage` view stays as-is (no metrics overlay).

## 4. View increment call

In `PostDetailPage`, after the post loads, fire-and-forget insert into `post_views` with the viewer's `auth.uid()` or the guest session key. Silently ignore unique-violation errors.

## Technical notes

- Migration adds: `post_views` table + grants + RLS, `posts.view_count`, `posts.save_count`, two triggers, backfill.
- No changes to feed, discover, or post detail visuals — counts are only surfaced on the owner's profile grid.
- Realtime not needed; counts refresh on next profile load.
