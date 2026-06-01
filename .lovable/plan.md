# Add Sign in with Apple

Apple Guideline 4.8 requires Sign in with Apple whenever a third-party social login (Google) is offered. We'll add it next to the existing Google button using Lovable Cloud's managed Apple OAuth — no Apple Developer key/JWT setup needed on your side for the managed flow.

## What changes

### 1. Enable Apple provider in Lovable Cloud
Run `configure_social_auth` with `providers: ["google", "apple"]`. This:
- Turns on managed Apple OAuth in the backend
- Ensures `src/integrations/lovable/index.ts` (already present) keeps working for both providers
- No new secrets, no Apple Developer credentials required — Lovable's managed credentials are used

### 2. Add "Continue with Apple" button on `src/pages/AuthPage.tsx`
- Placed directly below "Continue with Google" in the welcome step
- Same visual treatment (card background, border, equal prominence) so it satisfies Apple's "equal prominence" requirement
- Black background with white Apple logo + "Continue with Apple" label (Apple's HIG style), using semantic tokens
- Wired to:
  ```ts
  await lovable.auth.signInWithOAuth('apple', { redirect_uri: window.location.origin })
  ```
- Same error/redirect handling as the Google button (toast on error, navigate('/') on success)

### 3. AuthContext — no change needed
`bootstrapFromSession` already reads `user_metadata.full_name / name / email / avatar_url / picture` from any OAuth session, so Apple sign-ins will populate the profile the same way Google does. The `handle_new_user` trigger already handles OAuth metadata.

### 4. Docs update
Add a short note to `docs/APP_STORE_SUBMISSION.md` confirming Sign in with Apple is wired (helps you tick the Guideline 4.8 checkbox during review).

## What you should know

- **Privacy Policy**: Apple users can choose "Hide My Email" — they'll sign in with a relay address like `xxx@privaterelay.appleid.com`. Our privacy page already says we collect email; no copy change needed, but worth knowing.
- **App Store privacy nutrition label**: When you fill it out in App Store Connect, add "Apple ID" alongside Google as a sign-in identifier.
- **iOS native build**: The web OAuth flow works inside the Capacitor webview, so no native Apple SDK integration is required for v1. If you later want the native iOS sheet (smoother UX), we can add `@capacitor-community/apple-sign-in` — not needed to pass review.

## Order of operations
1. Call `configure_social_auth` to enable Apple
2. Edit `AuthPage.tsx` to add the button
3. Append a one-paragraph note to `docs/APP_STORE_SUBMISSION.md`

Ready to switch to build mode and implement?
