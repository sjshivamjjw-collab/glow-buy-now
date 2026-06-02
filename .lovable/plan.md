# Ripple → Apple App Store: The One Clean Plan

You have: ✅ Mac (friend's, ~5 days), ✅ iPhone, ✅ Paid Apple Developer account ($99 paid).
We don't yet know: Xcode installed? Apple ID signed in? Node installed? — we check each.

**Rule of the game: one step at a time.** Run the commands in a step. Tell me what you see (or paste the error). I unlock the next step. Don't leap ahead.

---

## STEP 0a — Check what's on the Mac (2 min)

Open the **Terminal** app on the Mac (press `Cmd + Space`, type "Terminal", Enter). Paste this whole block, then press Enter:

```
echo "--- macOS ---" && sw_vers
echo "--- Xcode ---" && xcodebuild -version 2>&1 | head -3
echo "--- Node ---" && node -v 2>&1
echo "--- npm ---" && npm -v 2>&1
echo "--- git ---" && git --version 2>&1
echo "--- CocoaPods ---" && pod --version 2>&1
```

✅ Done when: you copy the output and paste it back to me in chat. I'll tell you exactly what (if anything) you need to install before continuing.

---

## STEP 0b — Install what's missing (10 min to 60 min)

Based on Step 0a output, you'll do one or more of these. **I'll tell you which.** Don't run these blindly.

- **Xcode missing** → App Store on Mac → search "Xcode" → Get/Install. ~8 GB, 30–60 min. Then open it once, accept the license, let it install "additional components".
- **Node missing** → install Node 20 LTS from https://nodejs.org → close + reopen Terminal.
- **CocoaPods missing** → Terminal: `sudo gem install cocoapods` (asks for Mac password).
- **Git missing** → Terminal: `xcode-select --install` (small popup installer).

✅ Done when: re-run the Step 0a check block and everything reports a version.

---

## STEP 0c — Sign your Apple ID into the Mac + Xcode (5 min)

1. **macOS** → System Settings → Sign in with Apple ID (the one tied to your paid developer account).
2. **Xcode** → open it → top menu **Xcode → Settings → Accounts → click "+" → Apple ID** → sign in with the same account.
3. In that same Accounts screen, click your team on the right — confirm role says **Account Holder** (or **Admin**).

✅ Done when: your team name appears in Xcode → Settings → Accounts → right panel.

---

## STEP 1 — Get the code on the Mac (5 min)

In Terminal:
```
cd ~/Documents
git clone https://github.com/sjshivamjjw-collab/glow-buy-now.git
cd glow-buy-now
npm install
```

✅ Done when: `npm install` finishes without red errors. Tell me when done (or paste any error).

---

## STEP 2 — Build web + add iOS native project (5 min)

Still in the same Terminal, still inside `glow-buy-now`:
```
npm run build
npx cap add ios
npx cap sync ios
```

✅ Done when: a new `ios/` folder appears inside `glow-buy-now`.

---

## STEP 3 — Generate icons + drop in Privacy Manifest (3 min)

```
npm i -D @capacitor/assets
npx capacitor-assets generate --ios --iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff'
cp ios-privacy/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
```

✅ Done when: all three commands succeed. Tell me when done.

---

## STEP 4 — Open the project in Xcode + configure it (15 min, the fiddly bit)

```
npx cap open ios
```

Xcode opens. Wait for the bottom status bar to finish "Indexing…" (first time: 5–10 min).

Then we do **4 sub-steps inside Xcode**. I'll walk you through each click-by-click when you tell me Xcode is open and indexed:

- **4a.** Add `PrivacyInfo.xcprivacy` to the App target (drag from Finder into the sidebar).
- **4b.** Paste the 6 privacy strings into `Info.plist` (camera, mic, photos, etc. — I'll give you the exact text).
- **4c.** Signing & Capabilities → pick your Team → confirm Bundle ID `in.myripple.app` → "Automatically manage signing" ON.
- **4d.** General → Version `1.0.0`, Build `1`, Deployment Target iOS 14.0.

👉 **When Xcode is open and indexing is finished, tell me — we'll do 4a–4d live, one at a time.**

---

## STEP 5 — Test on your iPhone (15 min) ⚠️ DO NOT SKIP

Plug iPhone into Mac with a USB cable. On the iPhone, tap **Trust This Computer**.

In Xcode: top device selector (next to the play button) → pick **your iPhone** by name → press **▶ Run**.

First time only: on the iPhone go to **Settings → General → VPN & Device Management → tap your dev profile → Trust**. Then re-tap the app icon.

We then verify on a real device, before Apple ever sees it:
- [ ] App icon shows correctly on the home screen (no white box, no transparency)
- [ ] OTP login works with your real Indian phone number
- [ ] Camera + photo picker prompts appear with our text
- [ ] Can create a post, like, comment, follow
- [ ] Account deletion works (Profile → Settings → Delete account)
- [ ] `/terms` and `/privacy` both load

If anything's broken, we fix it here — way cheaper than an Apple rejection.

✅ Done when: you've ticked all 6 boxes above on your phone. Tell me when done.

---

## STEP 6 — Archive + upload to App Store Connect (20 min)

In Xcode top device selector → pick **Any iOS Device (arm64)** (NOT a simulator, NOT your iPhone).

Then top menu: **Product → Archive**. Takes 3–5 min. The **Organizer** window opens automatically.

In Organizer:
1. Click **Distribute App**
2. **App Store Connect** → Next
3. **Upload** → Next
4. Let Xcode manage signing → Next
5. **Upload**

Wait 15–20 min — you'll get an email from Apple ("Your build has finished processing") when it's ready in App Store Connect.

✅ Done when: that email arrives.

---

## STEP 7 — Create the App Store Connect listing (45 min)

Go to https://appstoreconnect.apple.com → **My Apps → +**. Pre-filled answers for every field live in `docs/APP_STORE_SUBMISSION.md` (sections 4 and 6). I'll walk you through it field-by-field when you reach this step.

Headlines:
- App name `Ripple`, Bundle ID `in.myripple.app`, SKU `ripple-ios-001`
- Long description + keywords → copy-paste from `docs/store-listing-description.txt`
- Age rating questionnaire → answers in `docs/APP_STORE_SUBMISSION.md` line ~165 (result = 17+)
- Privacy Nutrition Label → answers in `docs/APP_STORE_SUBMISSION.md` line ~178
- **App Review Information** → demo phone `+91 9999966666` + OTP `123456` (Apple's reviewer uses this to get into the app)

---

## STEP 8 — Screenshots (30 min)

In Xcode: top device selector → **iPhone 15 Pro Max** simulator. The app launches in a simulated phone window. Navigate to each of these screens, press **Cmd + S** in the simulator to save:

1. Home feed with a great post visible
2. A creator's profile
3. A community room with chat
4. Post detail with comments
5. Discover page
6. Onboarding "Welcome to Ripple"

Drag the 6 PNGs into App Store Connect → **Previews and Screenshots → iPhone 6.7"**.

---

## STEP 9 — Submit for review

App Store Connect → your app → version 1.0 → fill **"What's New"** ("Initial release.") → click **Add for Review → Submit**.

Review takes **24–48 hours** typically. First-time UGC apps sometimes get one round of questions — we respond in the **Resolution Center** (that's why you keep Mac access for ~5 days).

On approval: toggle **Release this version** → live worldwide in ~2 hours. 🎉

---

## 👉 What to do right now

Open **Terminal** on the Mac and paste the Step 0a check block. Paste the output back to me. We go from there.
