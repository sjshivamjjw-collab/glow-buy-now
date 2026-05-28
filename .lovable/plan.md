# Ship Ripple to the Apple App Store (Individual account)

A two-track plan: **you** handle the Apple-side paperwork in parallel while **I** prep the codebase, assets, and build so a signed `.ipa` is ready the moment your account is approved.

---

## Track A — What you do (Apple side, ~30 min today)

1. **Enroll in the Apple Developer Program** (Individual) — https://developer.apple.com/programs/enroll/
   - Apple ID with 2FA enabled
   - Govt photo ID (PAN or Passport — Passport is smoother for Indian individuals)
   - Credit/debit card for the $99/year fee
   - Legal name on Apple ID must match your ID exactly
2. **Wait for approval** — usually 24–48 hrs, sometimes up to a week. You'll get an email.
3. **On a Mac**, install the latest **Xcode** from the Mac App Store (free, ~10 GB). Required — there is no Windows/Linux path for iOS submission.
4. Once approved: sign in to Xcode → Settings → Accounts → add your Apple ID.

If you don't own a Mac, options: borrow one for a day, rent a cloud Mac (MacInCloud, ~$25 for a few days), or use a Mac mini at a local Apple-authorized service centre.

---

## Track B — What I do (codebase, this session)

### 1. App identity & store metadata
- Change Capacitor `appId` from the generic `app.lovable.74c9b69b...` to a proper reverse-DNS ID: **`in.myripple.app`** (matches your domain, looks professional, locks in for life — can't be changed after first submission).
- Change `appName` to **Ripple**.
- Add iOS-specific Info.plist usage strings (camera, photo library, microphone — required because the app uses media + livestreams; missing strings = automatic rejection).

### 2. App icon + splash
- Generate the full iOS icon set (1024×1024 marketing + all required sizes) from your existing Ripple icon.
- Generate splash assets matching the dark `#0a0a0a` theme.
- Place under `ios/App/App/Assets.xcassets/` via `@capacitor/assets`.

### 3. Production build config
- Comment out the `server.url` hot-reload block in `capacitor.config.ts` (critical — leaving it in ships a binary that loads the Lovable sandbox = instant rejection + broken app).
- Add a documented `capacitor.config.prod.ts` so dev hot-reload stays easy.

### 4. App Store Connect compliance prep
- **Privacy Nutrition Label data**: I'll generate a checklist mapping every data type Ripple collects (phone, name, photos, posts, usage) to Apple's privacy categories — you paste this into App Store Connect.
- **Sign in with Apple**: Apple **requires** this if you offer any third-party login. You currently use phone OTP only, so you're exempt — but if Google sign-in gets added later, Apple sign-in becomes mandatory. I'll add a note in the plan doc.
- **Account deletion**: Apple requires in-app account deletion since 2022. I'll verify `SettingsPage` has this and add it if missing.
- **Age rating**: livestream + UGC chat = **17+** rating. I'll prep the answers for the App Store Connect age questionnaire.

### 5. Store listing assets (drafts you can edit)
- App name (30 chars): `Ripple — Real Recommendations`
- Subtitle (30 chars): `Everyday things worth sharing`
- Promotional text, description, keywords (100 chars), support URL (`myripple.co.in/contact`), privacy URL (`myripple.co.in/privacy`)
- Screenshot spec: 6.7" iPhone (1290×2796) — 3–10 screens. I'll list which screens to capture once you have a Mac.

### 6. README section: "Building for App Store"
A copy-paste runbook for the Mac steps:
```text
git pull
npm install
npm run build
npx cap sync ios
npx cap open ios
# Then in Xcode: select "Any iOS Device", Product → Archive → Distribute → App Store Connect
```

---

## What I'll deliver this session (files changed)
- `capacitor.config.ts` — new appId, production-safe server block
- `ios/` directory — added via `npx cap add ios` (you'll run this on Mac; I'll prep the config so it just works)
- `resources/icon.png`, `resources/splash.png` — source images for `@capacitor/assets`
- `package.json` — add `@capacitor/assets` script `generate:icons`
- `src/pages/SettingsPage.tsx` — verify/add account deletion entry point
- `docs/APP_STORE_SUBMISSION.md` — full submission runbook, privacy label answers, age rating answers, store listing copy

## What I will NOT do
- I won't touch any backend, RLS, or feature code — pure shipping prep.
- I won't change product UX (your onboarding/city change from earlier stays as-is).

---

## Decisions I need from you before I start

1. **Bundle ID**: confirm `in.myripple.app` (recommended) or give a different reverse-DNS string. **This is permanent.**
2. **Account deletion**: should it (a) immediately wipe data, or (b) soft-delete with a 30-day recovery window? Apple accepts either but (b) is friendlier.
3. **Do you already have a Mac?** Affects whether the README runbook assumes local Xcode or a cloud Mac service.

Once you answer those 3, I'll switch to build mode and execute Track B end-to-end in one pass.
