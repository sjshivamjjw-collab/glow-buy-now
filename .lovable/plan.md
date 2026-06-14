# Add 4 PostHog events

Simple `track(...)` calls using the existing `@/lib/analytics` wrapper (which already calls `posthog.capture`). No new hooks, no refactors, no touching auth/OTP logic.

## Events

### 1. `post_opened`
**File:** `src/pages/PostDetailPage.tsx`
Add a `useEffect` that fires once when the post finishes loading (so `id`, `title`, `category` are available — not on the loading-skeleton render).
```ts
useEffect(() => {
  if (!post?.id) return;
  track('post_opened', {
    post_id: post.id,
    post_title: post.title ?? null,
    post_category: post.category ?? null,
  });
}, [post?.id]);
```

### 2. `signup_modal_shown`
**File:** `src/components/AuthGate.tsx`
The existing `openSignIn` already fires `signin_modal_opened`. Add the new event alongside it (do not remove the old one — other dashboards may use it):
```ts
track('signup_modal_shown', { trigger_action: action || 'generic' });
```
Placed right after the existing `track('signin_modal_opened', …)` call in `openSignIn`. Auth flow untouched.

### 3. `signup_completed`
**File:** `src/contexts/AuthContext.tsx`
The `onAuthStateChange` handler already fires `signin_completed` on `SIGNED_IN`. PostHog/Supabase don't distinguish first-time signup from a returning sign-in at the event level, so we infer "new user" by comparing `session.user.created_at` to `last_sign_in_at` (or to "now" within a small window). Add — without changing any existing logic — right after the existing `signin_completed` track call:
```ts
const u = session.user;
const createdAt = u.created_at ? new Date(u.created_at).getTime() : 0;
const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
const isNewUser = createdAt > 0 && Math.abs(lastSignIn - createdAt) < 60_000;
if (isNewUser) {
  track('signup_completed', { provider: u.app_metadata?.provider || 'phone' });
}
```
No changes to OTP code, profile bootstrap, or anything else.

### 4. `search_performed`
**File:** `src/pages/DiscoverPage.tsx`
Inside the existing search `useEffect` (around line 313–347), after `setSearchPosts(postList)` and `setSearchPeople(...)` are set, fire:
```ts
track('search_performed', {
  search_query: q,
  results_count: postList.length + ((peopleRes.data as any[] | null)?.length ?? 0),
});
```
This fires once per debounced query with the final result count. No change to search behaviour.

## Files touched
- `src/pages/PostDetailPage.tsx` — add one `useEffect`.
- `src/components/AuthGate.tsx` — one extra `track()` line in `openSignIn`.
- `src/contexts/AuthContext.tsx` — one extra `track()` block after existing `signin_completed`.
- `src/pages/DiscoverPage.tsx` — one `track()` call inside existing search effect.

No other files, no new dependencies, no logic changes.
