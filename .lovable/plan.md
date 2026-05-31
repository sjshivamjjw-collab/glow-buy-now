# Make legal & delete-account links visible in the app

Everything required for Play Store already exists at the URLs `/privacy`, `/terms`, `/delete-account`, `/contact`, `/about`, and the in-app delete flow works from Settings. The gap is **discoverability** — there's no visible footer linking to them, so it looks like nothing is there.

## 1. Render the Footer on the Profile page
`src/pages/ProfilePage.tsx` currently doesn't render `Footer`. Add `<Footer />` at the bottom of the page so the links (Terms · Privacy · Delete account · Contact · About) are visible right under the profile content. This is the standard discoverability pattern Play reviewers and users both look for.

## 2. Add a "Delete account" row in Settings (Legal section)
`src/pages/SettingsPage.tsx` Legal section currently lists Privacy + Terms. Add a third row: **Delete account info** → navigates to `/delete-account`. Keeps it one tap away alongside the destructive "Delete my account data" button below.

## 3. Confirm the in-app delete button is obvious
The existing destructive **"Delete my account data"** row in Settings → Account actions already exists, opens a confirmation modal, and (after the last change) shows a "Learn more about account deletion" link. No change needed — just verifying.

## 4. No other changes
- No backend / DB / permissions changes.
- No changes to `AppLayout` or `BottomNav` (keeps the home/discover chrome clean).
- All the policy content and the public URLs are already done.

## Verification after build
- Open `/profile` → footer visible at bottom with all 5 links.
- Open `/settings` → Legal section shows Privacy / Terms / **Delete account info**; Account actions shows **Delete my account data** (red).
- Open `/delete-account` while signed out → page loads, no redirect to `/auth`.
