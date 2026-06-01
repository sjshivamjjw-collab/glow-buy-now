## Add PrivacyInfo.xcprivacy for App Store submission

Apple rejects new app submissions without a `PrivacyInfo.xcprivacy` manifest. Capacitor doesn't generate one, so we'll add a ready-to-drop-in template and document where to place it in Xcode.

### Files to add

**1. `ios-privacy/PrivacyInfo.xcprivacy`** (new)

A complete XML plist declaring:

- `NSPrivacyTracking` → `false`
- `NSPrivacyTrackingDomains` → empty (we don't track)
- `NSPrivacyCollectedDataTypes` → matches the Nutrition Label already in the submission runbook:
  - Phone number (auth) — linked, no tracking
  - Name — linked, no tracking
  - Photos — linked, no tracking
  - Videos — linked, no tracking
  - Other user content (posts, comments) — linked, no tracking
  - User ID — linked, no tracking
  - Product interaction — linked, no tracking, purpose Analytics + Personalisation
- `NSPrivacyAccessedAPITypes` (Capacitor + WebView baseline):
  - `FileTimestamp` → reason `C617.1`
  - `UserDefaults` → reason `CA92.1`
  - `SystemBootTime` → reason `35F9.1`
  - `DiskSpace` → reason `E174.1`

**2. `ios-privacy/README.md`** (new)

Short note: "After `npx cap add ios` on your Mac, copy `PrivacyInfo.xcprivacy` to `ios/App/App/PrivacyInfo.xcprivacy` and add it to the **App** target in Xcode (drag into the `App` group → tick *Copy items if needed* + *App* target membership)."

**3. `docs/APP_STORE_SUBMISSION.md`** (edit)

Insert a new section **"2a. Privacy Manifest (PrivacyInfo.xcprivacy)"** between the current sections 2 and 3, with:
- Why it's required (Apple May 2024 rule).
- Exact copy command: `cp ios-privacy/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy`
- Xcode steps to add it to the App target.
- Note that if we ever add new SDKs (analytics, push, ads), the API/data-type lists must be updated.

### What this does NOT change

- No app code, no UI, no native plugins.
- Doesn't touch `capacitor.config.ts` or any iOS folder (that folder is generated on your Mac).
- No store metadata or privacy answers change — this file just mirrors what's already declared in the runbook.
