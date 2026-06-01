# iOS Privacy Manifest

`PrivacyInfo.xcprivacy` is required by Apple for every new App Store submission since May 1, 2024. It declares:

- Whether the app tracks users (we don't).
- What data the app collects (matches our App Store Nutrition Label).
- Which "required-reason" APIs the app uses (Capacitor + WKWebView baseline).

## How to install it (one-time, on your Mac)

After you've run `npx cap add ios`:

```bash
cp ios-privacy/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
npx cap open ios
```

In Xcode:

1. In the left sidebar, expand **App → App**.
2. Drag `PrivacyInfo.xcprivacy` from Finder into the **App** group (the inner one, next to `Info.plist`).
3. In the dialog that appears:
   - ✅ Copy items if needed
   - ✅ Add to target: **App**
4. Click **Finish**.

Verify: select `PrivacyInfo.xcprivacy` in Xcode → the **File Inspector** (right panel) should show **Target Membership: App** ticked.

## When to update this file

Update the manifest in this folder (then re-copy into `ios/App/App/`) whenever you:

- Add a new Capacitor plugin that accesses new APIs (camera, push notifications, geolocation, etc.).
- Add an analytics, crash-reporting, or advertising SDK.
- Start collecting a new category of user data.
- Start tracking users across other apps/websites (sets `NSPrivacyTracking` to `true` and requires `NSPrivacyTrackingDomains`).

Keep this file, `docs/APP_STORE_SUBMISSION.md` (Nutrition Label section), and `docs/PLAY_STORE_DATA_SAFETY.md` in sync — Apple and Google both reject apps when the manifest doesn't match the public privacy disclosures.
