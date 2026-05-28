# Ripple — App Store Submission Runbook

End-to-end guide to ship Ripple to the Apple App Store as an **Individual** developer.

---

## 0. One-time prerequisites

- **Apple Developer Program** enrolled (Individual, $99/yr) → https://developer.apple.com/programs/enroll/
- **A Mac** with macOS 14+ and **Xcode 15+** installed from the Mac App Store
- This repo cloned locally and `npm install` run

**Bundle ID (permanent):** `in.myripple.app`
**App Name:** Ripple
**Primary category:** Social Networking · Secondary: Lifestyle
**Age rating:** 17+ (user-generated content + live video)

---

## 1. First-time iOS project setup (run once on Mac)

```bash
git pull
npm install
npm run build

# Add the native iOS project (creates /ios folder — commit it)
npx cap add ios

# Generate icon + splash assets for every required iOS size
npm i -D @capacitor/assets
npx capacitor-assets generate --ios

# Sync the web build into the iOS project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

In **Xcode** after it opens:

1. Select the `App` target → **Signing & Capabilities**
2. Team: pick your personal team (your name)
3. Bundle Identifier: confirm `in.myripple.app`
4. **General → Deployment Info**: iOS 14.0 minimum
5. **General → Identity**: Version `1.0.0`, Build `1`

---

## 2. Required Info.plist entries

Open `ios/App/App/Info.plist` and add the following **usage description strings** before submission — missing any of these = automatic rejection:

```xml
<key>NSCameraUsageDescription</key>
<string>Ripple uses your camera to record posts and go live.</string>

<key>NSMicrophoneUsageDescription</key>
<string>Ripple uses your microphone for live broadcasts and video posts.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Ripple needs access to your photos to upload posts and profile pictures.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Ripple saves photos and videos you download to your library.</string>

<key>NSUserTrackingUsageDescription</key>
<string>Used only to keep you signed in and personalise your feed. We do not track you across other apps.</string>

<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

---

## 3. Production build (every release)

```bash
# 1. Make sure server.url is COMMENTED OUT in capacitor.config.ts
grep -A2 "server:" capacitor.config.ts        # should show only commented lines

# 2. Build web assets
npm run build

# 3. Sync to iOS
npx cap sync ios

# 4. Open Xcode
npx cap open ios
```

In Xcode:

1. Top bar device selector → **Any iOS Device (arm64)**
2. Menu: **Product → Archive** (takes 3–5 min)
3. Organizer window opens → **Distribute App → App Store Connect → Upload**
4. Sign with your team, let Xcode manage signing → **Upload**
5. Wait ~15 min for processing email from Apple

---

## 4. App Store Connect — create the listing

Go to https://appstoreconnect.apple.com → **My Apps → +**

| Field | Value |
|---|---|
| Platform | iOS |
| Name | Ripple |
| Primary Language | English (India) |
| Bundle ID | in.myripple.app |
| SKU | ripple-ios-001 |
| User Access | Full Access |

### Listing copy (paste these)

- **App Name (30):** `Ripple`
- **Subtitle (30):** `Everyday things worth sharing`
- **Promotional Text (170):** `Discover honest recommendations, travel diaries, food finds and little moments from real people. Join live drops and follow creators you trust.`
- **Description:** see `docs/store-listing-description.txt` (write a 3–4 paragraph version of the homepage copy)
- **Keywords (100, comma-separated, no spaces):** `recommendations,reviews,travel,food,lifestyle,creator,community,livestream,india,social`
- **Support URL:** `https://myripple.co.in/contact`
- **Marketing URL:** `https://myripple.co.in`
- **Privacy Policy URL:** `https://myripple.co.in/privacy`
- **Copyright:** `2026 Ripple`

### Age Rating questionnaire answers

