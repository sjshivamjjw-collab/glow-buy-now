## Create Travel Reel — Plan

A guided multi-step flow where a user submits their trip media + details, and the Ripple team builds an Instagram-ready reel for them. Submissions land in the Admin Panel for manual processing.

---

### 1. Navigation changes

- **Bottom nav** (`src/components/BottomNav.tsx`): replace the "Saved" tab with **"Reel"** (Film icon) pointing to `/reel/new`. Order stays: Discover · Reel · Post (+) · Activity · Profile.
- **Profile page** (`src/pages/ProfilePage.tsx`): add a row card "Saved posts" linking to `/saved` (the route stays).
- **App.tsx**: add route `/reel/new → CreateReelPage` (auth-gated). `/saved` route stays.

### 2. Create Reel page (`src/pages/CreateReelPage.tsx`)

Single-page wizard with a top progress bar (Step X of 6) and Back / Continue buttons. Feels like building a reel, not a blog: dark card UI, large fields, emoji labels, drag-to-reorder media tiles.

**Step 1 — Trip Basics** (required)
- Destination Name (e.g. "Vietnam", "Japan")
- Trip Title (e.g. "Vietnam Under ₹65k")
- Duration — chip presets *Weekend · 3 Days · 5 Days · 7 Days · 10 Days · 14 Days+* + custom "# of days" number input

**Step 2 — Upload Media** (min 5 images required)
- Tile grid uploader; user picks multiple photos and optional videos at once
- Live preview tiles, drag to reorder, tap × to remove
- After ≥1 file uploaded, each tile reveals a small caption input under it ("Add a short tag — e.g. Son Tra Marina")
- Validation: cannot continue until 5 images present

**Step 3 — Cost** (optional)
- Free text input with ₹ prefix ("e.g. ₹65,000")

**Step 4 — Travel Insights** (optional, all fields optional)
- Six labelled text areas with emoji headers, rendered as a 2-col chip grid that expands when tapped:
  - ⭐ Best Memory
  - 💎 Hidden Gem
  - 🎁 Most Unexpected
  - ✅ One Recommendation
  - 👎 One Thing Overrated
  - ❌ Biggest Mistake

**Step 5 — Detailed Itinerary** (optional, toggle OFF by default)
- Toggle: *Add Detailed Itinerary*
- When on: segmented control *Day-wise / Place-wise*
- Dynamic list of sections (Day 1, Day 2… or Da Nang, Hoi An…) — user adds/removes/renames each, with a short notes textarea per section

**Step 6 — Notes for Reel Editor** (optional)
- Single textarea: "Anything you'd like the editor to know?"
- Submit button: **"Send my reel request"** → creates submission, uploads media, shows full-screen confirmation ("We've got your trip! Our editors will craft your reel within 3-5 days.") with a "Back to Discover" button.

### 3. Database

New private storage bucket **`reel-submissions`** (admin-readable, owner write-only).

Two tables:

**`reel_submissions`**
- `user_id` (fk → auth.users)
- `destination`, `trip_title`, `duration_label`, `duration_days` (nullable int)
- `cost_text` (nullable)
- `insights` jsonb — `{best_memory, hidden_gem, unexpected, recommendation, overrated, mistake}`
- `itinerary_enabled` bool, `itinerary_kind` ('day'|'place'|null), `itinerary` jsonb (`[{label, notes}]`)
- `editor_notes`
- `status` text default `'pending'` (pending|in_progress|delivered)

**`reel_submission_media`**
- `submission_id` (fk, cascade), `storage_path`, `kind` ('image'|'video'), `caption` (nullable), `sort_order`

RLS:
- Users can `INSERT`/`SELECT` only their own rows.
- Admins (`has_role(uid,'admin')`) can `SELECT`/`UPDATE` all.
- GRANTs added per cloud rules.

Storage policies on `reel-submissions` bucket: owner can upload/read own folder (`{auth.uid()}/...`), admins can read all.

### 4. Admin review

Add a third **"Reels"** tab in `AdminPanelPage.tsx` listing submissions newest-first: trip title, user, duration, cost, status badge, "View details" expand showing media grid (signed URLs), captions, insights, itinerary, editor notes. Status dropdown to mark Pending → In Progress → Delivered.

### 5. Out of scope (per user)

- No user-facing "My Reels" list — just a thank-you screen after submit.
- No payment / pricing flow.
- No auto-generation; editors handle reels manually offline.

---

### Technical notes

- Reuse existing image upload helpers from `CreatePostPage` for compression + Supabase storage upload.
- Wizard state held in one local `useReducer` so Back/Continue preserves entries; no draft persistence on first pass.
- Form schema validated with `zod` per step before allowing Continue.
- Confirmation screen uses existing toast + a dedicated success card (no extra route).
- Bundle: `CreateReelPage` lazy-loaded the same way as other routes in `App.tsx`.

### Files touched / added

```text
Added:
  src/pages/CreateReelPage.tsx
  src/components/createreel/ReelStepBasics.tsx
  src/components/createreel/ReelStepMedia.tsx
  src/components/createreel/ReelStepCost.tsx
  src/components/createreel/ReelStepInsights.tsx
  src/components/createreel/ReelStepItinerary.tsx
  src/components/createreel/ReelStepNotes.tsx
  src/components/createreel/ReelSuccess.tsx
  src/components/admin/AdminReelsTab.tsx
Modified:
  src/components/BottomNav.tsx        (Saved → Reel)
  src/App.tsx                         (route + lazy import)
  src/pages/ProfilePage.tsx           (Saved posts link card)
  src/pages/AdminPanelPage.tsx        (third Reels tab)
DB:
  migration: tables, RLS, grants, bucket + storage policies
```
