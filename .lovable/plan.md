## Honest SEO health check

Ripple has the basics in place — sitemap, robots.txt, canonical URL, OG image, favicon, theme color, and a custom domain (myripple.co.in). But the last SEO scan flagged real gaps that hurt Google rankings. Here's where we stand and what I'd fix.

### What's already good
- `public/robots.txt` — crawlers explicitly allowed (Google, Bing, social)
- `public/sitemap.xml` — public legal/landing routes listed
- Custom domain configured, HTTPS, mobile viewport, favicon, OG image
- PostHog analytics + Google Search Console scaffolding in place

### What's broken (from the latest SEO review)

1. **Identical metadata on every page** (high severity). Every route serves the same `<title>` and `<meta description>` from `index.html`. Google sees /, /p/:id, /u/:userId, /about, /terms all as "Ripple — Everyday things worth sharing". This is the single biggest ranking blocker.

2. **No per-page social previews**. Sharing a post link on WhatsApp/Twitter shows the generic Ripple card instead of the post's title and image. `og:url` is also missing.

3. **No structured data on content pages**. No JSON-LD for posts (Article/SocialMediaPosting) or profiles (ProfilePage/Person). This blocks rich results in Google.

4. **Missing/weak H1s**. PostDetailPage, OnboardingPage have no H1. Home H1 is just the user's name. Auth page H1 lacks a descriptor.

5. **Icon-only buttons missing aria-labels** (PostDetailPage back/like/carousel, UserProfilePage, NotificationsPage). Hurts accessibility score, which Lighthouse rolls into SEO signals.

6. **No `<main>` landmark**. Screen readers and crawlers can't identify the primary content region.

7. **LCP / image sizing**. Images lack explicit width/height, causing layout shift and a slow Largest Contentful Paint on the home feed.

8. **Sitemap is incomplete**. Only legal pages listed — no profiles, no posts. Google has nothing to crawl beyond the footer pages.

9. **GSC verification token still a placeholder** in `index.html` (commented out). Until verified, you can't track impressions or submit the sitemap.

## Proposed fix plan (one focused pass)

### A. Per-page metadata (biggest win)
- Install `react-helmet-async` and wrap the app with `HelmetProvider`.
- Add a small `<SEO>` component (title, description, canonical, og:title/og:url/og:image, og:type).
- Apply it to: `DiscoverPage`, `PostDetailPage` (post.title + first media as og:image, type=article), `UserProfilePage` (username + bio), `AboutPage`, `ContactPage`, `TermsPage`, `PrivacyPage`, `SupportPage`, `DeleteAccountPage`, `AuthPage`.
- Remove static canonical from `index.html` (each route owns its own); keep sitewide og:* as fallback for non-JS crawlers.

### B. Structured data (JSON-LD)
- Sitewide `Organization` + `WebSite` (with SearchAction) in `index.html`.
- Per-post `SocialMediaPosting` schema (headline, author, datePublished, image) in `PostDetailPage`.
- Per-profile `ProfilePage` schema in `UserProfilePage`.

### C. Content & semantics
- Add a proper H1 to `PostDetailPage` (post title), `OnboardingPage` ("Set up your profile"), rewrite home H1 to describe the feed, expand Auth H1.
- Wrap routed content in a single `<main>` inside `AppLayout`.
- Add `aria-label` to all icon-only buttons (back, like, carousel nav, notifications).

### D. Sitemap upgrade
- Replace the hand-edited `public/sitemap.xml` with a `scripts/generate-sitemap.ts` generator wired into `predev`/`prebuild`.
- Static routes: keep current list.
- Dynamic: query Supabase at build time for all public posts (`/p/:id`) and all profiles (`/u/:userId`) — same filters as the page loaders.

### E. Performance
- Add explicit `width`/`height` (or `aspect-*` wrapper) on feed/post images.
- `fetchpriority="high"` and remove `loading="lazy"` on the first above-the-fold image of the home feed.

### F. Google Search Console
- Use the connector flow to programmatically verify `https://myripple.co.in/` via meta tag, then add the property and submit the new sitemap.

## Out of scope (intentional)
- **Server-side rendering**. Lovable is client-rendered. Googlebot executes JS so per-page titles/JSON-LD work for Search. WhatsApp/Slack/LinkedIn crawlers do NOT execute JS — they'll keep showing the sitewide preview no matter what we do here. I'll be honest about this rather than promise per-post social cards.
- Backlinks, content strategy, keyword research — those are ongoing work, not a code change.

## Questions before I build
1. Do you want all of A–F in one pass, or start with A+B+D (the metadata + sitemap + structured-data trio that moves the ranking needle) and do C/E/F next?
2. For per-post social previews on WhatsApp/Twitter (the JS-crawler limitation above) — is that important enough that we should later build a small edge function that pre-renders OG tags for `/p/:id` URLs?
