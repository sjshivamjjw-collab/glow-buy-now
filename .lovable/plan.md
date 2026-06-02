# Ripple → Google Play Store (first-time submission)

You're starting from zero. Total wall-clock time: **~3 days** (most of it Google verification + Google's review, your actual hands-on time is ~5 hours spread across 2 days).

Developer name: **Shivam Jhunjhunwala** · Support email: **shivam@ripple-shop.com**

---

## DAY 1 — Start the slow things in parallel (1 hour of your time)

### Step 1. Create Play Console account (start this FIRST, it takes 24–48h to verify)

1. Go to https://play.google.com/console/signup
2. Sign in with the Google account you want to own Ripple forever (use a personal Gmail you control — not a work one you might lose access to).
3. Pick **Individual developer**.
4. Pay **$25 one-time** with any card.
5. Fill the identity form:
   - Developer name: **Shivam Jhunjhunwala**
   - Contact: your phone + `shivam@ripple-shop.com`
   - Upload government ID (PAN or passport works)
6. Submit. Google emails you when verified (usually 24h, sometimes 48h). **Do not wait — continue to Step 2.**

### Step 2. Install tools on your Windows laptop

Download and install, in this order:
1. **Git for Windows** → https://git-scm.com/download/win — accept all defaults.
2. **Node.js LTS** (v20) → https://nodejs.org — accept all defaults.
3. **Android Studio** → https://developer.android.com/studio — ~4 GB. On first launch, click through the setup wizard and let it install **Android SDK 34** + **JDK 17** (both bundled, just click Next).

### Step 3. Get Ripple's code on your laptop

1. In Lovable (top right): **GitHub → Connect to GitHub → Create repository**. Name it `ripple`.
2. On your laptop, open **PowerShell** and run:
   ```powershell
   cd $HOME\Documents
   git clone https://github.com/<your-username>/ripple.git
   cd ripple
   npm install
   ```

✅ End of Day 1. Wait for the Play Console verification email.

---

## DAY 2 — Build the Android app (2 hours)

### Step 4. Add the native Android project (one-time)

In PowerShell, from the `ripple` folder:

```powershell
npm run build
npx cap add android
npm install -D @capacitor/assets
npx capacitor-assets generate --android --iconBackgroundColor "#ffffff" --splashBackgroundColor "#ffffff"
npx cap sync android
```

This creates an `android\` folder. Commit it: `git add android && git commit -m "Add Android project"`.

### Step 5. Create your release signing key (CRITICAL — back it up)

⚠️ **If you lose this `.jks` file, you can NEVER update Ripple again.** You'd have to delete the app and publish a brand new one with no users.

```powershell
mkdir $HOME\keys
keytool -genkey -v -keystore $HOME\keys\ripple-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias ripple
```

It asks for:
- Keystore password → make a strong one, **save it in a password manager**
- Key password → use the same as keystore password
- Name → `Shivam Jhunjhunwala`
- Org unit → leave blank (press Enter)
- Org → `Ripple`
- City → your city
- State → your state
- Country code → `IN`
- Confirm `yes`

**Back up `ripple-release.jks` to:**
1. Google Drive (private folder)
2. A USB stick locked in a drawer
3. Save the passwords in your password manager

### Step 6. Wire the key into the build

Create file `android\key.properties` (Notepad is fine):
```
storeFile=C:\\Users\\<YOUR_WINDOWS_USERNAME>\\keys\\ripple-release.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=ripple
keyPassword=YOUR_KEY_PASSWORD
```

Then edit `android\app\build.gradle` per `docs/PLAY_STORE_SUBMISSION.md` §4 (the exact 15 lines to paste are in that doc — copy them verbatim into the file).

### Step 7. Build the release `.aab`

```powershell
npx cap open android
```

Android Studio opens. Wait for "Gradle sync" to finish (bottom status bar — 5–10 min first time).

Then in Android Studio's menu bar:
1. **Build → Generate Signed Bundle / APK**
2. Pick **Android App Bundle** → Next
3. Keystore fields should auto-fill from `key.properties` → Next
4. Build variant: **release** → Finish
5. Wait ~2 min. You'll see "locate" / "analyze" notification — click **locate**.
6. The file is at `android\app\release\app-release.aab`. **This is what you upload to Google.**

### Step 8. Test the build before submitting

1. Enable **Developer Options** on your Android phone (Settings → About phone → tap "Build number" 7 times).
2. Enable **USB debugging** in Developer Options.
3. Plug phone into laptop, open Android Studio, click the green ▶ Run button. Ripple installs on your phone.
4. Test: phone login with `+91 9999966666` / OTP `123456`, browse feed, create a test post, check delete account works.

If everything works → proceed to Day 3. If anything breaks → tell me what broke and I'll fix it.

---

## DAY 3 — Submit to Play Store (1.5 hours)

### Step 9. Create the app in Play Console

By now your account should be verified. Go to https://play.google.com/console → **Create app**.

| Field | Value |
|---|---|
| App name | `Ripple` |
| Default language | English (India) |
| App or game | App |
| Free or paid | Free |
| Declarations | Tick both boxes |

### Step 10. Capture screenshots (no phone needed)

Follow **`docs/PLAY_STORE_SCREENSHOTS.md`** word for word. You'll use Chrome DevTools on your laptop, log into `https://myripple.co.in` with `+91 9999966666` / `123456`, and capture 6 screens at 390×844. ~30 min.

