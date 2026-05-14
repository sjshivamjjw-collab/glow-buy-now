## Goal
Replace the "Interests" question in the onboarding form with a "City" question.

## Changes

### 1. Database migration
- Add `city text` column to `public.profiles` (nullable).
- Leave existing `interested_categories` column untouched (no data loss; just stops being collected at onboarding).

### 2. `src/pages/OnboardingPage.tsx`
- Remove categories fetch, `selectedCategories` state, `toggleCategory`, and the Interests UI block.
- Add `city` state (text input).
- Render a new "City" field in the details step (text input with placeholder "e.g. Mumbai", same styling as other fields).
- On `handleFinish`, save `city` instead of `interested_categories`.
- Drop the now-unused `Heart` import.

## Input style
Free-text input (most flexible, no dropdown maintenance). If you'd prefer a dropdown of preset Indian cities, say the word and I'll switch it.