# Fixing the tester feedback

You raised three things. #1 (smooth download) is great — no action needed. The other two are real and both fixable.

---

## Issue 2 — App icon shows generic Android robot instead of Ripple

### What's happening

The Ripple icon you see on the Play Store listing page comes from the **store listing** (the 512×512 you uploaded in Play Console). The icon on the **installed app** comes from inside the APK/AAB itself — specifically from `android/app/src/main/res/mipmap-*` folders.

Right now your project has the **source** icon at `resources/icon.png`, but the **generated** native icon folders (`android/app/src/main/res/mipmap-*`) were never produced — so the AAB you uploaded shipped with Capacitor's default placeholder (the generic Android blue icon).

### Fix (you run this locally once, then upload a new AAB)

On your Mac, in the exported project:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --android \
  --iconBackgroundColor '#ffffff' \
  --splashBackgroundColor '#ffffff'
```

This regenerates every `mipmap-mdpi` … `mipmap-xxxhdpi` folder + the adaptive icon XML from `resources/icon.png`. Then:

```bash
cd android
./gradlew bundleRelease
```

Upload the new `.aab` as a new release in your closed test track. Existing testers will get the update automatically and the proper Ripple icon will appear.

### Bonus — also fix the splash

While you're at it, the same command will regenerate the splash from `resources/splash.png` so the launch screen also looks branded.

---

## Issue 3 — App is slow (feed, images, tab switches)

This is the more impactful one. Based on the code, there are **four likely culprits**, in order of impact:

### A. Every image fetches a fresh signed URL on mount (biggest hit)

`SignedImage` / `SignedLink` / `LazyVideoThumbnail` call `getSignedUrl()` on every mount. That's an HTTP round-trip to Supabase **per image, every time the component renders** — even if you scroll away and back, or open a post and return. On a feed with 10 posts × multiple images, that's 20–40 sequential network calls before anything paints.

**Fix:** add an in-memory signed-URL cache keyed by `bucket+path`, with TTL = 50 minutes (signed URLs last 60 min). One call per image per hour instead of per mount.

### B. No image resizing — full-resolution photos served to thumbnails

Post covers and grid thumbnails currently load the full uploaded image (could be 3–5 MB phone photos). On 4G this kills perceived speed.

**Fix:** use Supabase's built-in image transformation by passing `transform: { width, quality }` to `createSignedUrl`. Serve ~600px wide @ 75 quality for feed thumbnails, full-res only on the detail page.

### C. Feed re-fetches on every navigation back

`feedCache.ts` exists and is good, but worth verifying the trending page actually uses it on remount (not just on first mount). If it's re-querying Supabase + re-signing every image every time the user comes back from a post, that explains the "tab switching is slow" feeling.

### D. Videos preload metadata in the feed

`LazyVideoThumbnail` uses `preload="metadata"` — on a feed with several videos this is several MB of range requests just to get poster frames. Switch to `preload="none"` and rely on the `poster` prop (which we'd populate from a generated thumbnail) or show a static placeholder until tapped.

### What I'd ship in one pass

1. Signed-URL memory cache (TTL 50 min) — wraps `getSignedUrl`
2. Image transform params in `getSignedUrl` — new optional `{ width, quality }` arg; SignedImage and feed thumbnails pass `width: 600, quality: 75`
3. Video thumbs: `preload="none"` + lazy
4. Verify feed cache is hit on back-navigation from post detail

Expected result: first paint of the feed in <1s on 4G after first load, subsequent navigations near-instant.

---

## What I need from you before I build

1. **Icon fix** — do you want me to (a) just confirm the steps above and let you run them locally, or (b) also document this in `docs/PLAY_STORE_SUBMISSION.md` so you don't forget for future builds? *(I can't run `capacitor-assets` from here — Lovable doesn't have access to your `android/` folder, that's generated only on your Mac.)*

2. **Performance fix** — green-light me to ship all four changes (A–D) in one go? They're all backend-safe (no schema changes, no breaking behavior — just caching + smaller images).
