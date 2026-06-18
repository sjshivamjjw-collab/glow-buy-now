## Goal
Make `/p/:id` (PostDetailPage) a light, Instagram-style surface — white background, dark text, soft gray borders — while the rest of the app stays on the current dark theme. Keep the red (`#ef4444`) as the only brand accent.

## Scope
Single file: `src/pages/PostDetailPage.tsx` (~870 lines). No other pages, no global theme/token changes, no logic changes.

## Color mapping (page-local, hardcoded swap)
| Current (dark) | New (light) | Used for |
| --- | --- | --- |
| `bg-[linear-gradient(...#0a0a0a...)]` page bg | `bg-white` | Page background |
| `bg-[#0a0a0a]` / `bg-[#0a0a0a]/80` | `bg-white` / `bg-white/85` | Sticky header, media frame, loading states |
| `bg-[#1a1a1a]` (icon buttons, chips) | `bg-[#f5f5f5]` | Round icon buttons, music chip |
| `border-[#2a2a2a]` / `/60` / `/40` | `border-[#e5e5e5]` (and `/60`) | Borders, avatar rings |
| `text-[#fafafa]` | `text-[#0a0a0a]` | Primary text, icons |
| `text-[#e5e5e5]` | `text-[#262626]` | Body copy, comment body |
| `text-[#a0a0a0]` | `text-[#737373]` | Meta text (timestamps, "Thoughts", anonymous label) |
| `ring-[#2a2a2a]` | `ring-[#e5e5e5]` | Avatar rings |
| `bg-[#ef4444]/10` + `border-[#ef4444]/30` | unchanged | Destructive / brand pills still read well on white |
| Music chip `bg-[#1a1a1a]/80` + `text-[#fafafa]/90` | `bg-[#f5f5f5]` + `text-[#0a0a0a]/90` | Music pill |
| Page count overlay `bg-[#0a0a0a]/85 text-[#fafafa]` | keep dark (`bg-black/70 text-white`) | Stays legible over media |

Heart / bookmark filled state, hashtags, and location text keep `#ef4444`.

## Header behavior
Sticky header switches to `bg-white/85 backdrop-blur-xl` with `border-b border-[#e5e5e5]`. Back / share / more buttons become light gray circles with dark icons. Edit / Hide / Delete admin pills keep the same structure with the light token swap (Delete keeps red).

## Media frame
The full-bleed media carousel background changes from `bg-[#0a0a0a]` to `bg-[#fafafa]` so letterboxed images sit on a soft off-white instead of pure black. Page-count overlay stays dark for contrast.

## Comments
Comment author name → dark, body → `#262626`, timestamps/labels → `#737373`. Reply input and existing buttons inside the page get the same swap.

## Out of scope
- Sheet/dropdown menus (Radix) already use semantic tokens (`bg-muted`, `text-destructive`) — leave untouched.
- BottomNav, AppLayout, feed, profile, and other pages — unchanged.
- No new design tokens or Tailwind config edits; this is a localized visual refactor.

## Verification
After edits, open `/p/88619d0e-…` in `browser--view_preview` and confirm: white background, dark text, red accents on like/save/hashtags, sticky header readable, media letterbox light, comments legible.
