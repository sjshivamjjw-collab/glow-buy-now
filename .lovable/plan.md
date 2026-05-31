# Fix Discover search

Today the Discover search only filters the 30 trending posts already loaded — so older posts, usernames, hashtags, and locations don't get found. Let's make it search the full database and return grouped results.

## What the new search will do

When the search box has text, replace the masonry grid with a grouped results view:

1. **Posts** — full-text match across title, body, hashtags, location across ALL non-hidden posts (not just the 30 loaded). Ranked by relevance, then likes+comments, then recency.
2. **People** — match profiles by `name` or `username`. Tap a row → opens that user's profile.
3. **Hashtags** — distinct hashtags matching the query, with post counts. Tap → fills search with `#tag` to show posts with that tag.
4. **Locations** — distinct locations matching the query, with post counts. Tap → filters posts to that location.

When the search box is empty, behaviour is unchanged (chips / masonry feed).

## How it'll work (technical)

**New SQL (one migration):**
- `search_posts(_q text, _limit int, _offset int)` — security definer, returns same shape as `get_trending_posts` plus a `rank` column. Uses Postgres full-text search:
  - Add a generated `tsvector` column `search_tsv` on `posts` (title || body || hashtags || location) with a GIN index.
  - Query: `WHERE is_hidden=false AND search_tsv @@ websearch_to_tsquery('simple', _q)` ordered by `ts_rank` + engagement.
  - Falls back to `ILIKE` on title/location for very short queries (<2 chars handled client-side by not calling).
- `search_people(_q text, _limit int)` — returns `id, name, username, avatar_url` from `profiles` where `username ILIKE _q%` OR `name ILIKE %_q%`. Security definer, exposes only public fields (same as `get_public_profiles`).
- `search_hashtags(_q text, _limit int)` — unnests `posts.hashtags`, groups, filters `ILIKE`, returns `tag, post_count`.
- `search_locations(_q text, _limit int)` — `SELECT location, count(*) FROM posts WHERE location ILIKE %_q% GROUP BY location`.
- All four granted to `authenticated`.

**Frontend (`src/pages/DiscoverPage.tsx`):**
- Debounce the query (250ms) and only fire when length ≥ 2.
- Add a `useQuery`-style effect that runs the 4 RPCs in parallel and stores results.
- New rendering branch: when `query.trim().length >= 2`, render grouped sections (People → Hashtags → Locations → Posts) instead of the masonry. Each section shows up to N rows with a "Show more" affordance.
- Tap behaviours:
  - People row → `navigate('/u/' + username)` (or whatever the existing user profile route is — will confirm in code).
  - Hashtag row → sets query to `#tag`, scrolls to Posts section.
  - Location row → sets a `locationFilter` state, shows results filtered by location.
- Remove the now-unused client-side Fuse search (keep Fuse only as a fallback if RPC fails, or drop entirely).
- Loading state: small spinner inside the results area; show "No results for …" empty state.

**Ranking:** relevance (`ts_rank`) first, then `like_count + comment_count`, then `created_at DESC`. No separate UI toggle.

## Out of scope
- No typeahead suggestions dropdown — results render inline as the user types (debounced).
- No search history / recent searches.
- No analytics / search logging.
