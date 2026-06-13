# Ripple — Analytics & SEO tracking

Two tools, both free, both privacy-respecting (no cookie banner needed).

## 1. PostHog — visitor counts, events, funnels

### One-time setup (you do this)

1. Sign up at **https://posthog.com** → create a project named "Ripple".
2. In **Project Settings → Project API Key**, copy the key (starts with `phc_...`).
3. Note the host: **US Cloud** = `https://us.i.posthog.com`, **EU Cloud** = `https://eu.i.posthog.com`.
4. Open `src/lib/analytics.ts` and paste both into the two constants at the top:
   ```ts
   const POSTHOG_KEY = 'phc_xxxxxxxxxxxxxxxx';
   const POSTHOG_HOST = 'https://us.i.posthog.com';
   ```
5. Save. Analytics is now live on web + inside the iOS/Android webview.

Until you paste the key, the analytics module is a safe no-op — nothing
breaks, just no data flows.

### Events tracked

| Event | Where it fires | Properties |
|---|---|---|
| `$pageview` | Every route change | `$current_url` |
| `signin_modal_opened` | Guest taps a gated action (like, save, comment, follow, post, …) | `action` |
| `signin_completed` | Auth state changes to SIGNED_IN | `provider` (google / apple / phone) |
| `post_created` | New post saved successfully | `post_id`, `category`, `media_count` |
| `post_liked` / `post_unliked` | Like button on a post | `post_id` |
| `post_saved` / `post_unsaved` | Save button on a post | `post_id` |
| `post_commented` | New comment posted | `post_id`, `is_reply` |
| `user_followed` / `user_unfollowed` | Follow button on a profile | `target_user_id` |

Add more with `import { track } from '@/lib/analytics'; track('event_name', { ... });`

### Dashboards to build in PostHog

1. **Visitors over time** — Insights → Trends → `$pageview`, unique users, last 30 days.
2. **Top pages** — Insights → Trends → `$pageview` broken down by `$current_url`.
3. **Sign-up funnel** — Insights → Funnels:
   `signin_modal_opened` → `signin_completed` → `post_created`
   Answers: *of all guest visitors who hit a gated action, how many sign up, and how many post?*
4. **Retention** — Insights → Retention, performed event = `$pageview`, returning event = `$pageview`, weekly. Cohort by first sign-in week.

### Native app

The web SDK runs inside Capacitor's webview, so the iOS/Android app
reports under the same project with the property `platform: native`.
Filter any insight by `platform = native | web` to compare.

## 2. Google Search Console — search traffic & indexing

### Verify the domain

1. Open https://search.google.com/search-console → "Add property" → URL prefix → `https://myripple.co.in/`.
2. Pick the **HTML tag** method. Google gives you a meta tag like:
   ```html
   <meta name="google-site-verification" content="abc123..." />
   ```
3. Open `index.html`, find the commented-out line and replace it with the real tag (uncomment it). Deploy.
4. Click "Verify" in Search Console. Data starts appearing in 24–48 hours.

### Sitemap

`public/sitemap.xml` ships with the public legal/landing routes. In
Search Console → Sitemaps, submit `https://myripple.co.in/sitemap.xml`.

Posts and profiles aren't listed individually (the sitemap would balloon).
Google still discovers them by crawling internal links — that's enough
for a social app.

## What I am NOT tracking (and why)

- **Google Analytics 4** — would require a cookie consent banner in the
  EU and overlaps with PostHog. Add later only if you need Google Ads
  attribution.
- **Session replay** — supported by PostHog but heavier and raises
  privacy concerns for a social app with private chats. Toggle it on
  later from PostHog → Project Settings if you want it.
