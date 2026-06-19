## Goal

Ship a fresh Play Store release (Production track) that includes every change made since the last upload, and make sure installed devices show the **Ripple** icon (red square with R) — not the generic Android robot.

Windows is fine for Android — Mac is only needed for iOS. The `/android/` folder is generated locally (not in this repo), so this is a **runbook you run on your Windows laptop**, not a Lovable code change. The generic-icon issue happens when the AAB was built before `capacitor-assets generate` populated `android/app/src/main/res/mipmap-*/`.

---

## Steps to run on your Windows laptop (PowerShell or Git Bash)

```bash
# 1. Pull latest Lovable changes
git pull
npm install
npm run build

# 2. Confirm capacitor.config.ts has server.url commented out (already verified in repo)
#    PowerShell:
Select-String -Path capacitor.config.ts -Pattern "server:" -Context 0,2
#    Git Bash:
grep -A2 "server:" capacitor.config.ts

# 3. Regenerate Android icons + splash from resources/icon.png
#    THIS step fixes the generic-robot icon
npm i -D @capacitor/assets
npx capacitor-assets generate --android --iconBackgroundColor "#ffffff" --splashBackgroundColor "#ffffff"

# 4. Sync the new web bundle + icons into the Android project
npx cap sync android
```

### 5. Bump version in `android/app/build.gradle`

Open `android\app\build.gradle` and increase **both**:

```gradle
versionCode 2          // was 1 — must be +1 from last upload (use whatever +1 is from your last)
versionName "1.0.1"    // user-visible version
```

Play Console rejects any AAB whose `versionCode` is not strictly higher than the previously uploaded one.

### 6. Build the signed AAB

```bash
cd android
gradlew.bat bundleRelease
```

Output: `android\app\build\outputs\bundle\release\app-release.aab`

(Uses the keystore + `android\key.properties` you set up for the first release. If Windows can't find Java, install JDK 17 from https://adoptium.net and set `JAVA_HOME`.)

### 7. Verify the icon BEFORE uploading

Open this file in Explorer and confirm it's the red Ripple "R":
`android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png`

If it's blank / robot / wrong → re-run step 3, then step 4, then step 6.

### 8. Upload to Play Console

1. Play Console → Ripple → **Production → Create new release**
2. Upload `app-release.aab`
3. **Release name**: `1.0.1`
4. **Release notes** (What's new) — suggested copy:
   ```
   • Topic-based discovery: Vietnam, Weekend Getaway, Europe pills
   • Cross-device draft sync — start a post on web, finish on mobile
   • Anonymous web browsing for guests
   • Community channels with tier-based access
   • Bug fixes and performance improvements
   ```
5. Save → **Review release** → **Start rollout to Production**
6. Since your 14-day / 12-tester closed test is complete, on the dashboard click **Apply for production** if it's still showing, then submit the release for review. First production review usually takes 1–7 days.

---

## Why the generic icon happened last time

Capacitor doesn't auto-copy `resources/icon.png` into the Android mipmap folders. `@capacitor/assets generate --android` is what writes the real PNGs into `android/app/src/main/res/mipmap-*/`. If `cap sync` runs before that step, the AAB ships with the default Android launcher icon. Step 3 above is the fix and must run before every release where icons could be stale.

---

## Lovable-side changes

None required — the codebase already has everything needed (correct `resources/icon.png`, `capacitor.config.ts` with `server.url` commented, Capgo OTA wired). 

Optional helper I can add: an `npm run release:android` script that chains steps 1, 3, 4 so future releases are one command (you'd still bump version + run `gradlew bundleRelease` manually). Want me to add it?
