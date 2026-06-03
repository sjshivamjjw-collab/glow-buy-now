# Get Ripple on Google Play — Fix Assets + Submission Walkthrough

You're right — the current Android screenshots are weak: they're just the iPhone screenshot floating in pink, with the iPhone notch and status bar still visible, no Ripple logo, no headline, no marketing context. The feature graphic also doesn't use the actual Ripple "R" mark.

I'll redo every Play Store asset to **match the App Store style we already shipped** (the iPad screenshots in `/mnt/documents/ipad-screenshots/` — pink gradient, real Ripple red icon at top, "Ripple" wordmark + tagline, then the framed screen below), then walk you through Play Console end-to-end.

---

## Part A — Regenerate the assets (I do this)

**Brand source of truth (already in repo):**
- App icon: `src/assets/ripple-logo.png` (red rounded square, white R) — same one used on iOS and the device home screen
- 1024 marketing icon: `/mnt/documents/ripple_appicon_1024.png`
- App name: **Ripple**
- Tagline: **For the little moments of everyday life** (matches splash) / shorter store tagline: **Everyday things worth sharing**
- Palette: Ripple red `#dc0000` on warm pink-to-white gradient (matches splash + iOS screenshots)
- Headline font: bold sans (same vibe as App Store shots)

**1. Feature graphic — `/mnt/documents/play-store/feature-graphic.png` (1024×500)**
- Pink gradient background (same as App Store)
- Real Ripple icon (red R) at left
- "Ripple" wordmark large, "Everyday things worth sharing" subtitle below
- No floating text-only layout like the current one

**2. Phone screenshots — `/mnt/documents/play-store/android-1..6.png` (1080×1920 portrait)**
Each frame uses the App Store template:
- Pink gradient background
- Real Ripple icon (small) + per-screenshot **headline** at top (e.g. "Share your day in seconds", "Join communities that get you", "Chat, events & resources in one room", "Real moments, real people", "Sign in in 10 seconds")
- Device-shaped frame (no iPhone notch — generic rounded rectangle so it reads as Android-neutral) with the actual app screen inside, drop shadow
- Clean ₹/INR content, no Lovable badge, no DevTools chrome

Source app screens: re-capture 6 screens from `https://myripple.co.in` at 390×844 / DPR 3 per `docs/PLAY_STORE_SCREENSHOTS.md` (Feed, Profile, Community Room, Post detail, Create, Onboarding). If you'd rather I reuse the 4 iPhone simulator shots you already uploaded, I'll strip the iPhone notch + status bar and reframe — say the word.

**3. Play Store launcher icon — `/mnt/documents/play-store/icon-512.png` (512×512)**
- Downscale of `ripple_appicon_1024.png`. Identical to what's on the App Store and the phone home screen.

**QA pass:** After generation I view every file, check for clipped text, overlap, wrong color, missing logo, iPhone artifacts. Re-render until clean. Only then hand them over.

---

## Part B — Submission walkthrough (you do this on Windows, ~2 hrs active work + 14-day testing wait)

You already have the `.aab` and the `.jks` keystore, so we skip the build steps. Full reference lives in `docs/PLAY_STORE_SUBMISSION.md` — below is the condensed sequence with the testing-track requirement baked in.

**Phase 1 — Create the app in Play Console (15 min)**
1. https://play.google.com/console → **Create app**
2. Name `Ripple`, Default language **English (India)**, App, Free, tick both declarations → **Create app**

**Phase 2 — "Set up your app" checklist (45 min)**
Fill every row in the left sidebar using `docs/PLAY_STORE_SUBMISSION.md` §6 + `docs/PLAY_STORE_DATA_SAFETY.md`:
- App access → paste reviewer creds (phone `+91 9999966666`, OTP `123456`)
- Ads → No
- Content rating → run IARC questionnaire → **Mature 17+**
- Target audience → 18+
- Data safety → fill exactly per the data-safety doc
- Government/news/health/finance/COVID → No
- Store settings → Category **Social**, tags Lifestyle + Communication

**Phase 3 — Main store listing (20 min)**
- App name: `Ripple`
- Short description (80): `Everyday things worth sharing. Real moments from real people.`
- Full description: paste from `docs/store-listing-description.txt`
- App icon: upload `icon-512.png` (Part A #3)
- Feature graphic: upload `feature-graphic.png` (Part A #1)
- Phone screenshots: upload `android-1..6.png` in order (Part A #2)
- Contact: `shivam@ripple-shop.com`, https://myripple.co.in, https://myripple.co.in/privacy

**Phase 4 — Closed Testing track (required for personal accounts)**
Google now requires **20 opted-in testers running the app for 14 consecutive days on Closed Testing** before the "Apply for production access" button unlocks (Personal account rule since Nov 2023).

1. **Testing → Closed testing → Create track** ("Closed alpha")
2. Upload your signed `.aab` → release notes "Initial closed test build"
3. **Testers tab** → create an email list, paste 20 Gmail addresses, save
4. Copy the **opt-in URL** and send to all testers
5. Roll out the release

**Where to find 20 testers (mix sources so it looks organic):**
- Family + friends WhatsApp (target 5–8)
- Telegram group **"Google Play Closed Testing"** (5000+ members, mutual-help)
- Reddit `r/AlphaandBetausers`, `r/TestMyApp`
- Fiverr backup — ₹500–1000 buys 15 testers within 24h

**Phase 5 — The 14-day wait**
- Each day, check **Closed testing → Track summary → Active testers**. Needs ≥12 for 14 **consecutive** days. Over-recruit to 20 so churn doesn't break the streak.
- Push 1–2 small updates during the window — keeps testers engaged and proves active development.

**Phase 6 — Apply for production access (Day 14)**
- Production → **Apply for production access** form appears. Answer the 4 questions (target users, testing summary, feedback received, how you'll handle support).
- Google reviews **1–3 business days**.

**Phase 7 — Production release**
1. **Production → Create new release** → upload same (or newer) `.aab`
2. Paste "What's new in this release"
3. **Send for review** → first review **1–7 days**, usually closer to 1–2.
4. Google approves → staged rollout (20% → 100%) → app is live on Play Store.

---

## What I need from you to start

1. **Screenshots source** — re-capture 6 fresh screens from `myripple.co.in` (recommended, matches the runbook), or reuse the 4 iPhone simulator PNGs you already uploaded and strip the iPhone chrome?
2. **Tagline preference** — "For the little moments of everyday life" (splash) or "Everyday things worth sharing" (store) for the headers?

Once you confirm those two, I'll generate everything in one pass, QA each file, and drop them in `/mnt/documents/play-store/` ready to upload.