| Question | Answer |
|---|---|
| Cartoon/Fantasy violence | None |
| Realistic violence | None |
| Sexual content / nudity | None |
| Profanity / crude humor | Infrequent/Mild (user-generated) |
| Mature/Suggestive themes | Infrequent/Mild |
| Horror/Fear themes | None |
| Medical/Treatment info | None |
| Alcohol, tobacco, drugs | Infrequent/Mild |
| Gambling | None |
| Contests | None |
| **Unrestricted Web Access** | **No** |
| **User-Generated Content** | **Yes** |
| **Made for Kids** | **No** |

Resulting rating: **17+**.

### Privacy Nutrition Label (Data Collection)

| Data type | Collected? | Linked to user? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Phone Number | ✅ | ✅ | ❌ | App Functionality (auth) |
| Name | ✅ | ✅ | ❌ | App Functionality |
| Photos / Videos | ✅ | ✅ | ❌ | App Functionality (posts) |
| User Content (posts, comments) | ✅ | ✅ | ❌ | App Functionality |
| User ID | ✅ | ✅ | ❌ | App Functionality |
| Product Interaction | ✅ | ✅ | ❌ | Analytics, Personalisation |
| Crash Data | ❌ | — | — | — |
| Precise Location | ❌ | — | — | — |
| Contacts | ❌ | — | — | — |
| Browsing History | ❌ | — | — | — |

**Tracking:** Select **"No, we do not track"** (we don't share data with data brokers or third-party ad networks).

---

## 5. Screenshots (required)

Take on the iPhone 15 Pro Max simulator (**6.7"** = `1290 × 2796 px`). 3–10 screens, in this order:

1. Home feed with a great post visible
2. A creator's profile
3. A live broadcast in progress
4. A community room with chat
5. Post detail with comments
6. Onboarding "Welcome to Ripple" screen

Capture from Xcode: **Simulator → File → Save Screen** (`Cmd+S`).
Drag the PNGs into App Store Connect → **Previews and Screenshots → iPhone 6.7"**.

You can skip the iPad and other sizes — Apple uses the 6.7" set as the default for all iPhone sizes since 2023.

---

## 6. Compliance checklist (verify before hitting Submit)

- [ ] `capacitor.config.ts` — `server.url` block is commented out
- [ ] All `NS*UsageDescription` strings present in Info.plist
- [ ] Account deletion works in-app (Settings → Delete my account data) ✅ already implemented
- [ ] Privacy Policy URL loads (https://myripple.co.in/privacy) ✅
- [ ] Terms URL loads (https://myripple.co.in/terms) ✅
- [ ] App works on a fresh device with no Lovable sandbox access
- [ ] OTP login works with a real phone number (Twilio in production)
- [ ] App icon shows on home screen with no white box / no transparency
- [ ] No placeholder/lorem text anywhere in the build

### Apple gotchas specific to Ripple

- **Sign in with Apple**: NOT required for us — Apple only mandates it if you offer third-party social logins (Google/Facebook). We use phone OTP, so we're exempt. **If we add Google login later, Sign in with Apple becomes mandatory and we must ship it in the same release.**
- **UGC moderation (Guideline 1.2)**: Apple requires (a) a way to report objectionable content, (b) a way to block users, (c) acted-upon reports within 24h, (d) publish moderation contact. Verify the report/block UI exists on PostDetailPage and UserProfilePage before submission.
- **Livestream broadcasting**: Apple requires the broadcaster to have a clear "End stream" control and viewers to have report/block on streams.

---

## 7. Submit for review

App Store Connect → your app → **iOS App 1.0** → fill **"What's New"** → click **Add for Review** → **Submit**.

Review typically takes **24–48 hours**. First submissions sometimes get an extra question or rejection on UGC moderation — respond in the Resolution Center within 7 days.

---

## 8. After approval

- Toggle **Release this version** → Automatic, OR Manual when you're ready
- App goes live worldwide (or chosen markets) within ~2 hours

For subsequent updates: bump `Version` and `Build` in Xcode, archive, upload, submit. Most updates ship in <24h.
