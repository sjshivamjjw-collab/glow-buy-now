# Analytics setup for Ripple

Two complementary tools, both free, both privacy-respecting enough to ship without a cookie banner (PostHog in "no-cookie" mode + GSC which doesn't track users at all).

## What you'll get

**PostHog dashboard answers:**
- Total visitors / unique visitors / pageviews (daily, weekly, monthly)
- Top pages (which posts get the most views)
- Where visitors come from (Google, direct, social)
- Device / country / browser breakdown
- **Funnel: anonymous visitor → opened sign-in modal → signed up → created first post** (the key Ripple metric)
- Retention: how many users come back after day 1, 7, 30
- Works on both web AND inside the iOS/Android app (same dashboard)

**Google Search Console answers:**
- Which Google searches show Ripple in results
- Click-through rate per query
- Indexing status (which pages Google has crawled)
- Mobile usability issues

## Setup steps

### 1. PostHog account (you do this, 2 min)
- Sign up at posthog.com (free tier = 1M events/mo, way more than you'll use)
- Copy the Project API Key (starts with `phc_...`)
- Paste it when I ask via the secrets tool

### 2. PostHog integration (I build this)
- Add `posthog-js` package
- New file `src/lib/analytics.ts` — initializes PostHog, exposes `track(event, props)` helper
- Initialize in `src/main.tsx` with no-cookie config (uses localStorage, no GDPR banner needed)
- Add route-change tracking in `App.tsx` so every page navigation = a pageview
- Identify signed-in users by their `auth.uid()` in `AuthContext.tsx` (anonymous visitors stay anonymous until they sign in — PostHog auto-merges the two sessions)
- Track key events at their call sites:
  - `signin_modal_opened` (in `AuthGate.tsx` — fires when guest taps a gated action)
  - `signin_completed` (in `AuthContext.tsx`)
  - `post_created` (in `CreatePostPage.tsx`)
  - `post_liked`, `post_saved`, `user_followed` (in `PostDetailPage.tsx`, `UserProfilePage.tsx`)
  - `post_viewed` (in `PostDetailPage.tsx`)
- Native: PostHog's web SDK works inside Capacitor's webview, so no extra plugin needed. Events from the app show up under the same project with `$device_type: Mobile`.

### 3. Google Search Console (I do this via connector)
- Use the `google_search_console` connector you already have linked
- Generate a meta-tag verification token for `https://myripple.co.in/`
- Add the `<meta name="google-site-verification" ...>` tag to `index.html`
- Call the verify endpoint
- Add the verified site to your Search Console property list
- After this, Google starts collecting data automatically (first results appear in ~48 hrs)

### 4. Submit sitemap (bonus, helps SEO)
- Generate `public/sitemap.xml` with your static legal pages + a dynamic note that posts are crawlable
- Submit it to GSC

## What you'll need to do after I ship

1. Create PostHog account → paste API key when prompted
2. Wait 24-48 hrs for first data
3. In PostHog: create a "Sign-up funnel" insight using the events listed above (I'll include the exact event names in a `docs/ANALYTICS.md` cheat-sheet)
4. In GSC: nothing — data starts flowing automatically

## What I am NOT adding (and why)

- **Google Analytics 4** — would force a cookie consent banner in EU and the data overlaps with PostHog. Skip unless you specifically need Google Ads attribution later.
- **Server-side analytics on edge functions** — not needed for visitor counting; PostHog client-side is enough.
- **Session replay** — PostHog supports it but it's heavier and raises privacy questions for a social app with DMs. Can be turned on later from the PostHog dashboard with one click.

## Files I'll touch

- new: `src/lib/analytics.ts`
- new: `docs/ANALYTICS.md` (event reference + how to read the PostHog dashboard)
- new: `public/sitemap.xml`
- edited: `index.html` (GSC meta tag)
- edited: `src/main.tsx` (init PostHog)
- edited: `src/App.tsx` (route-change pageview tracker)
- edited: `src/contexts/AuthContext.tsx` (identify user on sign-in, reset on sign-out)
- edited: `src/components/AuthGate.tsx` (track sign-in modal opens)
- edited: `src/pages/CreatePostPage.tsx`, `PostDetailPage.tsx`, `UserProfilePage.tsx` (track key events)
- edited: `package.json` (`posthog-js`)
- edited: `mem://index.md` + new `mem://features/analytics`

Approve and I'll ship it. After approval I'll ask for the PostHog API key via the secrets tool.
