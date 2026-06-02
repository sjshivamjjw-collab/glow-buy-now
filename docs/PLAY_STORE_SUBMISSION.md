# Ripple — Google Play Store Submission Runbook

End-to-end guide to ship Ripple to the Google Play Store as an **Individual** developer.

Companion docs:
- `docs/APP_STORE_SUBMISSION.md` — iOS runbook
- `docs/PLAY_STORE_DATA_SAFETY.md` — Data Safety form, permissions, content rating answers
- `docs/store-listing-description.txt` — store copy (shared with iOS)

---

## 0. One-time prerequisites

- **Google Play Console** account (Individual, **$25 one-time**) → https://play.google.com/console/signup
- **Android Studio Hedgehog (2023.1)+** with **Android SDK 34** → https://developer.android.com/studio
- **JDK 17** (bundled with recent Android Studio)
- This repo cloned locally and `npm install` run

**Application ID (permanent):** `in.myripple.app`
**App Name:** Ripple
**Primary category:** Social · Tags: Lifestyle, Communication
**Target audience:** 18+
**Content rating:** Mature 17+ (UGC + user-to-user interaction)

---

## 1. First-time Android project setup (run once)

```bash
git pull
npm install
npm run build

# Add the native Android project (creates /android folder — commit it)
npx cap add android

# Generate icon + splash assets for every required Android density
npm i -D @capacitor/assets
npx capacitor-assets generate --android \
  --iconBackgroundColor '#ffffff' \
  --splashBackgroundColor '#ffffff'

# Sync the web build into the Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

In **Android Studio** after it opens, wait for Gradle sync to finish.

---

## 2. `android/app/build.gradle` — verify these values

```gradle
android {
    namespace "in.myripple.app"
    compileSdk 34

    defaultConfig {
        applicationId "in.myripple.app"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1          // bump for every release upload
        versionName "1.0.0"    // user-facing version
    }
}
```

`versionCode` MUST increase by **at least 1** for every AAB you upload. `versionName` is the user-visible string.

---

## 3. `android/app/src/main/AndroidManifest.xml` — required permissions

Add these inside `<manifest>` (above `<application>`). Must match `docs/PLAY_STORE_DATA_SAFETY.md` exactly:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Photo & video picker (Android 13+) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />

<!-- Legacy media access (Android 12 and below only) -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />

<!-- Push notifications (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.microphone" android:required="false" />
```

Do **NOT** add: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `READ_CONTACTS`, `READ_SMS`, `MANAGE_EXTERNAL_STORAGE`, `QUERY_ALL_PACKAGES`, `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE*`. Each extra permission triggers a Play Console declaration form.

---

## 4. Generate a release signing keystore (one-time)

**Critical:** lose this file and you lose the ability to publish updates forever. Back it up to a password manager **and** an offline drive.

```bash
keytool -genkey -v \
  -keystore ~/keys/ripple-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias ripple
```

You'll be prompted for:
- Keystore password (save it)
- Key password (use the same one)
- Your name / org / city / state / country

Create `android/key.properties` (gitignored — already covered by `android/.gitignore`):

```properties
storeFile=/Users/<you>/keys/ripple-release.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=ripple
keyPassword=YOUR_KEY_PASSWORD
```

Wire it into `android/app/build.gradle` (top of the file, above `android {`):

```gradle
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Inside `android { ... }`:

```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

---

## 5. Production build (every release)

```bash
# 1. Confirm capacitor.config.ts has server.url COMMENTED OUT
grep -A2 "server:" capacitor.config.ts

# 2. Bump versionCode (+1) and versionName in android/app/build.gradle

# 3. Build web assets and sync
npm run build
npx cap sync android

# 4. Open Android Studio
npx cap open android
```

In **Android Studio**:

1. Menu: **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle** → Next
3. Confirm the keystore (auto-filled from `key.properties`) → Next
4. Build variant: **release** → Finish
5. Output: `android/app/release/app-release.aab` (~10-30 MB)

---

## 6. Play Console — create the listing

Go to https://play.google.com/console → **Create app**.

| Field | Value |
|---|---|
| App name | Ripple |
| Default language | English (India) – en-IN |
| App or game | App |
| Free or paid | Free |
| Declarations | Tick both Play Policies and US export laws |

### Set up your app (left sidebar checklist)

