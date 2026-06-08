## What Apple actually rejected

Two bugs, both reproducible only inside the native iOS app (not in the web build — that's why everything looked fine when we tested in Safari):

1. **"Continue with Apple" does nothing** — tapping it just sits on the sign-in screen.
2. **The ••• (ellipsis) button at the top right of a post detail page does nothing** when tapped.

Both have to be fixed in the JS bundle. The Apple Sign-In fix also needs one one-time native change in Xcode (adding the "Sign in with Apple" capability), which only you can do on your Mac.

---

## Bug 1 — "Continue with Apple" does nothing on iOS

### Why it fails
On the web (`myripple.co.in`) our Apple button calls `lovable.auth.signInWithOAuth('apple', { redirect_uri: window.location.origin })`. That works because the origin is a real `https://` domain Apple has whitelisted.

Inside the native app, the WebView origin is `capacitor://localhost`. Apple's OAuth servers reject that origin outright, so the broker either silently fails or the redirect lands nowhere — exactly what Apple's reviewer saw ("we remain on the sign in screen").

The Lovable web OAuth broker is not a supported flow for native iOS. Apple requires native apps to use **Sign in with Apple via AuthenticationServices** (the system sheet), not a web redirect.

### Fix
Use the `@capacitor-community/apple-sign-in` plugin on native, keep the existing web flow on web.

1. Add the plugin:
   ```
   npm i @capacitor-community/apple-sign-in
   npx cap sync ios
   ```
2. In `src/pages/AuthPage.tsx`, change the Apple button handler:
   - If `isNative()` → call `SignInWithApple.authorize({ clientId: 'in.myripple.app', redirectURI: 'https://myripple.co.in', scopes: 'email name', state: '...', nonce: '...' })`, then take the returned `identityToken` and call `supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken, nonce })`. After that, our existing `onAuthStateChange` listener in `AuthContext` picks up the session and routes the user in.
   - If web → keep the existing `lovable.auth.signInWithOAuth('apple', …)` flow unchanged.
3. Show a clear toast if `authorize` rejects (user cancelled, no internet, etc.) so future reviewers see an actual message instead of "nothing happens".

### One-time native change in Xcode (you do this on the Mac)
1. `git pull && npm install && npm run build && npx cap sync ios && npx cap open ios`
2. Select the **App** target → **Signing & Capabilities** → click **+ Capability** → add **Sign in with Apple**.
3. Confirm the App ID `in.myripple.app` in Apple Developer Console also has the **Sign In with Apple** capability ticked (Identifiers → App IDs → in.myripple.app → Edit → enable Sign In with Apple → Save). This is separate from the Services ID we set up for the web flow.
4. Archive → Upload → submit new build.

### Why this also handles Apple's "must work on iPad" note
The native plugin uses the system Sign in with Apple sheet, which is fully supported on iPadOS 26 — same code path Apple expects to see.

---

## Bug 2 — Ellipsis (•••) button on post detail does nothing

### Why it fails
The button at the top right of `PostDetailPage` is a Radix `DropdownMenu`. In iOS WKWebView, Radix's pointer-event handling on the trigger can be swallowed when:
- the trigger lives inside a horizontally-scrolled or `overflow-hidden` toolbar (ours does), and
- the trigger uses `asChild` with a custom `<button>` that itself has `active:scale-95` Tailwind classes.

The combination means the first tap toggles the `:active` state but the synthetic pointer event Radix needs to open the menu never fires. On desktop / Android it's fine; iOS Safari + WKWebView is the known broken environment for this exact pattern.

There's also a secondary issue: the menu only renders for `!isOwn && userId`. If the demo reviewer was logged in but viewing a post by the same demo user, the ••• button wouldn't render at all. But in the screenshot they're on Shivam.jjw's post, so the dropdown SHOULD have rendered — meaning the trigger is the problem.

### Fix
In `src/pages/PostDetailPage.tsx` around lines 461–492, replace the Radix `DropdownMenu` with our existing shadcn `Sheet` (slide-up action sheet from the bottom). Sheets are known to work reliably in iOS WebView because they use a full-screen overlay rather than a positioned popper.

The replacement keeps the same two actions:
- **Report post** → opens the existing `ReportPostDialog`.
- **Block user** → existing `user_blocks` insert + `refreshBlocks()` + `navigate(-1)`.

Visually: tap ••• → bottom sheet slides up with "Report post" and "Block user" rows (Block in destructive red), plus a Cancel row. This is also the iOS-native pattern reviewers expect.

No backend or DB changes — pure component swap.

---

## Verification before resubmitting

On your Mac, after `git pull && npm install && npx cap sync ios`:

1. Build & run on the iOS Simulator (iPhone 17 Pro Max and iPad Air M3 — the exact two devices Apple tested):
   - Tap **Continue with Apple** → system sheet appears → complete sign-in → land on the home feed.
   - Open any post by another user → tap ••• → bottom sheet opens → both Report and Block work.
2. Once verified locally, archive and upload the new build, bump build number to `3`, and reply to Apple's message in App Store Connect with:
   > "Both issues fixed in build 1.0 (3). Sign in with Apple now uses the native AuthenticationServices flow. The post detail ••• button now opens a bottom action sheet with Report and Block. Please re-review."

---

## Files that will change in build mode

- `src/pages/AuthPage.tsx` — split Apple handler into native vs web.
- `src/pages/PostDetailPage.tsx` — swap Radix DropdownMenu for Sheet.
- `package.json` — add `@capacitor-community/apple-sign-in`.
- Xcode (manual, on your Mac) — add Sign in with Apple capability to the App target.

No database migrations, no edge function changes, no Lovable Cloud auth setting changes.
