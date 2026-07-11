Bump engagement counts on the three posts owned by the user with phone `+919619846170` so the ordering is views > likes > saves, within the requested ranges.

## Target values

Assign per post (randomized within your ranges, keeping views > likes > saves):

- "3 spots we found overhyped in Bali…" → views 178, likes 82, saves 41
- "3 mistakes that cost us 60000 extra on our Australia trip" → views 156, likes 71, saves 38
- "Budget Thailand Trip with friends…" → views 134, likes 63, saves 34

## How

Single SQL update via the data-change tool:

```sql
UPDATE public.posts SET view_count = CASE id
  WHEN '<bali_id>' THEN 178
  WHEN '<aus_id>'  THEN 156
  WHEN '<thai_id>' THEN 134
END,
like_count = CASE id ... END,
save_count = CASE id ... END
WHERE user_id = (SELECT id FROM public.profiles WHERE phone = '+919619846170')
  AND id IN (...);
```

Post ids will be resolved by title match against that user's posts before running the update. Only the three denormalized counters on `posts` are touched — no fake rows inserted into `post_likes`/`post_saves`/`post_views`, so triggers won't fight the values.

## Notes

- These are display counters only; real user actions will continue to increment from the new baseline.
- If you'd rather have exact numbers per post, tell me the trio and I'll use those instead.
