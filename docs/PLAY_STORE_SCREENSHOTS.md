# Ripple — Play Store Screenshots (no emulator needed)

You don't need an Android phone or emulator to capture Play Store screenshots. Chrome's built-in device mode produces images Google accepts.

## Play Store screenshot rules

- **Count:** minimum 2, maximum 8 phone screenshots
- **Dimensions:** 16:9 or 9:16 aspect ratio, between 320 px and 3840 px on the longest side
- **Format:** PNG or JPEG, max 8 MB each
- **What we'll capture:** 390 × 844 (Pixel 7 portrait — well within the rules)

## Setup (one time, ~2 min)

1. Open **Chrome** (incognito window is cleaner — no extensions, no autofill).
2. Go to `https://myripple.co.in`.
3. Open DevTools: `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Win/Linux).
4. Toggle device toolbar: `Cmd+Shift+M` / `Ctrl+Shift+M`.
5. In the top bar of the device toolbar:
   - Set **Dimensions** dropdown → "Responsive"
   - Set width `390`, height `844`
   - Set **DPR** (device pixel ratio) → `3` (sharper output)
   - Zoom → `100%`
6. Log in with the demo reviewer account:
   - Phone: `+91 9999966666`
   - OTP: `123456`

## The 6 screenshots to capture

Capture in this order — the **first one** is what shows in Play Store search results, so make it strong.

| # | Screen | Route | Notes |
|---|---|---|---|
| 1 | Home / Discover feed | `/` | Scroll until you see a post with a great image. This is the hero shot. |
| 2 | A creator's profile | `/u/<some-handle>` | Pick a profile with a nice avatar, bio, and a few posts visible. |
| 3 | Community room (Chat) | `/c/<slug>/room` | Pick a community with real chat messages. Tabs visible at top. |
| 4 | Post detail with comments | `/p/<post-id>` | Pick a post that has 2–3 comments so the discussion feels alive. |
| 5 | Create post | `/create` | Fresh state — shows the upload UI and prompt field. |
| 6 | Onboarding welcome | `/onboarding` | Use a fresh phone number to trigger this, or screenshot during signup. |

## How to capture (each screenshot)

1. Navigate to the screen.
2. Wait for all images and avatars to load (no skeletons, no spinners).
3. In DevTools, click the **⋮ (three dots)** at the top-right of the device toolbar.
4. Choose **"Capture screenshot"** — **NOT** "Capture full size screenshot" (that gives you the whole scrollable page, which Play Store will reject for being too tall).
5. Chrome saves it to your Downloads folder as `myripple.co.in_<timestamp>.png` at `390 × 844`.
6. Rename to `01-feed.png`, `02-profile.png`, … `06-onboarding.png`.

## Where to save them

Create a folder **outside the repo** (these are upload-only assets, no need to commit):

```
~/Documents/ripple-store-assets/
  ├── play-store/
  │   ├── feature-graphic.png         # use resources/play-feature-graphic.png
  │   ├── icon-512.png                # resize resources/icon.png to 512x512
  │   └── screenshots/
  │       ├── 01-feed.png
  │       ├── 02-profile.png
  │       ├── 03-community.png
  │       ├── 04-post-detail.png
  │       ├── 05-create.png
  │       └── 06-onboarding.png
  └── app-store/                      # reuse same screenshots later for iOS
```

## Uploading to Play Console

1. Play Console → your app → **Main store listing** → **Phone screenshots** section
2. Drag in `01-feed.png` first, then the rest in order
3. Save → preview the listing to confirm they look good on the storefront

## Optional polish (skip unless you want it)

If you want screenshots framed inside a phone mockup (improves Play Store CTR by ~10–20%):

- **mockuphone.com** — free, drag in PNG → choose Pixel 7 → download framed PNG
- **screenshots.pro** — free tier, adds gradient backgrounds + captions
- **previewed.app** — paid, but produces polished marketing-style mockups with text overlays

Not required by Google — plain 390×844 screenshots are fully accepted.

## Common mistakes that get rejected

- ❌ "Full size screenshot" (scrollable page, exceeds 3840px height limit)
- ❌ Screenshots with developer/test UI visible (DevTools docked, admin banners)
- ❌ Screenshots with placeholder/lorem text or empty states
- ❌ Screenshots with notifications, system overlays, or other apps visible
- ❌ Mixing portrait and landscape orientations (pick one — portrait for Ripple)
- ❌ Screenshots of the Lovable preview URL (badge visible) — always use `myripple.co.in`

## Re-shooting later

Anytime you ship a meaningful UI change you want reflected in the store, repeat this process and **replace screenshots in Play Console** (no app resubmission needed for store listing updates — they go live in a few hours after Google review).
