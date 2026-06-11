## Root cause

When Apple Sign In succeeds on iOS, the auth state flips to authenticated while the user is still on `/auth`. The authenticated route tree in `src/App.tsx` (lines 103–130) does **not** declare a route for `/auth`, so React Router falls through to the catch-all `<Route path="*" element={<NotFound />} />` and renders the "Oops! Page not found" screen for one frame. Then the `navigate('/')` call in the button handler runs and Discover finally mounts.

The audio overlay you saw in that screenshot is iOS Control Center — unrelated.

## Fix

Two tiny changes — both presentation-only, no business logic touched.

### 1. `src/App.tsx` — add `/auth` redirect inside the authenticated block

Inside the inner `<Routes>` (the one that currently lists `/`, `/post/new`, etc.), add as the first route:

```tsx
<Route path="/auth" element={<Navigate to="/" replace />} />
```

Same idea as the existing `/onboarding → /` redirect on line 114. This catches the one-frame gap where the user is authenticated but still sitting on `/auth`, so they go straight to Discover instead of bouncing through NotFound.

### 2. `src/pages/AuthPage.tsx` — replace navigation, don't push

In both the native Apple branch (line 189) and the web Apple branch (line 201), change:

```ts
navigate('/');
```
to
```ts
navigate('/', { replace: true });
```

Do the same on line 149 for the Google handler. `replace: true` prevents `/auth` from sitting in the back stack, so the hardware back button after sign-in doesn't bounce the user to the sign-in screen.

## Why this is the right fix (vs. the deep-link `redirect_uri` suggestion)

The stack-overflow snippet about `VITE_APP_REDIRECT_URI=myapp://callback` applies to the **web OAuth broker** path. We don't use that on iOS — we use the native `@capawesome/capacitor-apple-sign-in` plugin which returns the id-token inline and never redirects through a deep link. So there's nothing to fix in the redirect URI; the only bug is the missing `/auth` route in the authenticated tree.

## Verification

1. Rebuild web bundle, `npx cap sync ios`, archive build 6, upload to TestFlight.
2. On device: sign out → sign in with Apple → confirm Discover renders immediately with no NotFound flash.
3. Repeat for Google sign-in (same fix path) and phone OTP (already uses the same `navigate('/')` — also benefits from `replace: true`, optional to update but recommended).

## Ship checklist for Apple resubmission

- Bump Build to **6** in Xcode (Version stays 1.0)
- Archive → Upload → wait for TestFlight processing
- Re-record the Apple Sign In clip (15 sec is enough) showing clean transition into Discover
- App Store Connect → 1.0 → select build 6 → paste reviewer notes with new video link → Submit for Review
