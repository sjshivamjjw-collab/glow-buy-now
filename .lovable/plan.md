## Goal

On the post detail page only, lift the long-form text section out of the dark surface and present it as a premium "reading card" — warm off-white background with dark text — while leaving the discover feed, header, media area, action bar, comments, and bottom nav untouched.

## Scope (single file)

`src/pages/PostDetailPage.tsx` — the block currently around lines 712–728 that renders:
- `post.title` (h2)
- `post.body` via `renderRichText`
- `post.location`
- hashtags row

This block sits between the action bar (Like/Comment/Share/Save) and the "Thoughts" comments section.

Nothing else changes: header, author row, media carousel, action bar, comments list, comment composer, sticky bottom input — all remain on the existing dark gradient.

## Visual spec

Reading card:
- Background: `#FAFAF7` (warm off-white)
- Body text: `#1F1F1F`
- Secondary text (location, meta): `#555555`
- Hashtag accents: keep brand red `#ef4444` but at slightly deeper weight so it reads on light bg
- Rounded top corners only: `rounded-t-[22px]` (card visually "rises" out of the dark page); bottom stays square so it flows into comments seam — or fully rounded `rounded-[22px]` with margin. Recommend fully rounded with horizontal margin so it feels like a card, not a page takeover.
- Horizontal margin: `mx-3` (matches comments section) so text isn't edge-to-edge
- Padding: `p-5` (20px) → falls inside the 18–22px range
- Title: keep Outfit bold, size up slightly (`text-xl`), color `#1F1F1F`
- Body: `text-[15px] leading-[1.7]`, paragraph spacing handled via `[&_p]:mb-4` on the rich-text container (~16px)
- Subtle separator/shadow to lift card from dark bg: `shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]` and a hairline `border border-black/5`
- Location pin icon color shifts to `#555555`; hashtags become `text-[#dc2626]` for contrast on light

## Out of scope (explicitly do not touch)

- `DiscoverPage` and any feed cards
- Header, author row, media, action bar, comments, composer on PostDetailPage
- `renderRichText` itself (it already injects neutral inline styling that will inherit the new dark text color fine)
- Global tokens in `index.css` / `tailwind.config.ts` — this is a localized presentation change, so inline hex values (matching the rest of this file's existing convention of hex literals) are acceptable here. No new design tokens.

## Implementation outline

Replace the existing block:

```tsx
<div className="px-4 pt-4">
  {post.title && <h2 className="...text-[#fafafa]...">{post.title}</h2>}
  {post.body && <div className="...text-[#e5e5e5]...">{renderRichText(post.body)}</div>}
  {post.location && <p className="...text-[#ef4444]...">...{post.location}</p>}
  {hashtags row}
</div>
```

with a single off-white card wrapper containing the same four pieces, restyled per the spec above. No logic changes, no new components, no prop changes.

## Verification

- Open a post with long body → text appears on warm off-white card, dark page visible above/below
- Discover feed unchanged (dark)
- Header / action bar / comments still dark
- Hashtag and location colors legible on light bg
- Rich text formatting (bold/italic/line breaks) still renders correctly inside the card
