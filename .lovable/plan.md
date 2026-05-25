## Goal
Keep `+919619846170` as an admin (server-side `admin` role + admin panel link in Profile), but stop treating it as a "demo" account. It should go through the normal onboarding flow (name, username, DOB, city, interests) and show the user's real name everywhere — not "Admin".

## Current behavior (why we need changes)
1. `+919619846170` is in `DEMO_PHONES` in `src/contexts/AuthContext.tsx` and `supabase/functions/verify-otp/index.ts`, plus in `handle_new_user()` DB trigger. Demo phones:
   - Auto-mark `onboarding_completed = true` (skips onboarding).
   - Default `userName` to `'Demo User'` / `'Admin'` instead of letting the user set it.
2. OTP for `+919619846170` is currently the dev-fixed `123456` via the `DEV_PHONES` allowlist in `send-otp` — this should stay.

## Changes

### 1. `src/contexts/AuthContext.tsx`
- Remove `+919619846170` from the `DEMO_PHONES` set (keep the other demo phones).
- This means: on login, `onboardingCompleted` will come from the actual `profiles.onboarding_completed` value, and `userName` will be the real profile name (no "Admin" fallback).
- `isAdmin` is already derived purely from `user_roles`, so admin panel access is unaffected.

### 2. `supabase/functions/verify-otp/index.ts`
- Remove `+919619846170` from the `DEMO_PHONES` set so the function does not force `onboarding_completed = true` for this phone on first login.

### 3. DB migration — update `handle_new_user()`
- Remove `+919619846170` from `v_demo_phones` inside the function.
- Keep it in `v_admin_phones` so the `admin` role is still auto-granted on signup.
- Note: existing admin profile row in `profiles` already has `onboarding_completed = true` from previous logins. Migration will also set it back to `false` for this user so the onboarding flow runs once:
  ```sql
  UPDATE public.profiles
  SET onboarding_completed = false
  WHERE phone = '+919619846170';
  ```

### 4. Keep these unchanged
- `send-otp` `DEV_PHONES` allowlist — `+919619846170` stays, so OTP remains `123456`.
- Admin panel entry in `ProfilePage` (already gated by `isAdmin` from server roles).
- All other demo phones keep their fast-path behavior.

## Result
- User logs in with `9619846170` → OTP `123456` → lands on onboarding → fills profile → reaches the app as a normal user with their real name + avatar, and sees the Admin Panel row in Profile because the `admin` role is still on their `user_roles`.
