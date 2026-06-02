# App icon & splash sources

These source images feed `@capacitor/assets`, which generates every required
iOS and Android icon/splash size automatically.

## Files

- `icon.png` — 1024×1024, opaque, no transparency, no rounded corners
  (iOS adds its own mask). Brand red Ripple mark on solid white. Also used
  by Apple as the App Store marketing icon.
- `splash.png` — 1920×1920, single centred Ripple mark on solid white
  background `#ffffff`.

## Generate native assets

Run once on your Mac/Linux dev machine after `npx cap add ios` / `add android`:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --ios --android \
  --iconBackgroundColor '#ffffff' \
  --splashBackgroundColor '#ffffff'
```

Outputs land in `ios/App/App/Assets.xcassets/` and
`android/app/src/main/res/`. Commit those folders.
