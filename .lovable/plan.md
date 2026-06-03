# Ripple → Play Store (Personal account: 12/20 testers + 14 days path)

You already have the `.aab` and `.jks`. The 14-day closed testing requirement is now the gating item — let's structure everything around starting that clock as fast as possible.

## Google's exact requirement (Personal accounts only)

- Run a **Closed Testing** track with **at least 12 opted-in testers** (Google's UI shows 12; some regions/recent updates say 20 — aim for **20 to be safe**)
- Testers must remain opted in for **14 consecutive days**
- After 14 days, an **"Apply for production access"** button appears under Publishing overview → submit it
- Google reviews production access request (1–3 days), then you can push to Production

So: **Today → start Closed Testing. Day 14 → apply for production. Day ~16 → live.**

## Phase A — Today: get Closed Testing live (1–2 hours)

### Step 1 — Create the app in Play Console (5 min)
Click **Create app** on the screen you're on. Fill:
- Name: Ripple
- Language: English (India)
- App, Free, tick both declarations

### Step 2 — Fill the "Set up your app" checklist (45 min)
All answers are in our repo:
| Section | Source |
|---|---|
| App access (reviewer creds) | `docs/PLAY_STORE_SUBMISSION.md` §9 |
| Ads | No |
| Content rating | `docs/PLAY_STORE_DATA_SAFETY.md` → Mature 17+ |
| Target audience | 18+ |
| Data safety | `docs/PLAY_STORE_DATA_SAFETY.md` |
| Government app / News / COVID | No / No / No |
| Store listing copy | `docs/store-listing-description.txt` |
| Category | Social |

### Step 3 — Create the Closed Testing track (15 min)
Play Console → **Testing → Closed testing → Create track** ("Alpha" is fine as the name).
- Upload your `.aab`
- **Testers tab → Create email list** → paste 12–20 tester emails (their Google account emails — same one they use on their phone)
- **Feedback URL or email:** `shivam@ripple-shop.com`
- Click **Review release → Start rollout to Closed testing**

### Step 4 — Send testers the opt-in link
After the release rolls out (~30 min), the Testers tab shows a **"Copy link"** button. Send that link + this message to every tester:
> *Tap the link on the same phone where you'll test, sign in with the Gmail you gave Shivam, tap "Become a tester", then install Ripple from the Play Store link that appears. Keep it installed for 14 days — open it at least once.*

## Phase B — Where to find 12–20 testers (today/tomorrow)

Easiest sources, in order:
1. **Family + close friends** (5–8 people)
2. **WhatsApp groups** you're in — post: "Need 12 friends to help me ship Ripple on Play Store. Just install + keep for 14 days. No usage required."
3. **Reddit r/AlphaandBetausers, r/TestMyApp** — post asking for testers (works, but you'll need to reciprocate)
4. **Telegram groups**: "Google Play Closed Testing" has 5000+ members swapping installs
5. **Fiverr** — ₹500–1000 buys you 15 testers in 24h ("google play closed testing 14 days")

Recommend mixing sources so it doesn't look like a single coordinated pool to Google.

## Phase C — Assets I generate for you (parallel to Phase A)

If you confirm, I'll prep these now so you can upload during Step 2:
1. **Feature graphic** (1024×500 PNG, required)
2. **Android phone screenshots** (1080×1920, from your existing iPhone shots — minimum 2, recommend 4–8)

## Phase D — Day 1 through Day 14 (passive)

- Daily check: Play Console → Testing → Closed testing → **Testers** shows count of "Active testers". Needs to stay ≥12 for 14 consecutive days.
- If someone uninstalls, count drops → clock can reset. Over-recruit (aim for 20).
- Nudge testers on day 7 with a "still installed? thanks 🙏" message.

## Phase E — Day 14: apply for production (5 min)

Play Console → **Publishing overview** → **Apply for production access** button appears.
- Form asks: testing summary, what you changed based on tester feedback, target launch date
- Google replies in 1–3 days
- On approval: create a Production release with the same AAB → Send for review → live in 1–7 days (usually <24h for first prod after closed testing passed)

## What I need from you now

Three quick answers and I'll start on assets immediately:

1. **Generate Android screenshots from the 4 iPhone shots you sent earlier?** (yes / I'll send new ones)
2. **Generate the 1024×500 feature graphic?** (yes / I have one)
3. **How many testers can you realistically gather from family/friends/WhatsApp?** (helps me decide if you also need to write a Reddit/Telegram recruitment blurb)

Once you answer, I'll generate the assets in this same turn and you can start Phase A today.
