## Goal
Make the Discover search forgiving of typos so queries like "trvel", "recomendation", or "mumbi" still surface the right posts.

## Approach
Keep search client-side over the already-loaded trending posts (no DB changes, no new dependencies needed beyond a tiny fuzzy lib). Replace the strict `includes()` filter with a scored fuzzy match, then sort results by relevance.

### Library
Use **Fuse.js** (`fuse.js`, ~6kb gzipped, zero deps). It's the standard for this — handles typos via Bitap/Levenshtein-style distance, supports weighted fields and threshold tuning.

### Matching rules
- Build a Fuse index over each post with weighted fields:
  - `title` (weight 0.4)
  - `hashtags` joined (weight 0.25)
  - `location` (weight 0.2)
  - `body` (weight 0.15)
- `threshold: 0.4` (0 = exact, 1 = match anything) — tolerates ~1–2 character typos on short words, more on longer ones.
- `ignoreLocation: true` so matches anywhere in the field count equally.
- `minMatchCharLength: 2` to avoid noise on single-letter queries.
- Strip a leading `#` from the query before searching so `#trvel` still works.

### Behavior
- Empty query → current behavior (chip/category filter only, original order).
- Non-empty query → run Fuse, return results sorted by Fuse score (best match first), still respecting the active chip/category as a pre-filter.
- Rebuild the Fuse index with `useMemo` whenever `posts` changes; re-run the search whenever `query` or filters change.

## Files to change
- `package.json` — add `fuse.js` dependency.
- `src/pages/DiscoverPage.tsx` — replace the `filtered` `useMemo` block (lines ~104–122) with the Fuse-based version; add a `useMemo` for the Fuse index.

## Out of scope
- Server-side search across all posts (still capped at the trending 80).
- People/seller search.
- Synonym handling ("recs" → "recommendations").
