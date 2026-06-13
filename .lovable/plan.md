## Goal

Replace the plain red/gradient circle that shows when a user has no profile picture with a clean circular avatar that displays the first letter of their name (falling back to their username).

## What to build

1. **New reusable component `src/components/InitialAvatar.tsx`**
   - Props: `name?: string | null`, `username?: string | null`, `avatarUrl?: string | null`, `size?: number` (px), `className?: string`.
   - Behavior:
     - If `avatarUrl` is set, render an `<img>` (round, object-cover) — so callers can use this single component everywhere.
     - Otherwise render a round div with the first letter of `name` (trimmed). If no name, use the first letter of `username` (stripping any leading `@`). If neither exists, fall back to `?`.
     - Letter is uppercased, centered, bold, font-size scales with `size` (~45% of size).
   - Background: a deterministic color picked from a small palette (5–6 muted tones that fit the dark Ripple theme — slate, indigo, emerald, amber, rose, violet) based on a simple hash of `username || name`. This way the same user always gets the same color and feeds don't look monotone. Text color is white.
   - Border/ring: optional via `className` so existing ring styles (e.g. `ring-1 ring-[#2a2a2a]`) can still be applied by callers.

2. **Replace the five existing fallback spots** to render `InitialAvatar` (keeping the same size + ring classes):
   - `src/pages/DiscoverPage.tsx` line ~706 (5×5 in feed card — the one the user selected)
   - `src/pages/DiscoverPage.tsx` line ~566 (9×9 in search/people result)
   - `src/pages/DiscoverPage.tsx` line ~411 (9×9, already has a letter — switch for consistency)
   - `src/pages/PostDetailPage.tsx` line ~558 (10×10 post header)
   - `src/pages/PostDetailPage.tsx` line ~678 (8×8 comment author)
   - Also sweep `UserProfilePage.tsx`, `AdminPanelPage.tsx`, `BlockedAccountsPage.tsx`, `MentionSuggestions.tsx` and apply the same component to their `avatar_url ? <img/> : <fallback/>` blocks so the experience is consistent everywhere.

3. **No DB or schema changes.** Purely a presentation tweak.

## Out of scope

- Anonymous (Rippler) avatars keep using `PenguinAvatar`.
- No changes to the actual profile photo upload flow.
