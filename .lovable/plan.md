# Public Web Browsing (Web only, Native stays gated)

Anonymous visitors on the web can browse the full app read-only. Native app (iOS / Android) continues to require sign-in exactly as today. Any write action (like, comment, follow, post, save, RSVP, chat, etc.) opens an inline "Sign in to continue" modal — closing it leaves the user where they were.

## Approach

Detect the runtime with `Capacitor.isNativePlatform()` (already wired via `src/lib/platform.ts`). One flag, `allowAnonymousBrowse = !isNative()`, controls every gate.

**Build & store-submission risk: none.** No new native plugins, no Capacitor config changes, no Xcode changes. Same `npm run build` → `npx cap sync` flow. The native binary keeps requiring sign-in so Apple/Google reviewers see no behavior change. Also OTA-safe via Capgo.

## Frontend changes

1. **`src/App.tsx` routing** — when `!isAuthenticated`:
   - On native → current behavior (redirect to `/auth`).
   - On web → render the full `AppLayout` tree, but treat the user as a "guest". Guests get Discover, post detail, user profile, communities, search — everything that's currently a read view. `/onboarding`, `/post/new`, `/p/:id/edit`, `/notifications`, `/saved`, `/profile`, `/settings`, `/admin` redirect to `/` with a sign-in prompt.

2. **New `useAuthGate()` hook + `<AuthPromptDialog />`** — global context (mounted once in `App.tsx`).
   - `requireAuth(action?: string)` returns `true` if signed in; otherwise opens the modal with copy like "Sign in to like posts" and returns `false`.
   - Modal CTAs: "Continue with Google", "Continue with Apple", "Use phone number" — same options as `/auth`. Cancel just closes it.

3. **Gate every write call site** with `if (!requireAuth('like')) return;` before mutating. Audit list:
   - `DiscoverPage.tsx` — like, save, follow, comment submit
   - `PostDetailPage.tsx` — like, save, comment, comment-like, report
   - `UserProfilePage.tsx` — follow, block, report
   - `BottomNav.tsx` + `AppLayout.tsx` — Create / Notifications / Saved / Profile tabs trigger the modal instead of navigating
   - `CreatePostPage.tsx` — guarded at route level (redirect)
   - `NotificationsPage`, `SavedPostsPage`, `ProfilePage`, `SettingsPage` — route-level redirect
   - Community room (chat send, RSVP, resource open) — gate the actions

4. **`AuthContext`** — add `isGuest: boolean` derived as `!isAuthenticated && !isNative()`. `loading` already handled. No storage changes.

5. **Top bar / nav affordance** — when guest, replace the profile avatar with a small "Sign in" button so the value prop is visible without forcing redirect.

## Backend changes (RLS + GRANTs)

Today every policy is scoped to `authenticated`. To let anon read the same content without weakening security, add `anon` policies mirroring existing read policies and grant SELECT/EXECUTE to anon on read-only surfaces. No schema changes.

Tables that get an `anon` SELECT policy + `GRANT SELECT TO anon`:
- `posts` — same `is_hidden = false AND is_anonymous masking` rule as the authenticated read policy (anon never sees the masked user_id of anonymous posts; already handled by the existing `CASE WHEN is_anonymous` logic in `get_post_public`/`get_trending_posts`, but mirrored here for direct selects).
- `post_media` — read all (already `true` for authenticated).
- `post_comments` — same masking rule (`is_anonymous = false`).
- `profiles` — anon can read `id, username, name, avatar_url, bio` (the columns shown publicly). Implemented as a policy + a column-level grant, or simpler: keep table grant + rely on the existing `get_public_profiles` RPC.
- `user_follows` — read all (for follower counts).
- `communities`, `community_tiers`, `community_channels` (only `required_tier_level = 0` ones), `community_events`, `community_resources` (with URL hidden for anon via the existing `TierLockOverlay` mechanism) — anon can list & view metadata, gated content stays hidden.

Security-definer RPCs that anon needs EXECUTE on (most already do the right CASE-masking):
- `get_trending_posts`, `get_post_public`, `get_post_comments_public`, `search_posts`, `search_locations`, `search_hashtags`, `get_public_profiles`, `get_chat_author_names`.

RPCs that must stay authenticated-only (they reference `auth.uid()`):
- `search_people` — already guarded with `auth.uid() IS NOT NULL`; leave as-is. Anon search results will return 0 rows — UI shows "Sign in to search people".
- `search_profiles_for_mention` — same, only used inside the comment composer (already gated).
- `get_comment_like_state`, `get_user_post_saves_count`, `has_role`, `get_blocked_user_ids` — authenticated-only.

Write privileges remain unchanged — every INSERT/UPDATE/DELETE policy stays scoped to `authenticated` + `auth.uid() = user_id`. Anon literally cannot mutate even if they bypass the UI gate.

## Files touched

- `src/App.tsx` — guest routing branch
- `src/contexts/AuthContext.tsx` — `isGuest` flag
- `src/hooks/useAuthGate.ts` (new) — `requireAuth()` hook
- `src/components/AuthPromptDialog.tsx` (new) — modal
- `src/components/AppLayout.tsx` — mount modal + Sign-in button for guests
- `src/components/BottomNav.tsx` — gate tab navigation
- `src/pages/DiscoverPage.tsx`, `PostDetailPage.tsx`, `UserProfilePage.tsx` — wrap write handlers
- `src/pages/CreatePostPage.tsx`, `NotificationsPage.tsx`, `SavedPostsPage.tsx`, `ProfilePage.tsx`, `SettingsPage.tsx` — route-level guest redirect
- Community pages — wrap write handlers
- 1 migration: anon SELECT policies + GRANTs + RPC EXECUTE grants

## Out of scope

- Anon write actions (none).
- Server-side rendering / SEO meta per post (separate task if you want crawlable post pages).
- Changing the OAuth/OTP flow itself.

## Reliability notes

- The web/native split lives in one constant; flipping it back is one line if anything goes wrong.
- Native users never hit the new code path — `isNative()` short-circuits before guest logic runs.
- RLS for writes is unchanged, so even a bug in the UI gate cannot let anon mutate data.
- Migration is additive (new policies, new grants). Reversible by dropping the new policies.
