Your PostHog project token and region are visible — US Cloud, key `phc_nBvNc9Ejf9FwgqhZHZaqQze5moVhBhWMLvwFvHqWarJb`.

## Change

Edit `src/lib/analytics.ts` (lines ~13–15):

```ts
const POSTHOG_KEY = 'phc_nBvNc9Ejf9FwgqhZHZaqQze5moVhBhWMLvwFvHqWarJb';
const POSTHOG_HOST = 'https://us.i.posthog.com';
```

That's the only code change. Host stays as US since your region is US Cloud.

## After it ships

1. Preview auto-reloads, PostHog initializes immediately.
2. Open the preview, click around a few pages.
3. In PostHog → **Activity** (left nav), you should see `$pageview` events within ~30 seconds, tagged `platform: web`, `app: ripple`.
4. Sign in once to confirm `signin_completed` fires and the user gets identified by their auth UID.

## Note on the key in source

The PostHog project token is a publishable client key (PostHog explicitly says "Safe to use in public apps" in your screenshot), so committing it to the bundle is the intended setup — no secrets tool needed.

Approve and I'll make the edit.