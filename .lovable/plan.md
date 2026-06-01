## Goal
Remove the hard cap of 30 posts on the Discover feed so users can browse the entire trending feed.

## Current behavior
`src/pages/DiscoverPage.tsx` (line 191) calls `get_trending_posts` with `_limit: 30, _offset: 0` once on mount, and never fetches more. The masonry grid renders whatever comes back, capped at 30.

## Approach: infinite scroll (paged loads of 30)
Loading thousands of posts at once would hurt performance (images, masonry layout, memory). Instead, page through the RPC using its existing `_offset` parameter and append as the user scrolls.

### Changes in `src/pages/DiscoverPage.tsx`
1. Replace the single `posts` state with a paged state: `posts`, `page` (or `offset`), `hasMore`, `loadingMore`.
2. Initial load: fetch page 0 (limit 30, offset 0) — same as today.
3. Add `loadMore()` that fetches the next 30 with `_offset: posts.length`. If fewer than 30 rows come back, set `hasMore = false`. Dedupe by `id` to be safe.
4. Author hydration: run the same `profiles` lookup for newly fetched `user_id`s and merge into the `authors` map (use existing `updateTrendingAuthors`).
5. Trigger `loadMore` via an `IntersectionObserver` on a sentinel `<div ref={sentinelRef} />` placed after the masonry grid. Guard against concurrent calls with a `loadingMore` ref.
6. Render a small "Loading more…" spinner when `loadingMore`, and an "You're all caught up" line when `!hasMore`.

### Feed cache (`src/lib/feedCache.ts`)
- The cache already stores the full `posts` array; just keep using `setTrendingCache` after each successful page append so back-navigation from a post restores everything the user has scrolled through (and scroll restoration keeps working).
- No schema change needed.

### Search results
Search uses a separate RPC with `_limit: 40` and is unrelated; leave it untouched.

## Out of scope
- No DB / RPC changes — `get_trending_posts` already accepts `_limit` / `_offset`.
- No changes to PostDetailPage, CreatePostPage, or any other surface.
- No visual redesign of the feed.

## Verification
- Open Discover, scroll past the first 30 cards, confirm more load automatically.
- Open a post, hit back — feed restores with all loaded pages and prior scroll position (existing behavior preserved).
- Scroll to the very end — sentinel stops firing, "all caught up" shows, no infinite refetch loop.
