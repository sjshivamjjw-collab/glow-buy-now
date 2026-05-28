# App icon & splash sources

These source images feed `@capacitor/assets`, which generates every required
iOS and Android icon/splash size automatically.

## Files

- `icon.png` — 1024×1024, opaque, no transparency, no rounded corners
  (iOS adds its own mask). This is also what Apple uses for the App Store
  marketing icon.
- `splash.png` — (optional) 2732×2732, single centred logo on solid
  background `#0a0a0a`. If absent, `@capacitor/assets` falls back to
  scaling `icon.png` on the configured splash background.

## Generate native assets

Run once on your Mac/Linux dev machine after `npx cap add ios` / `add android`:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --ios --android \
  --iconBackgroundColor '#0a0a0a' \
  --splashBackgroundColor '#0a0a0a'
```

Outputs land in `ios/App/App/Assets.xcassets/` and
`android/app/src/main/res/`. Commit those folders.
