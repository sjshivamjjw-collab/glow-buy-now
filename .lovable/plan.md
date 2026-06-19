## You're in the right folder ✅

The screenshot confirms:
- `C:\Users\Home\Documents\glow-buy-now` is your project root
- `android\` folder exists with `gradlew.bat`, `key.properties`, `app\` (everything needed to build)
- `resources\icon.png` exists (837 KB — the Ripple logo source)

(`package.json` and `capacitor.config.ts` probably scrolled off the top of the screenshot — they're there.)

You can proceed straight to Step 2.

---

## Step 2 — Pull latest code, install, build

```powershell
git pull
npm install
npm run build
```

Wait for each. `npm install` = 2–5 min. `npm run build` ends with `✓ built in ...`.

---

## Step 3 — Confirm release-safe config

```powershell
Select-String -Path capacitor.config.ts -Pattern "url:" -Context 1,1
```

The `url:` line MUST start with `//`. If yes → continue. If no → stop and tell me.

---

## Step 4 — Regenerate the Ripple icon (THE fix)

```powershell
npm i -D @capacitor/assets
npx capacitor-assets generate --android --iconBackgroundColor "#ffffff" --splashBackgroundColor "#ffffff"
```

Look for `✔ Generated ic_launcher.png` lines for mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi.

---

## Step 5 — Sync into Android project

```powershell
npx cap sync android
```

Ends with `✔ Sync finished`.

---

## Step 6 — Visually verify the icon BEFORE building

```powershell
ii android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png
```

Opens the PNG in Photos. **Must be the red square with white R.** If not → re-run Steps 4 and 5.

---

## Step 7 — Bump version

```powershell
notepad android\app\build.gradle
```

Find and change:
```
versionCode 1       →   versionCode 2
versionName "1.0.0" →   versionName "1.0.1"
```
Save, close.

*(If `versionCode` is already 2 or higher from last upload, bump it by +1 from whatever it currently is.)*

---

## Step 8 — Build the signed AAB

```powershell
cd android
.\gradlew.bat bundleRelease
cd ..
```

3–10 min. Ends with `BUILD SUCCESSFUL`. Verify:

```powershell
ls android\app\build\outputs\bundle\release\app-release.aab
```

---

## Step 9 — Upload to Play Console

1. https://play.google.com/console → Ripple → **Production → Create new release**
2. Upload `app-release.aab`
3. Release name: `1.0.1`
4. Release notes:
   ```
   • Topic-based discovery: Vietnam, Weekend Getaway, Europe
   • Cross-device draft sync
   • Anonymous web browsing for guests
   • Community channels with tier-based access
   • Bug fixes and performance improvements
   ```
5. **Next → Save → Review release → Start rollout to Production → Send for review**

Review = 1–7 days.

---

Run Step 2 and paste any errors. I'll unblock you each step.