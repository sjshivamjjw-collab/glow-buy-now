# Mobile optimization plan

The app is already mobile-first in layout (`max-w-lg`, bottom nav, touch-sized buttons). The gaps are around **performance, install-ability, network/data usage, and small UX details on real phones**. Below is a prioritized plan — pick any subset.

## 1. Faster initial load (biggest win)

- **Route-level code splitting**: convert routes in `src/App.tsx` to `React.lazy` + `<Suspense>`. Today every page (Admin panel, Create post, Settings, Legal pages, etc.) ships in the first JS bundle. On 4G this is the single biggest TTI win.
- **Defer the Razorpay script**: `index.html` loads `checkout.razorpay.com/v1/checkout.js` on every page. Load it only when entering checkout (inject the `<script>` on demand, or add `defer`). Saves ~80 KB + a blocking request on first paint.
- **Preconnect** to Supabase storage + Razorpay in `<head>` (`<link rel="preconnect">`).

## 2. Image & video data usage

Mobile users are often on cellular. Currently `<img>` and `<video>` tags use raw URLs.

- Add `loading="lazy"` + `decoding="async"` to all feed/grid images (DiscoverPage masonry, PostDetail carousel non-current slides, profile grids).
- Add explicit `width`/`height` or wrap in `AspectRatio` to kill CLS — masonry tiles already use fixed heights, but post media uses `aspect-[4/5]` which is fine; profile/comment avatars are sized via class.
- `<video>` in PostDetailPage: add `preload="metadata"` and `poster` (first frame), and **pause when the tab/page is hidden** (visibilitychange) and when the user scrolls it offscreen (IntersectionObserver) to save battery + data.
- For the discover cover thumbnails, prefer image cover (cover_kind === 'video' currently still pulls the video file for thumbnail — confirm a poster/thumbnail URL is used instead).

## 3. Make it installable (PWA)

Right now there's no manifest or service worker, so iOS/Android can't "Add to Home Screen" with a proper app shell.

- Add `vite-plugin-pwa` with a manifest (name "Ripple", theme `#0a0a0a`, icons in `public/`), and a runtime cache for Supabase storage GETs.
- Add iOS-specific tags: `apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style="black-translucent"`.
- Denylist `/~oauth` from the SW fallback so OAuth redirects always hit network.

## 4. Viewport / accessibility fixes

- `index.html` viewport has `maximum-scale=1` — this **blocks pinch zoom**, which fails WCAG 1.4.4. Remove `maximum-scale=1` (keep `viewport-fit=cover` for notch).
- Ensure all `<input>` elements have `font-size: 16px` (Tailwind `text-base`). iOS Safari auto-zooms on any input < 16px. Audit `text-sm` on the comment input, auth OTP input, search field.
- Add `env(safe-area-inset-bottom)` padding to `BottomNav` so it doesn't sit under the iPhone home indicator.

## 5. Interaction polish on touch

- Add `touch-action: manipulation` (Tailwind `touch-manipulation`) to all primary buttons to remove the 300 ms tap delay on older Android browsers.
- The DiscoverPage category dropdown closes on `mousedown` — also listen to `touchstart` (or use `pointerdown`) so it closes reliably on touch.
- Respect `prefers-reduced-motion` for the masonry/heart pulse animations.

## 6. Smaller wins

- Debounce the Discover search (Fuse runs on every keystroke over up to 80 posts — fine now, but add `useDeferredValue` for safety as content grows).
- Add `<link rel="preload" as="image" fetchpriority="high">` for the LCP image on PostDetail (the current media).
- Cache the `get_trending_posts` RPC result in React Query (or sessionStorage) so back-navigation from a post to Discover doesn't refetch + re-layout.

## Suggested order

1. Viewport fix + safe-area + input font-size (5 min, big a11y/UX win)
2. Lazy-load Razorpay + route code-splitting (perf win, low risk)
3. Image `loading="lazy"` + video pause-when-hidden
4. PWA (manifest + SW)
5. Polish: reduced-motion, touch-action, preconnect, query cache

Tell me which group(s) to implement — or "all of 1-3" for the fastest visible improvement.