| Section | What to fill |
|---|---|
| **App access** | "All functionality available without restrictions" + add reviewer credentials (see §9) |
| **Ads** | No, my app doesn't contain ads |
| **Content rating** | Run the IARC questionnaire using answers in `docs/PLAY_STORE_DATA_SAFETY.md` → results in **Mature 17+** |
| **Target audience** | 18 and over · Not appealing to children |
| **News app** | No |
| **COVID-19 contact tracing** | No |
| **Data safety** | Fill exactly per `docs/PLAY_STORE_DATA_SAFETY.md` |
| **Government app** | No |
| **Financial features** | None |
| **Health** | Not health-related |
| **Store settings** | Category: **Social** · Tags: Lifestyle, Communication |

### Store listing copy

- **App name (30):** `Ripple`
- **Short description (80):** `Everyday things worth sharing. Real moments from real people.`
- **Full description (4000):** paste the LONG DESCRIPTION from `docs/store-listing-description.txt`
- **App icon:** `resources/icon.png` (Play also accepts the auto-generated `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`)
- **Feature graphic:** 1024×500 PNG/JPG (create one with Ripple wordmark on white)
- **Phone screenshots:** **minimum 2, recommended 8.** 1080×1920 portrait. Same screens as iOS (home feed, profile, community room, post detail, onboarding).
- **7-inch tablet** + **10-inch tablet** screenshots: optional. Skip unless you also support tablets.

### Contact details

- Email: `shivam@ripple-shop.com`
- Website: `https://myripple.co.in`
- Privacy Policy: `https://myripple.co.in/privacy`

---

## 7. Release tracks

Play Console has 4 tracks. **Use them in order:**

1. **Internal testing** — up to 100 testers, ready in minutes. Use this first to verify the AAB installs and OTP login works.
2. **Closed testing** — invite-only beta. Required if you want pre-launch insights or to gather review-quality feedback.
3. **Open testing** — public beta with a one-tap join URL. Optional.
4. **Production** — public listing. Reviewed in **1–7 days for first release**, ~24h after that.

**For first launch:**
1. Internal testing → upload AAB → add yourself + 2 friends → confirm install works
2. Promote release to **Production** → fill "What's new in this release" → **Send for review**

---

## 8. OTA updates (Capgo)

Ripple ships with **Capgo Live Updates** (`@capgo/capacitor-updater`). After the first approved release, JS/React/CSS changes ship to installed Android apps automatically — **no Play resubmission, no review wait**. Same channel covers iOS and Android (one bundle, two platforms).

See `docs/APP_STORE_SUBMISSION.md` §9 for the full Capgo workflow. Rule of thumb: native plugin / permission change → rebuild AAB and resubmit. Anything else → OTA.

---

## 9. App Review Information (reviewer test account)

Paste this into **Play Console → App content → App access** when prompted for login credentials:

```
Sign-in method: Phone OTP
Demo phone number: +91 9999966666
OTP (one-time code): 123456

Notes for reviewer:
- The demo phone bypasses SMS so no real device or SIM is required.
- After entering the phone, tap "Continue", then enter 123456 on the OTP screen.
- The account is pre-seeded so the feed shows real content immediately.
- Google sign-in and Apple sign-in are also available on the auth screen.

Support contact: shivam@ripple-shop.com
```

Mirror the same block in App Store Connect → **App Information → App Review Information** for iOS reviews.

---

## 10. Compliance checklist (verify before hitting Submit)

- [ ] `capacitor.config.ts` — `server.url` block is commented out
- [ ] AndroidManifest permissions match §3 exactly (no extras)
- [ ] `versionCode` is +1 from the last uploaded build
- [ ] Account deletion works in-app (Settings → Delete my account data) ✅
- [ ] In-app account deletion mirrored at https://myripple.co.in/delete-account ✅
- [ ] Privacy Policy URL loads in incognito (https://myripple.co.in/privacy) ✅
- [ ] Report button on every post / comment / profile ✅
- [ ] Block button on every profile ✅
- [ ] No placeholder/lorem text anywhere in the release build
- [ ] App icon renders crisply on the launcher (no white box around a transparent logo)
- [ ] Tested OTP login on a real Android device with a production Twilio number

---

## 11. After approval

- Play rollout is staged automatically (20% → 100% over a few days). Bump it to 100% from the Production track once you've watched crash-free rate for a day.
- For subsequent updates: bump `versionCode` and `versionName`, build signed AAB, upload to Production, fill "What's new", submit. Most updates ship in <24h.
