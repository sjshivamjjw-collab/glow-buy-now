# Ship Ripple to App Store + Play Store (Capacitor wrap)

Wrap the existing React app with **Capacitor** — same codebase keeps powering the web at myripple.co.in, and we get real native iOS + Android binaries to submit. No push notifications in this phase.

## What you'll need (one-time, only you can do these)

1. **Apple Developer account** — $99/year (App Store).
2. **Google Play Developer account** — $25 one-time (Play Store).
3. **A Mac with Xcode installed** — required to build/submit iOS. Android builds work on any OS via Android Studio.

I'll guide you through each step; signing + uploading must happen on your machine.

## Phase 1 — Capacitor wrap (I do this in the project)

1. Add deps: `@capacitor/core`, `@capacitor/cli` (dev), `@capacitor/ios`, `@capacitor/android`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`.
2. Create `capacitor.config.ts`:
   - `appId: app.lovable.74c9b69bcd6d42fbb279125200f8f6c7`
   - `appName: Ripple`
   - Dev-only hot-reload pointed at the Lovable sandbox URL (clearly commented — **must be removed before release builds**).
3. Tweak `index.html` viewport for safe-area insets (status bar / home indicator). Already mostly handled — small CSS additions.
4. Add a tiny `src/lib/platform.ts` (`isNative()` helper) so future native-only code paths stay clean. No behavior change today.
5. Status bar + splash screen config so the app doesn't open to a flash of white.

After this, no UI changes — the app looks/works identically on web.

## Phase 2 — Your local build (you do this, I give exact commands)

1. Export to GitHub (button in Lovable, top right).
2. `git clone` locally, `npm install`.
3. `npx cap add ios` and `npx cap add android` — creates `/ios` and `/android` folders.
4. `npm run build && npx cap sync` — copies the built web app into native shells.
5. `npx cap open ios` / `npx cap open android` — opens Xcode / Android Studio to run on a device.

## Phase 3 — Store assets (we do together)

For both stores:
- **App icon**: 1024×1024 master PNG → I'll generate all required sizes with a script.
- **Splash screen**: same source → all sizes.
- **Screenshots**: 6.7" iPhone + 6.5" iPhone (App Store); phone + 7" tablet (Play). I can capture from the live web app at correct viewports.
- **Privacy Policy URL**: already live at https://myripple.co.in/privacy ✓
- **Terms URL**: https://myripple.co.in/terms ✓
- **Support / Contact URL**: https://myripple.co.in/contact ✓
- **Short description, long description, keywords** — I'll draft, you approve.
- **Data Safety (Play) / App Privacy (App Store) answers** — I'll prepare a checklist based on what the app actually collects (phone number, profile data, payment info via Razorpay).
- **Content rating** questionnaire.

## Phase 4 — Submit

- **Play Store**: upload AAB → Internal testing track first → promote to Production.
- **App Store**: upload via Xcode → TestFlight → submit for App Review.

First Apple review usually takes 24–48h. Play review usually <24h. I'll prepare reviewer notes (test phone numbers, demo OTPs) so Apple's reviewers can actually log in.

## What stays exactly the same

- The web app at myripple.co.in.
- All existing features, auth, OTP, payments, livestreams, communities.
- Lovable Cloud backend.
- No Razorpay changes, no PWA / service worker.

## Order of operations

1. You approve this plan.
2. I do Phase 1 entirely.
3. You set up Apple + Google developer accounts in parallel.
4. You do Phase 2 once Phase 1 lands.
5. We do Phase 3 + Phase 4 together.

## Notes / gotchas

- **Razorpay on native**: the existing web Checkout works inside the Capacitor WebView for most cases, but Apple sometimes requires the Razorpay Capacitor plugin for physical-goods flows. If Apple rejects, we add the plugin in a follow-up — not blocking submission.
- **Sign-in with Apple**: Apple **requires** it on iOS if you offer any third-party social login. Today the app only uses phone OTP, so we're clear.
- **Phone OTP on native**: works as-is via the existing edge functions.
- **`server.url` hot-reload**: dev-only. The release build must point to the bundled web assets, not the sandbox. I'll add a clear comment + a `release` config script.
- Push notifications can be added later in a single follow-up without re-submitting from scratch.
