## Problem

In `MusicPicker`, the browser calls `https://itunes.apple.com/search?...` directly. On mobile (and on the custom domain `myripple.co.in`) this request can be blocked by the network, by Safari's strict cross-origin handling, or by the user's carrier/DNS, so the response comes back empty or throws — the UI then just renders "No tracks found" with no clue why.

## Fix

1. **New edge function `itunes-search`** (`supabase/functions/itunes-search/index.ts`)
   - Public (no JWT) — register `verify_jwt = false` in `supabase/config.toml`.
   - Accepts `?term=...&limit=30` query params.
   - Server-side `fetch` to `https://itunes.apple.com/search?media=music&entity=song&limit=...&term=...`.
   - Returns the filtered list (only tracks with a `previewUrl`) as JSON with proper CORS headers.
   - On failure, returns `{ error, results: [] }` with a 200 so the client can display a message.

2. **Update `src/components/MusicPicker.tsx`**
   - Replace the direct iTunes `fetch` with a call to the new edge function via the Supabase client (`supabase.functions.invoke('itunes-search', { ... })` or a plain fetch to the function URL).
   - Track an `error` state and render a small inline error message ("Couldn't load songs — tap to retry") instead of just "No tracks found" when the request actually failed.
   - Keep the existing debounce, chips, preview-play, and pick behavior unchanged.

3. **No DB / schema / auth changes.** Existing posts and the `music_*` fields on posts remain untouched.

## Why this works

The 30-second preview URLs returned by iTunes (`*.mzstatic.com`) are publicly playable from the browser; only the *search* endpoint is unreliable cross-origin on some mobile networks. Moving just the search server-side restores results everywhere while keeping playback client-side and free.