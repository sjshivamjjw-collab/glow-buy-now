Two small deliverables so you can finish the Play Console listing without an Android emulator.

## 1. Feature graphic — `resources/play-feature-graphic.png` (1024×500)

Required by Play Console (banner that appears at the top of your store listing). Generate via `imagegen` with Ripple brand: solid white background, large red ripple/water-drop mark on the left, "Ripple" wordmark in red `#dc0000` with the tagline "Everyday things worth sharing" beneath it on the right. Clean, mobile-app-store aesthetic — same visual language as the icon and splash so the listing feels coherent.

After generation, view the PNG once to confirm no text clipping, correct dimensions, no AI artifacts in the wordmark. Re-roll if anything is off.

## 2. Screenshot capture guide — `docs/PLAY_STORE_SCREENSHOTS.md`

Short markdown runbook covering the no-emulator path:

- **Tool:** Chrome DevTools device mode (built in, free) at viewport **390×844** (Pixel 7 size, accepted by Play Store: must be 16:9 or 9:16, 320–3840 px on the longest side).
- **What to capture (6 screenshots, matches what App Store asks for):**
  1. Home / Discover feed with real posts visible
  2. A creator's profile page
  3. A community room (Chat tab with messages)
  4. Post detail with comments visible
  5. Create post screen
  6. Onboarding "Welcome to Ripple" screen
- **How:** open `https://myripple.co.in` in Chrome → DevTools → Toggle Device Toolbar (Cmd/Ctrl+Shift+M) → set 390×844 → log in with demo phone `+91 9999966666` / OTP `123456` → navigate to each screen → DevTools 3-dot menu → "Capture screenshot" (NOT full-size — Play Store wants viewport size only).
- **Naming:** save as `01-feed.png`, `02-profile.png`, etc. into `play-store-assets/screenshots/` locally on your machine (not the repo — these are upload-only assets).
- **Upload order:** in Play Console → Main store listing → Phone screenshots → drag in numerical order. First screenshot is the one shown in search results, so make it the most visually appealing.
- **Optional polish:** mention `mockuphone.com` or `screenshots.pro` for free device-frame mockups if they want screenshots that look like they're inside a phone — not required by Play Store but improves listing CTR.

## What changes
- New file: `resources/play-feature-graphic.png`
- New file: `docs/PLAY_STORE_SCREENSHOTS.md`

No code, no DB, no dependencies. Pure store-asset prep.