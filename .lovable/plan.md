## Problem

Account deletion is currently buried — users must go Profile → Settings → scroll to "Account actions" → "Delete my account data". The `/delete-account` page (which Settings' confirm dialog links to) only *explains* the process; there's no actionable button on it, so users have to come back to Settings to actually delete.

Both Play Store and Apple require account deletion to be **easy to find and easy to perform from inside the app**.

## Fix (2 small changes, frontend only)

### 1. Surface "Delete Account" on the Profile page itself

Add a red destructive menu row directly on `ProfilePage.tsx`, in the existing menu list (currently: Notifications / Help & Support / Settings). New row:

- Icon: `Trash2` (red)
- Label: "Delete Account" (red text)
- Tapping → navigates to `/delete-account`

Placed below "Settings" with a visual divider so it's clearly separated from normal nav.

### 2. Make `/delete-account` actually delete

Move the delete logic (currently inside `SettingsPage.handleDeleteAccount`) to `DeleteAccountPage.tsx` as an in-page button at the bottom:

- Big red "Permanently delete my account" button
- Tapping opens the same confirmation modal pattern used in Settings
- On confirm → calls the same Supabase update that wipes profile fields (name, username, avatar_url, date_of_birth, gender) → signs out → redirects to `/auth`
- Shows toast on success/error

Keep the existing explainer copy on the page (what gets deleted, what's retained, timeline, email fallback).

### 3. Remove the duplicate in Settings (optional but cleaner)

The "Delete my account data" row in `SettingsPage` "Account actions" becomes redundant once Profile has a direct link. Replace it with a single row "Delete Account" that just navigates to `/delete-account` (consistent with Profile). This avoids two slightly different delete flows.

## What changes
- `src/pages/ProfilePage.tsx` — add Delete Account menu row
- `src/pages/DeleteAccountPage.tsx` — add actionable delete button + confirm modal + delete logic
- `src/pages/SettingsPage.tsx` — simplify the existing delete row to just navigate to `/delete-account` (remove the duplicate confirm modal + handler)

## Out of scope (call out)

The current delete behavior is a **soft delete** — it nulls profile fields (name, username, avatar, DOB, gender) and signs the user out. It does NOT delete the user's posts, comments, follows, communities, or the `auth.users` row itself. The `/delete-account` page explains that full removal happens within 30 days via email request.

For Play Store/Apple, this two-tier model (instant soft-delete + 30-day full deletion via support) is acceptable as long as it's disclosed (it is — on the `/delete-account` page). If you want a true one-tap hard delete (edge function with service role that wipes the auth user + all related rows), that's a bigger change — happy to plan it separately. Recommend shipping the visibility fix first since that's what blocks store compliance.