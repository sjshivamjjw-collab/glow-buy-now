## Problem
When a signed-out visitor lands on Discover, the header reads "Welcome Back, there" because `firstName` falls back to the placeholder `'there'`.

## Change
Edit `src/pages/DiscoverPage.tsx` only (greeting block at lines ~405–425).

For anonymous users (`!isAuthenticated`), render a different greeting:
- Keep the same avatar slot (uses `InitialAvatar` with name="R" so it shows the Ripple initial).
- Small label: `Welcome to`
- Title: `Ripple`
- Inline `Sign in` button (text/link styled in red `#dc2626`) that calls `requireAuth()` from `useAuthGate()` — same modal used elsewhere for gated actions.

For signed-in users, behavior is unchanged ("Welcome Back, {firstName}").

## Technical notes
- Pull `isAuthenticated` from `useAuth()` (already imported in this file).
- Import `useAuthGate` and call `requireAuth('sign in')` on click.
- No other files touched; no business-logic, routing, or backend changes.