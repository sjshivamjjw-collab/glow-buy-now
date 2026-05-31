# Publish-Readiness Plan — Legal, Privacy, Permissions

Goal: make sure Ripple passes Google Play (and Apple) review on the policy/disclosure side — no functional changes to the app, just content + one new public page + one config doc.

## 1. Privacy Policy — bring it up to Play Data Safety standard
Update `src/pages/PrivacyPage.tsx` so it explicitly covers everything Play's Data Safety form asks about:

- **Data we collect** (itemised): phone number, name, username, DOB, gender, city, avatar, posts/photos/videos, comments, likes, follows, chat messages, device/IP/log data, app interaction.
- **Why** each item is collected (account, app functionality, personalisation, security, legal).
- **Sharing**: explicit "we do not sell" + list of processors (Twilio for OTP, 100ms for video, cloud hosting/storage). Note that data may be processed in India and other regions where our processors operate.
- **Permissions** the app requests on device (Camera, Microphone, Photos/Media, Notifications) and what each is used for.
- **User rights**: access, correction, deletion (in-app + web URL + email), data export on request.
- **Account deletion**: dedicated section with the public URL (see §3) and the in-app path (Settings → Delete my account data).
- **Children**: 18+ only, no data knowingly collected from minors.
- **Security**: encryption in transit, RLS, role-based access.
- **Grievance Officer** block (required by India's IT Rules 2021): name, email, address, response SLA.
- **Contact + last-updated date**.

## 2. Terms of Service — small additions for store compliance
Update `src/pages/TermsPage.tsx`:

- Add an **explicit UGC moderation clause**: zero-tolerance for objectionable content, in-app **Report** and **Block**, 24-hour action SLA, right to remove content / suspend accounts.
- Add a **prohibited content** expansion (CSAM, non-consensual intimate imagery, doxxing, self-harm promotion, dangerous misinformation) — Play specifically scans for this language.
- Add a **livestream conduct** clause (no nudity, no hate, broadcaster responsible for their stream).
- Add a **DMCA / IP takedown** contact line.
- Add an **18+ age gate** restatement.

## 3. New public Account Deletion page (Play requirement)
Create `src/pages/DeleteAccountPage.tsx` at route `/delete-account`, registered as a **public** route in `src/App.tsx` (alongside `/terms`, `/privacy`, etc.) so it's reachable without login. Play requires both an in-app flow *and* a publicly accessible web URL.

Content:
- What gets deleted (profile, name, username, avatar, DOB, gender, posts, comments, likes, follows, chat messages, saved items).
- What's retained and why (minimal records for legal/fraud, anonymised analytics).
- Retention window (e.g. permanent removal within 30 days).
- **Two ways to delete**:
  1. In-app: Settings → Account actions → Delete my account data (with screenshot/text steps).
  2. Email request to `shivam@ripple-shop.com` from the registered phone/email — handled within 7 days.
- Link to Privacy Policy and Contact.
- Uses the existing `LegalPageLayout` for consistent styling.

Also link this page from:
- `PrivacyPage.tsx` (deletion section)
- `Footer.tsx` (add a "Delete account" link alongside Terms/Privacy/Contact/About)
- `SettingsPage.tsx` delete-confirmation modal (small "Learn more" link)

## 4. Permissions disclosure document
Create `docs/PLAY_STORE_DATA_SAFETY.md` — a single source of truth that mirrors what we'll paste into Play Console's Data Safety form and Permissions declarations. Same structure as the existing `docs/APP_STORE_SUBMISSION.md` Privacy Nutrition Label, but in Play's vocabulary:

- **Data types collected** table (Personal info, Photos/Videos, Messages, App activity, App info/performance) with: collected? / shared? / optional? / purpose / encrypted in transit? / can user request deletion?
- **Permissions** table (CAMERA, RECORD_AUDIO, READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, POST_NOTIFICATIONS, INTERNET) with the user-facing rationale string for each.
- **Content rating** answers (Mature 17+ UGC + live video).
- **Target audience**: 18+, not Designed for Families.
- **Ads**: No ads. No third-party advertising SDKs.
- **Government app / News / COVID**: No.

This doc has no runtime effect — it's a checklist so the Play Console listing matches the Privacy Policy word-for-word (mismatch = rejection).

## 5. Verification
- Visit `/terms`, `/privacy`, `/delete-account`, `/contact`, `/about` while signed out → all 4 should load without redirecting to `/auth`.
- Confirm Footer renders the new link.
- Confirm `myripple.co.in/delete-account` will work post-deploy (this is the URL we'll paste into Play Console).

## Out of scope (call out, don't change)
- No changes to actual data collection, auth flow, or DB schema.
- No changes to Capacitor permissions config — Android permissions are declared during the `npx cap add android` step covered in the earlier publish runbook; we'll handle that doc when you start the Android build.
- No changes to `SettingsPage` delete logic itself (just adding a "Learn more" link).
