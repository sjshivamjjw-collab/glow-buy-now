## Goal

In the "Work Diaries" category (key `hidden_gems`), let the user tick **"Post anonymously as 🐧 Rippler"**. Anonymous posts:
- Show a penguin avatar + the name **Rippler** everywhere they appear (Discover, post detail, comments header, etc.).
- Do **not** appear on the author's own profile grid or anyone else's view of that profile.
- Cannot be traced back to the author by any client (the author's `user_id` is never returned to the browser for anonymous posts).
- The author themself can still delete/edit them via the post detail page (server-side ownership check by `auth.uid()`), but the UI won't surface them on their profile.

## Backend changes (single migration)

1. **Add column** `is_anonymous boolean NOT NULL DEFAULT false` to `public.posts`.
2. **Mask `user_id` for anonymous posts at the database boundary** so the client cannot backtrack:
   - Drop the current `"Anyone authenticated can read posts"` SELECT policy on `posts`.
   - Replace with a SELECT policy that allows reading rows but rely on a view to mask columns:
     ```sql
     CREATE VIEW public.posts_public WITH (security_invoker = on) AS
     SELECT
       id,
       CASE WHEN is_anonymous THEN NULL ELSE user_id END AS user_id,
       is_anonymous,
       title, body, location, hashtags,
       like_count, comment_count,
       created_at, updated_at,
       category, music_url, music_title,
       review_subcategory, review_recommendation
     FROM public.posts;
     GRANT SELECT ON public.posts_public TO authenticated;
     ```
   - Keep a restrictive SELECT policy on the base `posts` table so direct `from('posts').select('user_id')` only returns the row when `auth.uid() = user_id` (owner) **or** `is_anonymous = false` (so legacy reads of non-anon posts keep working) **or** caller is admin. Concretely:
     ```sql
     CREATE POLICY "Read posts (mask anon owner)"
       ON public.posts FOR SELECT TO authenticated
       USING (is_anonymous = false OR auth.uid() = user_id OR has_role(auth.uid(),'admin'));
     ```
     This means: for anonymous posts, only the author/admin can read the row directly; everyone else must use `posts_public` (which nullifies `user_id`).
3. **Update `get_trending_posts` RPC** to return `is_anonymous` and to set `user_id = NULL` when `is_anonymous = true`.
4. **Realtime / triggers**: `notify_post_like`, `notify_post_comment`, `notify_post_mentions`, `maintain_post_*` are SECURITY DEFINER and read `posts.user_id` server-side — they keep working unchanged (the author still gets notifications on their anonymous post).

## Frontend changes

### `src/pages/CreatePostPage.tsx`
- Add state `const [postAnonymously, setPostAnonymously] = useState(false)`.
- When `category === 'hidden_gems'`, render a checkbox row under the category card:
  > 🐧 Post anonymously as Rippler — your name and profile will not be shown.
- Reset to `false` whenever the category changes away from `hidden_gems`.
- On insert, pass `is_anonymous: category === 'hidden_gems' && postAnonymously`.
- Persist this flag in the localStorage draft alongside the other fields.

### `src/pages/DiscoverPage.tsx`
- Read posts via the existing `get_trending_posts` RPC (now returns `is_anonymous` and a nullified `user_id`).
- Replace the supplementary `from('posts').select('id, category')` fetch with `from('posts_public').select('id, category, is_anonymous')`.
- When rendering a card with `is_anonymous`:
  - Avatar = inline penguin SVG (reuse the OpenMoji URL already used in CreatePostPage's `PenguinIcon`).
  - Username = `Rippler` (no `@`, no link).
  - Wrap the username/avatar so it is **not** clickable (don't navigate to `/u/<id>`).
- Skip the `get_public_profiles` lookup for anonymous posts.

### `src/pages/PostDetailPage.tsx`
- Switch the post fetch from `from('posts')` to `from('posts_public')`. For owner-only actions (edit/delete buttons), additionally fetch ownership via a tiny `from('posts').select('user_id').eq('id', id).maybeSingle()` — RLS will return the row only if the caller is the owner/admin, so a non-null result means "I own this".
- When `is_anonymous`, render the author block as Penguin + "Rippler", non-clickable, and hide the "Follow" button.

### `src/pages/ProfilePage.tsx` and `src/pages/UserProfilePage.tsx`
- Add `.eq('is_anonymous', false)` to the post-list queries so anonymous posts never appear in any profile grid (including the author's own).
- Adjust the post-count query the same way.

### `src/pages/SavedPostsPage.tsx`
- Switch the join source to `posts_public` and render the Rippler identity for anonymous saved posts.

### `src/pages/EditPostPage.tsx`
- No change needed for now: editing keeps working for the owner because base-table RLS still permits owner reads. (We don't expose an "edit" affordance from places where the user isn't already proven to be the owner.)

### `src/pages/AdminPanelPage.tsx`
- Unchanged. Admins keep full visibility (acceptable per spec; "users can't backtrack" — admins are not regular users).

## Technical notes

- The penguin glyph already exists as `PenguinIcon` in `CreatePostPage.tsx`. Extract it to `src/components/RipplerIdentity.tsx` exporting both `<PenguinAvatar size={...} />` and a small `<RipplerName />` so Discover, PostDetail and SavedPosts share one source of truth.
- Comments authored on an anonymous post still show the commenter's real identity — only the post author is anonymized. (Out of scope to anonymize commenters.)
- Notifications generated by likes/comments on an anonymous post are delivered to the real author normally; only client-visible attribution is hidden.
- After the migration runs, `src/integrations/supabase/types.ts` regenerates and `posts_public` becomes a typed source. No manual edits to that file.

## Files touched

- New migration (column + view + policy swap + RPC update).
- `src/components/RipplerIdentity.tsx` (new, small).
- `src/pages/CreatePostPage.tsx` (checkbox + insert payload + draft).
- `src/pages/DiscoverPage.tsx` (use `posts_public`, render Rippler).
- `src/pages/PostDetailPage.tsx` (use `posts_public`, render Rippler, ownership probe).
- `src/pages/ProfilePage.tsx`, `src/pages/UserProfilePage.tsx` (filter out `is_anonymous`).
- `src/pages/SavedPostsPage.tsx` (use `posts_public`, render Rippler).
