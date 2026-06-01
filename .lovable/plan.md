# Goal

Let users on the App Store / Play Store automatically receive your changes (UI, logic, copy, bug fixes) without having to update the app from the store.

# What can and can't ship over the air

Apple and Google explicitly **allow** updating the JavaScript/HTML/CSS bundle of a hybrid app at runtime, as long as you don't change the app's core purpose. They do **not** allow updating native code OTA.

**Ships OTA (no store update needed):**
- Every React page, component, style, copy change
- Most bug fixes and feature additions
- New Supabase queries, edge function calls, AI prompts
- New routes, new screens, new logic

**Still requires a store resubmission:**
- App icon, splash screen, app name
- New Capacitor plugins (camera, push notifications, geolocation, etc.) or plugin upgrades
- iOS/Android permission strings (`Info.plist`, `AndroidManifest.xml`)
- Capacitor / native dependency upgrades
- App Store metadata, screenshots, age rating

Plan: ~95% of your day-to-day Ripple changes will ship OTA; only native-capability changes need a new build.

# Approach: Capgo Live Updates

Capgo is the standard open-source OTA solution for Capacitor (the same model Ionic Appflow uses, but free / self-serve). It ships a new JS bundle to installed apps on launch.

How it works:
1. You build your web bundle (`npm run build`) as today.
2. A one-line command (`npx @capgo/cli@latest bundle upload`) pushes that bundle to Capgo's CDN.
3. The installed app checks Capgo on launch, downloads the new bundle in the background, and applies it on the next cold start.
4. The store-submitted native shell stays unchanged.

# Implementation steps

### 1. Install the plugin
- Add `@capgo/capacitor-updater` to `package.json`.
- Add `@capgo/cli` as a dev dependency for the upload command.

### 2. Initialize the updater on app boot
- In `src/main.tsx`, call `CapacitorUpdater.notifyAppReady()` once the React tree mounts. This tells the native shell "the new bundle booted successfully, keep it" — otherwise it rolls back to the previous bundle (built-in safety net).

### 3. Configure Capgo in `capacitor.config.ts`
- Add a `CapacitorUpdater` plugin block with:
  - `autoUpdate: true`
  - `directUpdate: true` (apply on next launch automatically)
  - Channel name (`production`)
- Keep your existing `server.url` for hot-reload during Lovable development; it's ignored in production builds.

### 4. Create a Capgo account + app
- One-time: sign up at capgo.app, run `npx @capgo/cli@latest login`, then `npx @capgo/cli@latest app add app.lovable.74c9b69bcd6d42fbb279125200f8f6c7`. Free tier covers small apps; paid tier kicks in at scale.

### 5. Ship-an-update workflow (the part you'll use weekly)
After any change you make in Lovable:
```
git pull
npm install
npm run build
npx @capgo/cli@latest bundle upload --channel production
```
Within minutes, every installed app picks up the new bundle on next launch.

### 6. Safety rails (built into Capgo, no extra code)
- **Auto-rollback**: if `notifyAppReady()` doesn't fire within 10s (e.g. the new bundle crashes), the app reverts to the previous working bundle.
- **Channels**: use a `staging` channel for yourself before promoting to `production`.
- **Version pinning**: each bundle is tied to a native app version, so you don't accidentally ship a bundle that needs a plugin the installed shell doesn't have.

### 7. Update `docs/APP_STORE_SUBMISSION.md`
- Add a "Shipping updates after launch" section documenting the `bundle upload` workflow and listing what still requires a store resubmission (icon, plugins, permissions).

# What you'll do once vs. every release

**Once, before submitting to stores:**
- Install the plugin, add the config block, set up Capgo account, push the first bundle.
- Submit the app to App Store + Play Store with the OTA-enabled native shell.

**Every release after that:**
- Make changes in Lovable → `git pull && npm run build && capgo bundle upload`. Done. No Xcode, no Android Studio, no review queue.

**Only when you touch native (rare):**
- e.g. adding push notifications, camera, a new permission → rebuild with `npx cap sync`, submit to stores, wait for review.

# Alternative considered: pointing `server.url` at the hosted web app

The simplest OTA-ish trick is to leave `capacitor.config.ts`'s `server.url` pointing at `https://myripple.co.in` in production — the app then loads your live website each launch. **Not recommended** because:
- Apple frequently rejects "web wrapper" apps under guideline 4.2 (Minimum Functionality).
- Offline experience breaks completely.
- No rollback safety; a broken deploy bricks every installed app.
Capgo avoids all three.

# Technical notes

- `notifyAppReady()` must be called *after* React mounts, not in module scope, or fast crashes won't trigger rollback.
- Capgo bundles are encrypted in transit; you can optionally enable end-to-end encryption with a key pair if you want bundles to be unreadable on the CDN.
- The first store-submitted build must already contain `@capgo/capacitor-updater` — you can't add OTA after the fact without one more store release.
- Bundle size limit on the free tier is generous (~20MB gzipped); Ripple's bundle is well under that.

# Open questions before I start

1. Confirm you want **Capgo** (free tier, open source) vs. **Ionic Appflow** (paid, more enterprise tooling). Capgo is the right default for Ripple.
2. Are you OK with me adding `@capgo/capacitor-updater` to the first store build now, before you submit? It must be present in the first binary for OTA to work later.
