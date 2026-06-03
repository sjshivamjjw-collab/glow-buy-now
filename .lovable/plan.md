# Ship Ripple to Google Play Store

You're logged into Play Console with a Personal developer account — great. Here's the end-to-end path. The full technical runbook lives in `docs/PLAY_STORE_SUBMISSION.md`; this plan is the condensed checklist with what you do vs what I do.

## Phase 1 — Click "Create app" in Play Console (you, 2 min)

Fill the form with:
- **App name:** Ripple
- **Default language:** English (India) – en-IN
- **App or game:** App
- **Free or paid:** Free
- Tick both declaration boxes (Play Policies + US export laws)
- Click **Create app**

## Phase 2 — Build the signed Android App Bundle (you, on your Mac, ~20 min)

This must be done locally — Play needs a signed `.aab` file. Steps you'll run (full details in `docs/PLAY_STORE_SUBMISSION.md` §1–§5):

1. `git pull && npm install && npm run build`
2. `npx cap add android` (first time only — creates `/android` folder)
3. Generate signing keystore with `keytool` (one-time; back up the `.jks` file forever — losing it means you can never update the app)
4. Wire `key.properties` into `android/app/build.gradle`
5. Verify `AndroidManifest.xml` permissions match the runbook (no extras → fewer Play declarations)
6. `npm run build && npx cap sync android && npx cap open android`
7. Android Studio → **Build → Generate Signed Bundle / APK** → outputs `app-release.aab`

I can't run any of this for you — needs your Mac, Android Studio, and your private keystore.

## Phase 3 — Fill out the Play Console listing (you, ~45 min)

Left sidebar "Set up your app" checklist. Copy/paste from existing repo docs:

| Section | Source |
|---|---|
| App access (reviewer creds) | `docs/PLAY_STORE_SUBMISSION.md` §9 — phone `+91 9999966666`, OTP `123456` |
| Ads | No |
| Content rating | Run IARC questionnaire with answers in `docs/PLAY_STORE_DATA_SAFETY.md` → Mature 17+ |
| Target audience | 18+ only |
| Data safety | Exact answers in `docs/PLAY_STORE_DATA_SAFETY.md` |
| Store listing copy | `docs/store-listing-description.txt` |
| Category | Social |
| Privacy Policy URL | `https://myripple.co.in/privacy` |

## Phase 4 — Assets I can generate for you (me, when you ask)

- **Feature graphic** (1024×500 PNG with Ripple wordmark) — required
- **Android phone screenshots** (1080×1920) — I can convert the iPhone screenshots you already shared, same way I did for iPad
- **Short description** (80 chars) — already written in the runbook

Just say "generate the Play assets" after Phase 2 and I'll prep them.

## Phase 5 — Upload + submit (you, 15 min)

1. Production track → Create new release → upload `app-release.aab`
2. Fill "What's new in this release"
3. **Recommended:** First push to **Internal testing** track, install on your phone via the test link, confirm OTP login works
4. Promote to Production → **Send for review**

First Play review: **1–7 days** (usually 2–3). Subsequent updates ship in <24h.

## What you need to confirm before we proceed

1. **Do you have a Mac with Android Studio installed?** (Required for Phase 2. If not, you'll need to install it from https://developer.android.com/studio — ~8 GB download.)
2. **Do you want me to generate the Play Store assets** (feature graphic + Android screenshots from your existing iPhone shots) now, in parallel with you doing Phase 1?
3. **Internal testing first, or straight to Production?** Recommend internal testing — catches install/signing bugs before review.

Once you answer those, I'll either generate assets immediately or wait for your Phase 2 build to complete.
