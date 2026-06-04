# Rebuilding the AAB on Windows — step by step

Same outcome as before (new AAB with Ripple icon + perf fixes uploaded to the same closed test track), but with Windows-specific commands. You already have your `.jks` keystore and previous `.aab` locally, so you're in good shape.

Use **PowerShell** (not Command Prompt) for everything below. Open it as your normal user, no Admin needed.

---

## Step 0 — Sanity check (one minute)

In PowerShell, run:

```powershell
node -v
java -version
```

- `node` should be 18 or newer
- `java` should be 17.something

If `java -version` shows a different version, you have Java 17 installed but not selected. Find it at `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot` (or similar) and set:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
java -version
```

(Replace the version number with whatever's actually in `C:\Program Files\Eclipse Adoptium\`.)

---

## Step 1 — Navigate to your project + pull latest code

```powershell
cd C:\path\to\your\ripple-project
git pull
npm install
```

Replace `C:\path\to\your\ripple-project` with wherever you cloned it (probably `C:\Users\YourName\Documents\...` or similar — wherever your existing `android` folder lives).

This pulls down today's perf fixes and the icon-generation docs.

---

## Step 2 — Bump the version code

**The #1 reason Play Console rejects re-uploads.** Open this file in Notepad or VS Code:

```
android\app\build.gradle
```

Find the `defaultConfig` block near the top. You'll see:

```gradle
versionCode 1
versionName "1.0"
```

Change to:

```gradle
versionCode 2
versionName "1.0.1"
```

Save and close.

---

## Step 3 — Build the web bundle

```powershell
npm run build
```

Takes ~30 seconds. Produces a fresh `dist\` folder.

---

## Step 4 — Regenerate the Ripple icon + splash (THE actual icon fix)

```powershell
npm install -D @capacitor/assets
npx capacitor-assets generate --android --iconBackgroundColor "#ffffff" --splashBackgroundColor "#ffffff"
```

Wait for `✔ Generating Android Icons` and `✔ Generating Android Splashes`.

Verify:

```powershell
dir android\app\src\main\res\mipmap-xxxhdpi\
```

You should see `ic_launcher.png`, `ic_launcher_foreground.png`, `ic_launcher_round.png`. If they're there, the icon is fixed in the source — now we just need to bake it into the AAB.

---

## Step 5 — Sync web bundle into the Android project

```powershell
npx cap sync android
```

This copies `dist\` into the native Android project. Takes ~10 seconds.

---

## Step 6 — Build the signed release AAB

The keystore signing is the tricky part on Windows. Two possibilities — check which one you're in:

### Path A — Your keystore is already wired into `build.gradle` (most likely if your first build worked from the command line)

Just run:

```powershell
cd android
.\gradlew.bat bundleRelease
```

If it prompts for the keystore password, type it. If it builds without prompting, your `gradle.properties` already has the password — even better.

### Path B — You signed via Android Studio's "Generate Signed Bundle" wizard last time

Then easier to do it the same way again:

1. Open **Android Studio**
2. **File → Open** → select the `android` folder inside your project
3. Wait for Gradle sync (~1–2 minutes)
4. Top menu → **Build → Generate Signed App Bundle / APK**
5. Choose **Android App Bundle** → Next
6. Browse to your `.jks` file → enter keystore password, key alias, key password → Next
7. Select **release** → choose destination folder → Finish
8. Wait for the green "locate" notification at the bottom right

Either path produces:

```
android\app\build\outputs\bundle\release\app-release.aab
```

---

## Step 7 — Upload to Play Console

1. Go to **Play Console → Ripple → Testing → Closed testing → [your track] → Manage track**
2. Click **Create new release**
3. Under **App bundles** → **Upload** → select your new `app-release.aab`
4. Wait for it to process (~30 seconds). It should say `Version 2 (1.0.1)`.
5. **Release notes** — paste:

```
<en-US>
- New Ripple app icon
- Faster feed loading
- Smaller image downloads
- Bug fixes
</en-US>
```

6. **Next** → **Save** → **Review release** → **Start rollout to Closed testing**
7. Confirm.

Live for testers within minutes to a couple of hours. **The 14-day clock does NOT reset.**

---

## Step 8 — Notify your testers (WhatsApp copy-paste)

> Hey! New Ripple update is out — open Play Store, find Ripple, tap Update (or wait for overnight auto-update). You'll see the proper Ripple icon on your home screen and the app should feel noticeably faster. Keep using it normally — thanks again! 🙌

---

## Common Windows-specific gotchas

| Problem | Fix |
|---|---|
| `'npx' is not recognized` | You're in CMD instead of PowerShell, or Node isn't on PATH. Open PowerShell fresh. |
| `gradlew is not recognized` | You're missing the `.\` prefix. On Windows use `.\gradlew.bat bundleRelease`, not `./gradlew`. |
| `Could not find tools.jar` / Java version error | JAVA_HOME points to a JRE, not JDK. Install Eclipse Temurin JDK 17. |
| Gradle hangs at "Resolving dependencies" forever | Corporate Wi-Fi/VPN blocking Maven. Switch to mobile hotspot. |
| Play Console: "version code 1 already used" | You skipped Step 2. Bump versionCode and rebuild. |

---

## When to come back to me

- ❌ Step 6 fails with a signing error → paste the full error
- ❌ Step 4 doesn't produce mipmap files → reply and I'll investigate `resources\icon.png`
- ❌ Play Console upload is rejected → paste the rejection message
- ✅ Upload succeeded → reply "done" and I'll send day-7 and day-14 reminder copy

Ready when you are.