### Step 11. Fill the Play Console checklist

In the left sidebar, work through every item top to bottom. The exact answer for every field is documented:

- **App access** → paste the reviewer block from `docs/PLAY_STORE_SUBMISSION.md` §9
- **Ads** → No
- **Content rating** → answer the questionnaire per `docs/PLAY_STORE_DATA_SAFETY.md` → result: Mature 17+
- **Target audience** → 18 and over
- **Data safety** → ⚠️ this is the form most apps get wrong. **Copy answers exactly from `docs/PLAY_STORE_DATA_SAFETY.md`** — every checkbox.
- **Government app** → No
- **Financial features** → None
- **Health** → Not health-related
- **News** → No
- **Store settings** → Category: Social
- **Main store listing**:
  - App name: `Ripple`
  - Short description: paste from `docs/store-listing-description.txt` (the SHORT block)
  - Full description: paste from `docs/store-listing-description.txt` (the LONG block)
  - App icon: upload `resources/icon.png`
  - Feature graphic: upload `resources/play-feature-graphic.png`
  - Phone screenshots: upload the 6 you made in Step 10
- **Contact details**:
  - Email: `shivam@ripple-shop.com`
  - Website: `https://myripple.co.in`
  - Privacy policy: `https://myripple.co.in/privacy`

### Step 12. Upload to Internal Testing first (safer than going straight to Production)

1. Left sidebar → **Testing → Internal testing → Create new release**
2. Drag in `app-release.aab`
3. Release name: `1.0.0`
4. Release notes (English): `Initial release of Ripple.`
5. **Save → Review release → Start rollout to Internal testing**
6. Go to the **Testers** tab → create an email list → add your own Gmail → save
7. Copy the **opt-in URL**, open it on your Android phone, tap "Become a tester", then install from the Play Store link
8. Confirm Ripple installs and login works on a real Play-Store-delivered build

### Step 13. Promote to Production

Once the internal test build works on your phone:
1. **Production → Create new release**
2. Drag in the **same** `app-release.aab` (or click "Add from library")
3. Release notes: `Initial release of Ripple.`
4. **Save → Review release → Start rollout to Production**
5. Google reviews in **1–7 days** (usually 2–3). You'll get an email.

---

## After approval

- Listing goes live within a few hours of approval.
- **Future updates to JS/UI** (most changes) → ship automatically via Capgo OTA in ~10 min, no Play resubmission.
- **Future native changes** (new permissions, new Capacitor plugin) → bump `versionCode` by 1 in `android\app\build.gradle`, rebuild AAB, upload to Production. Review takes <24h after first approval.

---

## What to do if Google rejects

Most common rejection reasons (and how to fix each):
1. **Data Safety form mismatch** — re-check `docs/PLAY_STORE_DATA_SAFETY.md` answers.
2. **Account deletion not visible** — already fixed (Profile → Delete Account button).
3. **Permissions you didn't justify** — `docs/PLAY_STORE_SUBMISSION.md` §3 lists exactly which permissions are allowed.

If rejected, paste the rejection email to me and I'll tell you the exact fix.

---

## Reference files in this repo

- `docs/PLAY_STORE_SUBMISSION.md` — full technical detail for every step above
- `docs/PLAY_STORE_DATA_SAFETY.md` — every Data Safety answer
- `docs/PLAY_STORE_SCREENSHOTS.md` — how to capture screenshots
- `docs/store-listing-description.txt` — copy/paste store text
- `resources/icon.png`, `resources/play-feature-graphic.png` — ready to upload

**Approve this plan** and I'll switch to build mode to make one small code change before you start: bump the Android-friendly app metadata + make sure `capacitor.config.ts` is locked for release. If you'd rather just start Day 1 now, reply "go" and skip the plan — nothing in code is blocking you.
