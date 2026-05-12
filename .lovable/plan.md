## Goal
Make the **Help & Support** and **Settings** rows in the Profile tab actually go somewhere (currently `path: '#'` no-ops).

## Changes

### 1. Help & Support → existing `/contact` page
We already have a public `ContactPage` (used for Razorpay KYC). Reuse it as Help & Support — no new page needed.

### 2. Settings → new `/settings` page
Create `src/pages/SettingsPage.tsx` (mobile-first, max-w-lg, theme tokens) with:

- **Account** — read-only phone + role
- **Preferences**
  - Push notifications toggle (stored in localStorage per user)
  - Shortcut to Saved addresses (`/addresses`)
  - Shortcut to Notifications inbox (`/notifications`)
- **Legal** — links to existing `/privacy`, `/terms`, `/refunds`
- **Account actions**
  - Clear cached preferences (wipes `lc:*` localStorage keys)
  - Sign out
  - Delete my account data — confirmation modal; clears name/username/avatar/dob/gender on the profile, then signs out. (Full hard-delete from `auth.users` would need a separate edge function, which we can add later if you want.)

Same `/settings` route is used for both shopper "Settings" and seller "Store Settings".

### 3. Wire it up
- `src/pages/ProfilePage.tsx` — point both menu rows to real paths:
  - `Help & Support` → `/contact`
  - `Settings` / `Store Settings` → `/settings`
- `src/App.tsx` — register `<Route path="/settings" element={<SettingsPage />} />` inside the authed `AppLayout` block.

## Out of scope
- Hard-deleting the `auth.users` row (needs a service-role edge function). Happy to add it as a follow-up if you want true account deletion.
- Building a full FAQ/help center — `/contact` already covers support contact.
