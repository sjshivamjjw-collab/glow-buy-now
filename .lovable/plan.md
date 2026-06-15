Pick the **"Add HTML tag"** option in Pinterest — it's the simplest for a Lovable site (TXT record would require DNS changes; HTML file upload isn't supported on Lovable hosting).

## What I'll do

Add the Pinterest verification `<meta>` tag to the `<head>` of `index.html`, right next to the existing Google Search Console placeholder:

```html
<meta name="p:domain_verify" content="564713676f2cc920805bdf0bd3dd9e2e" />
```

That's the only code change.

## What you'll do after I push it

1. Approve the plan so I make the edit.
2. Click **Publish → Update** in Lovable so the new tag goes live on `myripple.co.in`.
3. Back in the Pinterest dialog, click **Continue** — Pinterest will fetch your homepage, find the tag, and verify the domain.

## Notes

- Safe to leave the tag in permanently; Pinterest re-checks it periodically.
- If Pinterest says "couldn't find tag", wait ~1 min after publish and retry (CDN cache).

Shall I go ahead and add it?