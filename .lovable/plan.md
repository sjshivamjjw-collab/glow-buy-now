## Add store listing description + Support page

### 1. New file: `docs/store-listing-description.txt`

Plain-text long-form description for both Apple App Store (4000 char limit) and Google Play (4000 char limit). Single file, used in both consoles.

Structure (~1500 chars, well under both limits):

- **Opening line** (hook): "Ripple is where everyday moments become stories worth sharing."
- **Paragraph 1** — What Ripple is: a social app for honest recommendations, travel diaries, food finds, lifestyle posts from real people in India.
- **Paragraph 2** — Core features: post photos/videos/text, follow creators, like + comment + save, communities with chat/events/resources, tier-based access, notifications.
- **Paragraph 3** — Why people love it: no ads, no algorithmic noise, no influencer fakery — just real moments from real Ripplers.
- **Paragraph 4** — Trust & safety: report any post/profile, block users, in-app account deletion, phone-based secure login.
- **Closing CTA**: "Download Ripple and start sharing your moments today."

Plus a section at bottom marked `--- SHORT DESCRIPTION (Play Store, 80 chars) ---` with: `Share everyday moments, follow real creators, join communities you love.`

### 2. New page: `/support`

Add `src/pages/SupportPage.tsx` — public route (same pattern as `/contact`, `/about`).

Content (uses existing `LegalPageLayout`):

- **Hero copy**: "Need help with Ripple? We're here."
- **Quick links** (cards, same visual style as ContactPage cards): jump to FAQ, Email us, Report abuse, Delete account.
- **FAQ accordion** (using existing shadcn `Accordion`):
  - How do I sign up? — phone + OTP, no password needed.
  - I'm not getting my OTP. — check signal, wait 60s, contact support.
  - How do I post? — tap the + button in the bottom nav.
  - How do I report a post or user? — three-dot menu on any post or profile.
  - How do I block someone? — profile → three-dot menu → Block.
  - How do I delete my account? — Settings → Delete account, or go to `/delete-account`. All data is wiped permanently.
  - How do communities work? — join free or paid tiers for access to chat, events, resources.
  - Is my data safe? — yes, RLS + encrypted in transit, see Privacy Policy.
- **Contact card**: email `shivam@ripple-shop.com`, response within 1 business day, Mon–Sat 10:00–19:00 IST.
- **Response-time SLA**: "We respond to all support requests within 1 business day. Reports of abuse, illegal content, or safety issues are actioned within 24 hours."
- **Moderation contact (UGC compliance)**: same email serves as Grievance Officer contact, matching what's already in Privacy Policy.

### 3. Wire it up

- `src/App.tsx` → lazy import `SupportPage`, add `<Route path="/support" element={<SupportPage />} />` inside `publicLegalRoutes` so it works for logged-out + logged-in users.
- `src/components/Footer.tsx` → add `Support` link between `Contact` and `About`.

### 4. Update docs

- `docs/APP_STORE_SUBMISSION.md`: change **Support URL** from `https://myripple.co.in/contact` → `https://myripple.co.in/support`. Update the section that currently says "see `docs/store-listing-description.txt`" to confirm the file now exists.
- `docs/PLAY_STORE_DATA_SAFETY.md`: no changes needed (it doesn't reference a support URL).

### What this does NOT change

- No backend, no DB, no auth.
- No changes to existing pages (Contact, Privacy, Terms stay as-is).
- No new dependencies — Accordion + Footer + LegalPageLayout already exist.
