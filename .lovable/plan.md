## Apple resubmission — two blockers to fix

Both issues are iOS-native regressions caused by missing native config, not by app logic. Fixes are small and localized.

---

### Issue 1 — Crash on "Take Photo" (Guideline 2.1a)

**Root cause:** `ios/App/App/Info.plist` has no camera / photo-library usage descriptions. When a user taps "Take Photo" in the native file picker, iOS terminates the app with `SIGABRT` because the required purpose strings are absent. This affects Profile avatar upload and every other `<input type="file" accept="image/*">` in the app (Create Post, Create Reel).

**Fix:** Add the four standard keys to `ios/App/App/Info.plist`:

- `NSCameraUsageDescription` — "Ripple uses your camera so you can take a photo or video for your profile picture and posts."
- `NSPhotoLibraryUsageDescription` — "Ripple accesses your photo library so you can choose photos and videos to share in posts and as your profile picture."
- `NSPhotoLibraryAddUsageDescription` — "Ripple saves photos and videos you export back to your library."
- `NSMicrophoneUsageDescription` — "Ripple uses your microphone when you record a video with sound for a post."

No JS changes needed. The existing `<input type="file">` pickers will now be allowed to open the camera without crashing.

---

### Issue 2 — "Continue with Google" unresponsive on iOS (Guideline 2.1a)

**Root cause:** `AuthPage.tsx` calls the web-only `lovable.auth.signInWithOAuth('google')` broker. That broker opens a popup + posts a `web_message` back — this does not work inside the iOS WKWebView (popup is blocked / message never reaches the parent), so the button appears unresponsive. Apple sign-in already works because we branched to the native `@capawesome/capacitor-apple-sign-in` SDK for iOS. Google needs the same treatment.

**Fix:** Mirror the Apple pattern for Google on native iOS.

1. Add dependency `@codetrix-studio/capacitor-google-auth` (the standard Capacitor Google SDK, Swift-Package-Manager compatible — matches our no-CocoaPods setup).
2. In `src/pages/AuthPage.tsx`, branch the Google button:
   - **Native (`isNative()`):** dynamically import `GoogleAuth`, call `GoogleAuth.initialize({ clientId: <iOS client id>, scopes: ['profile','email'] })` on first use, then `GoogleAuth.signIn()` → take `authentication.idToken` → `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })` → navigate to `/`.
   - **Web:** keep the existing `lovable.auth.signInWithOAuth('google')` path unchanged.
3. Add the iOS OAuth client id to `ios/App/App/Info.plist` under keys `GIDClientID` and `CFBundleURLTypes` (reversed client id URL scheme). This is a one-time value the user needs to create in Google Cloud Console (iOS OAuth client bound to bundle id `in.myripple.app`). I'll leave a placeholder and give a short runbook.

---

### Also — versioning + resubmit runbook (Windows/macOS steps for the user)

1. `git pull` → `npm install` → `npm run build` → `npx cap sync ios`.
2. In Xcode, bump **Build** to `9` (Version stays `1.0.0`).
3. Create the Google iOS OAuth client in Google Cloud Console (bundle id `in.myripple.app`), copy the Client ID + reversed client id into `Info.plist` where I've marked `<!-- REPLACE -->`.
4. **Product → Archive → Distribute → App Store Connect.**
5. Reply text for App Review (I'll draft when the build is up).

---

### Technical details (implementation checklist)

- Edit `ios/App/App/Info.plist` — add 4 usage strings + `GIDClientID` + `CFBundleURLTypes` block.
- `bun add @codetrix-studio/capacitor-google-auth`
- Edit `src/pages/AuthPage.tsx` Google button `onClick` — split native vs web the same way the Apple button is split.
- No DB, no edge-function changes. No changes for Android (Google button already works there via the broker; native Google SDK can be layered later if needed).

Nothing else touched — this is scoped to unblocking Apple review.