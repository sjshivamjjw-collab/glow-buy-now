## Goal
Pivot the app from the communities model to a social media platform: users create posts (multi-media + text + location + hashtags), other users discover them in a 2-column grid sorted by trending (likes + recency), can like, comment, and follow each other.

## 1. Database (new tables)

- `posts` — id, user_id, title, body, location, hashtags text[], like_count int, comment_count int, created_at
- `post_media` — id, post_id, url, kind ('image'|'video'), sort_order
- `post_likes` — post_id, user_id (PK), created_at; trigger maintains posts.like_count
- `post_comments` — id, post_id, user_id, body, created_at; trigger maintains posts.comment_count
- `user_follows` — follower_id, following_id (PK), created_at (separate from the seller-centric `follows`)
- Storage bucket `post-media` (public) with RLS so users only write under their own uid folder
- RLS: posts readable by all authenticated, writable by owner. Same pattern for media/comments. Likes/follows: anyone can read counts, write own row.
- Trending score computed in a SQL function `get_trending_posts(_limit, _offset)` = `like_count / pow(hours_since + 2, 1.5)` style; returns posts ordered desc.

## 2. Drop communities

Drop tables in dependency order: community_chat_poll_votes, community_chat_messages, community_channels, community_event_rsvps, community_events, community_resources, community_admins, community_reviews, community_dm_messages, community_dm_threads, membership_disputes, memberships, payment_intents, community_tiers, communities. Drop related helper functions, triggers, storage buckets (community-media, community-resources, community-public). Drop unused legacy live-commerce tables we no longer need? Keep them for now — out of scope.

## 3. Frontend — remove

Delete: `src/pages/CommunityDetailPage`, `CommunityRoomPage`, `CreateCommunityPage`, `EditCommunityPage`, `CreatorDashboard`, `MyCommunitiesPage`, `SubscriptionsPage`, `pages/AdminPanelPage` community sections, `src/components/community/*`, `src/hooks/useCommunityMembership.ts`, related edge functions (`create-membership-checkout`, `verify-membership-payment`), Razorpay membership code.

Trim `AppLayout`, `BottomNav`, `App.tsx` routes, `types/index.ts` accordingly.

## 4. Frontend — add

- `src/pages/DiscoverPage.tsx` — rewrite as 2-column post grid (cover = first media), shows like count + author handle. Sorted by trending RPC. Search input filters by hashtag or text.
- `src/pages/PostDetailPage.tsx` (`/p/:id`) — media carousel, title/body, location, hashtags, like button, comments thread.
- `src/pages/CreatePostPage.tsx` (`/post/new`) — multi-file upload (image/video), title + body fields, location text, hashtag chips input.
- `src/pages/ProfilePage.tsx` — show the user's posts grid, follow/unfollow button on other users' profiles, follower/following counts. Add `/u/:userId` route for viewing other users.
- BottomNav tabs: Discover, Create (+), Notifications, Profile.

## 5. Notifications

Reuse `notifications` table. Triggers:
- new like on your post → notify owner
- new comment on your post → notify owner
- new follower → notify followed user

## 6. Out of scope (ask later)
- Video transcoding / thumbnails (we'll display via native `<video>` tag)
- Reposts / shares / saves
- DMs (removed with communities)
- Algorithmic ranking beyond simple trending formula
- Reporting/moderation tooling

## Approval
This is a big destructive change — all communities data will be deleted. Confirm to proceed and I'll start with the migration.
