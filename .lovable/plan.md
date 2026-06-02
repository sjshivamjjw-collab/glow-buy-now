# Final store-submission prep — 4 tasks

Knock out the remaining items so the repo is fully ready for both Apple App Store and Google Play submission.

## 1. App icon + splash source assets

- Generate a **1024×1024 opaque PNG** for `resources/icon.png` — Ripple wordmark/ripple-drop mark in brand red `#dc0000` on a clean white background, no transparency, no rounded corners (iOS masks it). Premium quality (legible mark).
- Generate a **2732×2732 splash** at `resources/splash.png` — centered Ripple mark on solid `#ffffff` background to match brand (overriding the old `#0a0a0a` example in `resources/README.md`).
- Update `resources/README.md` to reflect the white background (`--iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff'`) so `capacitor-assets generate` uses Ripple branding.

## 2. Android submission runbook

Create `docs/PLAY_STORE_SUBMISSION.md` — parallel to the iOS runbook — covering:

- Prereqs: Google Play Console account ($25 one-time), Android Studio, JDK 17.
- First-time setup: `npx cap add android`, `npx capacitor-assets generate --android`, `npx cap sync android`, `npx cap open android`.
- `AndroidManifest.xml` permissions block (matches the cheat-sheet in `docs/PLAY_STORE_DATA_SAFETY.md`): `INTERNET`, `CAMERA`, `RECORD_AUDIO`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE` (maxSdkVersion=32), `POST_NOTIFICATIONS`.
- `build.gradle` config: `applicationId "in.myripple.app"`, `minSdkVersion 23`, `targetSdkVersion 34`, `versionCode 1`, `versionName "1.0.0"`.
- Keystore generation (`keytool -genkey ...`) + where to store `.jks` (NOT in repo) + `key.properties` setup.
- Build signed AAB: Android Studio → Build → Generate Signed Bundle → AAB → release.
- Play Console: create app, internal testing track first, upload AAB, fill Data Safety form (point to `PLAY_STORE_DATA_SAFETY.md`), Content rating IARC, Target audience 18+, Store listing copy (point to `docs/store-listing-description.txt`), screenshots (phone 1080×1920 min 2, 7" tablet optional).
- Submit for review (1–7 days typical for first release).
- OTA via Capgo — same as iOS, single bundle covers both platforms.

## 3. Onboarding/feed content sanity check

- Read `src/pages/OnboardingPage.tsx`, `src/pages/Index.tsx`, and any feed-seed/empty-state code to confirm a brand-new account does not see placeholder/lorem text or empty broken states.
- If the empty feed shows a blank screen, add a friendly empty state ("Follow some creators to fill your feed" + CTA to `/discover`). Apple 4.3/2.1 rejections often cite "no content on first launch".
- No DB changes — purely a frontend empty-state polish if needed.

## 4. Reviewer test account in submission docs

Append a **"App Review Information"** section to `docs/APP_STORE_SUBMISSION.md` and the new `docs/PLAY_STORE_SUBMISSION.md` with:

- Demo phone: `+91 9999966666` (already in `DEV_PHONES` allowlist in `supabase/functions/send-otp/index.ts`)
- OTP: `123456` (fixed for DEV_PHONES)
- Contact email: pulled from existing contact page
- Note for reviewer: "This bypasses SMS so no real device or SIM is required. The account is pre-seeded with sample posts."
- Mirror the same block under Play Console → App content → App access (login required).

## Technical notes

- All file edits are docs/assets only except possibly an empty-state component in task 3.
- No DB migrations, no edge function changes, no new dependencies.
- After task 1, the user still needs to run `npx capacitor-assets generate` on their Mac — we can't run it from Lovable since the `ios/` and `android/` folders are created locally.
