# Rebuilding the AAB with the Ripple icon + perf fixes

You'll do this on your **Mac** in your local copy of the project. Total time: ~20 minutes (most of it is Gradle building in the background). You'll end up uploading a new `.aab` to the **same closed test track** — the 14-day clock keeps running, no reset.

---

## Step 0 — One-time check before you start

Make sure these are installed on your Mac:
- Android Studio (any recent version, comes with the SDK)
- Java 17 (`java -version` should show 17)
- Node + npm (`node -v` — anything 18+)

You should already have all three from your first build. If `java -version` shows something other than 17, set:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

---

## Step 1 — Pull the latest code from Lovable

In your terminal, in the project folder on your Mac:

```bash
git pull
npm install
```

This pulls down the perf fixes (image resizing, signed-URL cache, video preload changes) and the icon-generation script changes I shipped today.

---

## Step 2 — Bump the version code

**This is the step everyone forgets and Play Console rejects you for.** Every upload needs a unique `versionCode`.

Open `android/app/build.gradle` in any text editor. Find these two lines (around line 10):

```gradle
versionCode 1
versionName "1.0"
```

Change to:

```gradle
versionCode 2
versionName "1.0.1"
```

(`versionCode` MUST go up by at least 1. `versionName` is the human-readable string testers see — bumping it to 1.0.1 is conventional for a bug-fix release.)

Save the file.

---

## Step 3 — Build the web bundle

```bash
npm run build
```

This produces a fresh `dist/` folder with all the perf fixes baked in.

---

## Step 4 — Regenerate the Ripple icon + splash

This is the actual fix for the generic blue icon:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --android \
  --iconBackgroundColor '#ffffff' \
  --splashBackgroundColor '#ffffff'
```

You should see output like:
```
✔ Generating Android Icons
✔ Generating Android Splashes
```

This writes files into `android/app/src/main/res/mipmap-*` and `drawable-*` folders. **Verify** with:

```bash
ls android/app/src/main/res/mipmap-xxxhdpi/
```

You should see `ic_launcher.png`, `ic_launcher_foreground.png`, `ic_launcher_round.png`. If those exist, the icon is fixed.

---

## Step 5 — Sync the web bundle into the Android project

```bash
npx cap sync android
```

This copies `dist/` into `android/app/src/main/assets/public/` so the native app ships with the latest JS/CSS.

---

## Step 6 — Build the release AAB

```bash
cd android
./gradlew bundleRelease
```

First build can take 5–10 minutes. Subsequent builds are faster. The output you want is at:

```
android/app/build/outputs/bundle/release/app-release.aab
```

If Gradle fails with a signing error, it means your keystore isn't configured for release builds. You'd have set this up the first time — if you've lost the config, reply and I'll walk you through it separately.

---

## Step 7 — Upload to Play Console

1. Go to **Play Console → Ripple → Testing → Closed testing → [your track name] → Manage track**
2. Click **Create new release**
3. Under **App bundles**, click **Upload** and select your `app-release.aab` from step 6
4. **Release name** auto-fills as `2 (1.0.1)` — leave it
5. **Release notes** — paste something like:

```
<en-US>
- New Ripple app icon
- Faster feed loading on slower networks
- Smaller image downloads
- Bug fixes
</en-US>
```

6. Click **Next** → **Save** → **Review release** → **Start rollout to Closed testing**
7. Confirm.

That's it. No re-review needed for closed test updates — it goes live to your testers within a few minutes to a couple of hours.

---

## Step 8 — Tell your testers

WhatsApp message you can paste:

> Hey! New update of Ripple just dropped — please open Play Store, find Ripple, and tap Update (or wait for auto-update overnight). You should now see the proper Ripple icon on your home screen and the app will feel noticeably faster. Keep using it normally, thanks for testing! 🙌

---

## What this does NOT affect

- ✅ Your 14-day clock keeps running — does not reset
- ✅ Your existing 12 testers stay opted in
- ✅ Your store listing, screenshots, content rating — all unchanged
- ✅ Production access application — still on track for whenever the 14 days complete

---

## When to come back to me

- ❌ Gradle fails on step 6 with a **signing/keystore error** → reply with the full error
- ❌ Play Console rejects upload with **"version code already used"** → you forgot step 2, just bump versionCode again
- ❌ Testers report the icon is **still generic** after updating → reply and we'll dig in (rare — usually a launcher cache issue, solved by uninstall + reinstall)
- ✅ Everything worked → reply "done" and I'll send the day-7 + day-14 reminder messages

Ready when you are.
