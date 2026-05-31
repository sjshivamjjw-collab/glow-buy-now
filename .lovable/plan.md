# Cleanup plan — remove legacy commerce & livestream

The app pivoted from LiveCart (live commerce) to Ripple (social). A lot of the old commerce/livestream code is still in the repo but no longer wired into the UX. This is exactly the kind of stale surface that gets flagged in Play Store review ("permissions/features that don't match the listing"). Below is what's still there and what I'd remove.

## What's actually unused in the app today

Confirmed not reachable from any user-facing screen:

- **Payments** — Razorpay/COD only live in `orders` table columns and old migrations. No checkout UI, no Razorpay SDK in `package.json`, no edge function. Safe to drop.
- **E-commerce pages** — no `/cart`, `/checkout`, `/products`, `/orders` routes exist. `src/pages/AddressesPage.tsx` is fully built but never registered in `App.tsx` → orphaned.
- **Livestreaming** — `supabase/functions/hms-token/` edge function exists, `@100mslive/hms-video-store` and `@100mslive/react-sdk` are in `package.json`, but **nothing in `src/` imports them**. No `/live`, no broadcaster page.
- **BottomNav / AppLayout** — already clean (Discover, Saved, Post, Activity, Profile). No legacy nav links.
- **Capacitor config** — already clean, no media-projection / camera-for-livestream entries.

## What's still partially wired

- **Admin panel** (`/admin`) actively queries `seller_applications` and `livestreams`, renders a "Streams" tab and a "Live Now" stat, and shows a "CREATOR" badge based on `seller_applications`. This is the only place legacy tables are still read.
- **Settings notifications copy** says *"Order updates, livestreams, follows"*.
- **AuthContext** uses `localStorage` key `livecart_auth` and defaults new users to role `'shopper'`.
- **`UserRole`** type still includes `'shopper'` and `'seller'`.

## Proposed changes

### 1. Frontend code to delete
- `src/pages/AddressesPage.tsx` (orphan)
- Any unused imports of `@100mslive/*` (none found, but verify)

### 2. Frontend code to edit
- `src/pages/AdminPanelPage.tsx` — remove Streams tab, "Live Now" stat, `livestreams` query, `seller_applications` query, `admin_revoke_seller` RPC call, and the "CREATOR" badge logic. Keep only Ripple-relevant admin (users, posts moderation, reports).
- `src/pages/SettingsPage.tsx` — change notification copy to *"Replies, follows, and likes"*.
- `src/contexts/AuthContext.tsx` — rename `STORAGE_KEY` from `livecart_auth` → `ripple_auth` (with a one-time migration that reads old key if new is empty), default role `'creator'` instead of `'shopper'`.
- `src/types/index.ts` — narrow `UserRole` to `'creator' | 'admin'`. Remove the "legacy types" comment.

### 3. Edge functions to delete
- `supabase/functions/hms-token/`

### 4. Dependencies to remove
- `@100mslive/hms-video-store`
- `@100mslive/react-sdk`

### 5. Database migration (drop legacy tables)
Single new migration that drops, in order:
`order_items`, `orders`, `addresses`, `product_variants`, `products`, `categories`, `seller_applications`, `livestreams`, `seller_ratings` (view), `platform_settings`, plus DB functions `admin_revoke_seller`, `get_seller_public_profile`, `get_seller_public_profiles`, and the `app_role` values `'shopper'`/`'seller'` from `user_roles` (delete rows, then drop enum values via recreate-enum dance).

After the migration, `src/integrations/supabase/types.ts` regenerates automatically and the legacy types disappear.

### 6. Docs to update
- `docs/PLAY_STORE_DATA_SAFETY.md` — drop livestream/broadcasting permission rows, remove `FOREGROUND_SERVICE_MEDIA_PROJECTION`, remove 100ms from processors list.
- Memory `mem://index.md` — remove livestream + commerce lines, remove `mem://features/livestreaming`, update tables list.

## What this gets you for Play Store

- No payment surfaces → no need for the "Financial features" declaration.
- No livestream/broadcasting → no `FOREGROUND_SERVICE_MEDIA_PROJECTION` declaration, simpler permission story.
- Data Safety form stays accurate (no orphan "Financial info" worry).
- Privacy Policy already updated; matches a leaner app.

## Things I want you to confirm before I touch anything

1. **Admin panel** — OK to drop the Streams tab and the seller-application approval flow entirely? Or do you want a "creator verification" flow that re-uses the same UI under a new table?
2. **`platform_settings` table** — anything in there you still use (feature flags, COD cap, etc.)? Safe to drop, or keep the table and just remove payment rows?
3. **Roles** — confirm only `creator` + `admin` going forward (no shopper, no seller).
4. **DB drops** — destructive and irreversible. Confirm you want the migration, or would you rather keep the tables empty/unused for now and only clean up code?

Once you answer those four, I'll execute the cleanup in one pass.
