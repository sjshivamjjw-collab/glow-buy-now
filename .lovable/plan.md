# Pivot to Communities — Phase 1 Plan

Goal: turn LiveCart (live shopping) into a Whop-style creator communities platform. Keep auth, profiles, roles, notifications, payments plumbing. Hide all shopping UI. Add communities, tiers, memberships, Razorpay Subscriptions, lifecycle automation.

## What stays
- Phone OTP auth, profiles, user_roles (rename `seller` → `creator`), addresses, notifications, platform_settings, admin panel shell
- Razorpay secrets, Twilio secrets, 100ms secrets (left in place, just unused for now)
- Mobile-first `max-w-lg` shell, ₹ INR currency

## What gets hidden (not deleted yet — fast revert)
Routes/components removed from the router and nav, source files left in place but unreachable:
- `livestreams`, `products`, `product_variants`, `orders`, `order_items`, cart, checkout
- `GoLivePage`, `LivestreamRoom`, `ProductsPage`, `CreateProductPage`, `LiveCheckoutSheet`, `ShopPage`, `CategoriesPage`, `CategoryDetailPage`, `CheckoutPage`, `OrdersPage`, `OrderDetailPage`, `SellerDashboard`, `SellerApplicationPage`, `BrowsePage` (live-stream variant)

## What gets built

### 1. DB schema
- Rename enum value `app_role.seller` → `creator` (rewrite enum + remap rows + RLS policies)
- New tables (all RLS enabled):
  - `communities` (creator_id, slug, name, description, cover_url, intro_video_url, key_outcomes text[], social_links jsonb, is_published, timestamps)
  - `community_tiers` (community_id, name, description, kind: `free|paid_monthly|paid_one_time`, price_inr numeric null for free, razorpay_plan_id null until published, sort_order, is_active)
  - `memberships` (user_id, community_id, tier_id, status: `active|pending|expired|cancelled`, source: `free|razorpay_sub|razorpay_order`, razorpay_subscription_id, razorpay_payment_id, started_at, current_period_end, cancelled_at)
  - `creator_applications` (replaces `seller_applications` for the new flow — or repurpose existing table by renaming + dropping product fields). Decision: drop `seller_applications` & shopping tables in a later cleanup migration; for Phase 1 leave them dormant to avoid breaking remix history.
- Triggers: notification on membership activation / revocation; updated_at triggers
- RLS: communities readable by anyone when `is_published`, writable by owner creator. Tiers readable when parent published. Memberships readable by owner + community creator + admin.

### 2. Edge functions
- `create-community-tier-plan` — when a creator publishes a paid monthly tier, create a Razorpay Plan + persist `razorpay_plan_id`
- `create-membership-checkout` — for a tier:
  - free → insert membership directly
  - paid monthly → create Razorpay Subscription, return `subscription_id` + key for client checkout
  - paid one-time → create Razorpay Order, return order_id + key
- `verify-membership-payment` — verify Razorpay signature for either subscription auth or order payment, mark membership `active`, set `current_period_end`
- `razorpay-webhook` — handle `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`, `subscription.halted`, `payment.failed`. Flip membership status, write notifications. Validate `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET` (new secret needed)
- `subscription-lifecycle-cron` — daily: poll Razorpay for any membership where `current_period_end < now() + 3d`; fire upcoming-renewal notifications; revoke memberships where status no longer active

### 3. pg_cron
- Schedule `subscription-lifecycle-cron` once a day via `cron.schedule` + `net.http_post` (use insert tool, not migration, since URL+anon key are project-specific)

### 4. Frontend
- Router: replace HomeFeed/Browse with `DiscoverPage` (grid of published communities)
- New pages:
  - `DiscoverPage` — list/search communities
  - `CommunityDetailPage` — hero (cover, intro video, name, creator), key outcomes, social links, tier picker, Join/Subscribe CTA
  - `CreateCommunityPage` (creator only) — form for community + tiers, image/video upload to existing `product-images` bucket renamed to `community-media` (new bucket via migration)
  - `CreatorDashboard` — list own communities + member counts + revenue (stub)
  - `MyCommunitiesPage` — joined communities (replaces OrdersPage in nav)
  - `CommunityRoomPage` — placeholder ("Chat & events coming soon" — Phase 2)
- Reuse: `AuthContext`, `useNotifications`, `Footer`, `BottomNav` (relabeled tabs: Discover / Mine / Notifications / Profile)
- Become-creator flow: simple lightweight form (name, bio, optional links) → admin approval → grants `creator` role. Phase 1 can skip admin review and auto-approve to keep momentum; admin panel already exists for later gating.

### 5. Razorpay integration details
- Subscriptions: server creates Plan (`period: monthly`, `interval: 1`, `item.amount` in paise), then Subscription with `total_count: 12` (renews monthly for a year, auto-rolled), `customer_notify: 1`
- Client opens Razorpay Checkout with `subscription_id` for monthly, `order_id` for one-time
- On success → call `verify-membership-payment`
- Webhook is source of truth for ongoing status

### 6. Memory + secrets
- Update `mem://index.md` core to reflect: communities platform, role `creator`, new tables, hidden shopping
- New runtime secret needed: `RAZORPAY_WEBHOOK_SECRET` (will request via add_secret)

## Out of scope (Phase 2)
In-community chat, calendar/events, 1-1 scheduling, file uploads, premium-only channels, refunds UI, creator analytics, search beyond simple text match.

## Build order
1. Migration: enum rename + new tables + RLS + new storage bucket
2. Hide shopping routes from `App.tsx` + `BottomNav`
3. Edge functions (skeleton + deploy)
4. Request `RAZORPAY_WEBHOOK_SECRET`
5. Frontend pages: Discover → CommunityDetail → CreateCommunity → CreatorDashboard → MyCommunities
6. Razorpay checkout wiring + webhook test
7. pg_cron schedule
8. Update memory

## Open questions (please confirm before I start)
1. **Creator onboarding** — auto-approve anyone who fills the form, or keep admin review like the existing seller flow?
2. **Free-tier UX** — should joining a free tier require any verification (email, phone) beyond existing OTP login, or one-tap?
3. **Old shopping data** — keep tables in place (dormant) or drop them in this migration? Recommend keep for Phase 1.
4. **Hidden source files** — leave files on disk (dead code, easy revert) or delete now? Recommend leave.
