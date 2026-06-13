## Goal
Per Apple feedback, remove the "Popular conversations near you" nudge panel from the Discover page so it's no longer visible to any user. Keep the code intact (commented out) so we can re-enable it later without rebuilding.

## Change
**File:** `src/pages/DiscoverPage.tsx` (lines ~496–525)

Wrap the entire "Curiosity nudge rows" block (the red-tinted card containing the "Popular conversations near you" label and the `NUDGE_PROMPTS` chips) so it does not render. Approach: comment out the JSX block with a clear `{/* Hidden per Apple review feedback — keep for future re-enable */}` marker.

No other changes:
- `NUDGE_PROMPTS` constant stays in the file (unused but preserved for easy revert).
- Backend, data fetching, and all other Discover sections (search, feed, filters, location chip) are untouched.
- No styling/layout changes elsewhere — the panel sits inside the collapsible header area, so removing it just tightens that section vertically.

## Verification
Open `/` (Discover) in preview and confirm the red "Popular conversations near you" strip with chips like "+ Restaurant review" no longer appears, while the rest of the header (search, location, filters) and feed render normally.