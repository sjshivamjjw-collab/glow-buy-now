# Pre-Upload Fixes in Xcode

We'll do this in 3 steps in Xcode. Cancel the current Validate dialog if it's still open. After these are done, we re-Archive and then Validate + Upload.

---

## Step 1 — Add PrivacyInfo.xcprivacy file

This declares to Apple what data we collect. Required since May 2024 — auto-reject without it.

The file already exists in your repo at `ios-privacy/PrivacyInfo.xcprivacy`. We just need to copy it into the Xcode project.

**On your Mac (Terminal):**
```bash
cp ios-privacy/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
```

**In Xcode:**
1. Left sidebar → expand **App → App** (the inner folder, where `Info.plist` lives)
2. Open Finder → navigate to `ios/App/App/` → find `PrivacyInfo.xcprivacy`
3. Drag it from Finder into the **App** group in Xcode's left sidebar (drop it right next to `Info.plist`)
4. In the dialog that appears:
   - ✅ Copy items if needed
   - ✅ Add to targets: **App**
   - Click **Finish**
5. Click the file in the sidebar → in the right panel, confirm **Target Membership: App** is ticked

---

## Step 2 — Add Info.plist usage description strings

Without these, the app will **crash** when users tap camera/mic/photo upload, and Apple will reject.

**In Xcode:**
1. Left sidebar → **App → App → Info.plist** → click it
2. The main panel shows a list of keys. Right-click any row → **Add Row**
3. Add each of these 6 entries (key on the left, type, value on the right):

| Key | Type | Value |
|---|---|---|
| `NSCameraUsageDescription` | String | `Ripple uses your camera to record photos and videos for your posts.` |
| `NSMicrophoneUsageDescription` | String | `Ripple uses your microphone to record audio in your video posts.` |
| `NSPhotoLibraryUsageDescription` | String | `Ripple needs access to your photos to upload posts and profile pictures.` |
| `NSPhotoLibraryAddUsageDescription` | String | `Ripple saves photos and videos you download to your library.` |
| `NSUserTrackingUsageDescription` | String | `Used only to keep you signed in and personalise your feed. We do not track you across other apps.` |
| `ITSAppUsesNonExemptEncryption` | Boolean | `NO` |

Tip: When you start typing the key name, Xcode autocompletes to a friendly label like "Privacy - Camera Usage Description" — that's the same thing, accept it.

The last one (`ITSAppUsesNonExemptEncryption = NO`) tells Apple we don't use custom crypto, which skips an export compliance question on every upload.

Save with **Cmd+S**.

---

## Step 3 — Re-Archive

The previous archive doesn't include these new files, so we rebuild.

1. Menu: **Product → Clean Build Folder** (Shift+Cmd+K)
2. Top device selector still shows **Any iOS Device (arm64)** ✅
3. Menu: **Product → Archive** (3–5 min)
4. Organizer opens with the new archive
5. Click **Validate App** → walk through wizard → expect "Validation Successful"
6. Click **Distribute App → App Store Connect → Upload**

---

## What happens after upload (just so you know)

- Apple processes the build for 15–60 min → email confirms it's ready
- You go to **App Store Connect** (the website, appstoreconnect.apple.com) and create the listing:
  - **Category**: Social Networking (primary) + Lifestyle (secondary) — this is where you set it, NOT in Xcode
  - **Age rating**: 17+ (because user-generated content)
  - **Screenshots**: 3–10 from iPhone 6.7" simulator
  - **Description / keywords**: already written in `docs/store-listing-description.txt`
  - **Demo reviewer login**: phone `+91 9999966666`, OTP `123456`
  - **Privacy Nutrition Label**: matches the PrivacyInfo file we just installed
- Then **Submit for Review** → 24–48 hr typical wait

Full submission runbook is in `docs/APP_STORE_SUBMISSION.md` if you want to read ahead.

---

Approve this plan and we'll do Step 1 together. Tell me when you've run the `cp` command on your Mac.
