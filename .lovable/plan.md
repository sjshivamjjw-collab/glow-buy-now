
# Ripple → Play Store: The One Clean Plan

You already have: ✅ Node, ✅ Git, ✅ Android Studio, ✅ GitHub connected, ✅ Play Console paid (verifying).

Below is the **only** sequence you need. Do steps in order. Don't skip. Each step has ONE goal.

---

## STEP 1 — Get the code on your PC (5 min)

Open **PowerShell** (Start menu → type "PowerShell" → Enter), then run, one line at a time:

```
cd $HOME\Documents
git clone https://github.com/sjshivamjjw-collab/glow-buy-now.git
cd glow-buy-now
npm install
```

✅ Done when: `npm install` finishes without red errors.

---

## STEP 2 — Build the web app + add Android (5 min)

In the same PowerShell window (still inside `glow-buy-now`):

```
npm run build
npx cap add android
npx cap sync android
```

✅ Done when: you see a new `android` folder appear inside `glow-buy-now`.

---

## STEP 3 — Create your signing key (5 min) ⚠️ CRITICAL

This file is what proves YOU own the app. **If you lose it, you can never update Ripple again.**

```
mkdir $HOME\keys
keytool -genkey -v -keystore $HOME\keys\ripple-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias ripple
```

It will ask questions. Answer:
- **Keystore password** → make one up, write it down NOW in a safe place
- **Re-enter password** → same one
- **First and last name** → `Shivam Jhunjhunwala`
- All other fields → just press Enter
- **Country code** → `IN`
- **Is this correct?** → type `yes`
- **Key password** → just press Enter (uses same password)

✅ Done when: file exists at `C:\Users\<your-name>\keys\ripple-release.jks`.

**BACKUP NOW:** copy that `.jks` file + the password to Google Drive AND a USB stick. Do not skip.

---

## STEP 4 — Tell Android about your key (5 min)

Open **Notepad**, paste this (replace `<YOUR-WINDOWS-USERNAME>` and `YOUR_PASSWORD`):

```
storeFile=C:\\Users\\<YOUR-WINDOWS-USERNAME>\\keys\\ripple-release.jks
storePassword=YOUR_PASSWORD
keyAlias=ripple
keyPassword=YOUR_PASSWORD
```

Save as: `key.properties` inside the `glow-buy-now\android\` folder.
(In Notepad's Save dialog: File type → "All Files", filename → `key.properties`.)

Then I will give you the exact 15 lines to paste into `android\app\build.gradle` — **just tell me when you've reached this point** and I'll walk you through that file edit live (it's the only fiddly part).

---

## STEP 5 — Build the .aab file in Android Studio (15 min)

Back in PowerShell:

```
npx cap open android
```

Android Studio opens. Wait for "Gradle sync" at the bottom to finish (5–10 min first time, lots of progress bars — normal).

Then in Android Studio's top menu:
1. **Build → Generate Signed App Bundle / APK**
2. Choose **Android App Bundle** → Next
3. Keystore fields auto-fill → Next
4. Pick **release** → Finish
5. Wait 2 min → popup says "locate" → click it
6. Your file: `android\app\release\app-release.aab` ← **this is what you upload to Google**

---

## STEP 6 — Upload to Play Console (30 min)

Once Google verifies your account (email arrives 24–48h after paying):

1. Go to https://play.google.com/console → **Create app** → name it `Ripple`
2. Left sidebar → **Testing → Internal testing → Create new release**
3. Drag in your `app-release.aab` → release name `1.0.0` → notes: `Initial release.`
4. Add yourself as a tester → install on your phone via the opt-in link → confirm it works
5. Then: **Production → Create new release** → upload same `.aab` → fill the store listing forms

The store listing forms (screenshots, descriptions, data safety) — I'll walk you through those one by one when you get there. All the answers are pre-written in `docs/PLAY_STORE_SUBMISSION.md` and `docs/PLAY_STORE_DATA_SAFETY.md` in your repo.

---

## What to do right now

👉 **Start with STEP 1.** Run those 4 lines. Tell me when `npm install` finishes (or paste any red error you see), and we move to Step 2.

Don't try to do all 6 steps at once. One at a time. I'm here for each.
