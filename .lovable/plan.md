# Strip livestream + paid-membership wording from store docs

Two doc files contain stale wording from when Ripple had livestreaming + commerce. Apple/Google reviewers read these — if they see features that don't exist, the app gets rejected. Fix both, no app-code changes needed.

## File 1 — `docs/store-listing-description.txt`

This is the actual copy that goes into App Store Connect + Play Console. One edit:

- **Line 48**, in the COMMUNITIES MADE SIMPLE block:
  - Before: *"Creators can build their own communities with free or paid membership tiers. Members get access to private chat channels, exclusive events, and curated resources — all inside the app, with no extra logins or paywalls."*
  - After: *"Creators can build their own communities with multiple membership tiers. Members get access to private chat channels, exclusive events, and curated resources — all inside the app, with no extra logins."*

(Drops "free or paid" and "no paywalls" — both implied a purchase flow that doesn't exist.)

No livestream wording exists in this file — it's already clean.

## File 2 — `docs/APP_STORE_SUBMISSION.md`

Five surgical edits to remove livestream references. Capgo Live **Updates** mentions stay (different thing — OTA updates, not live video).

1. **Line 16** — Age rating note
   - Before: `**Age rating:** 17+ (user-generated content + live video)`
   - After: `**Age rating:** 17+ (user-generated content)`

2. **Line 57** — Camera Info.plist string
   - Before: `<string>Ripple uses your camera to record posts and go live.</string>`
   - After: `<string>Ripple uses your camera to record photos and videos for your posts.</string>`

3. **Line 60** — Microphone Info.plist string
   - Before: `<string>Ripple uses your microphone for live broadcasts and video posts.</string>`
   - After: `<string>Ripple uses your microphone to record audio in your video posts.</string>`

4. **Line 151** — Promotional Text
   - Before: `Discover honest recommendations, travel diaries, food finds and little moments from real people. Join live drops and follow creators you trust.`
   - After: Replace with the wording already in `docs/store-listing-description.txt`: *"Discover honest recommendations, travel diaries, food finds and little moments from real people in India. Join communities and follow creators you actually trust."*

5. **Line 204** — Screenshot list item #3
   - Before: `3. A live broadcast in progress`
   - After: `3. A community room with chat` (and renumber the rest — drop the duplicate so we still have 6 items by adding `6. Onboarding "Welcome to Ripple" screen`, which is already there)

6. **Line 232** — "Apple gotchas" bullet
   - Delete the entire `**Livestream broadcasting**: ...` bullet point.

## What I will NOT touch

- `capacitor.config.ts` — clean already, no livestream plugins.
- `ios-privacy/PrivacyInfo.xcprivacy` — no livestream-specific declarations to remove.
- Any React/app source — no UI references livestreaming or paid tiers in a way that would mislead a reviewer.
- Capgo "Live Updates" references in section 9 of the runbook — that's the OTA update system, not livestream.

## Verification after edits

Run `grep -in "live\|broadcast\|stream\|paid" docs/store-listing-description.txt docs/APP_STORE_SUBMISSION.md` and confirm only "Capgo Live Updates" / "live worldwide" / "ships JS bundles" type matches remain — no feature claims for livestreaming or paid memberships.

---

Approve and I'll apply all 7 edits in one pass, then we're cleared to start Step 0 on the Mac.
