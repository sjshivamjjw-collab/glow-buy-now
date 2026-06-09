## Before handing back your friend's Mac — Ripple iOS checklist

You've already submitted Build 3 to App Review. Goal now: make sure you can ship updates, respond to Apple, and rebuild from a fresh Mac later without losing anything that lives only on that laptop.

---

### 1. Push the `ios/` folder to GitHub (most important)

When you ran `npx cap add ios` on his Mac, it created an `/ios` folder with the Xcode project, signing config, `Info.plist`, `PrivacyInfo.xcprivacy`, generated icons/splash, and `Podfile.lock`. If this isn't committed to your repo, a new Mac has to redo all of section 1–2 of `docs/APP_STORE_SUBMISSION.md` from scratch.

On his Mac, in the project folder:
- Confirm `/ios` is committed and pushed to GitHub (check on github.com).
- Same for `/resources/icon.png`, `/resources/splash.png` if you generated/edited them there.
- Same for any screenshots you took for the App Store listing.

If `/ios` is in `.gitignore`, remove that line, commit, and push.

---

### 2. Export the iOS Distribution signing assets

This is the thing people forget and regret. Without these, a new Mac cannot upload a build that App Store Connect will accept as the same app — even though the bundle ID is the same.

In **Xcode → Settings → Accounts → your Apple ID → Manage Certificates**:
- Right-click your **Apple Distribution** certificate → **Export Certificate** → save as `Ripple-Distribution.p12` with a password you'll remember.

In **Keychain Access** (Login keychain → My Certificates):
- Find the same Apple Distribution cert, expand it, select **both the cert and its private key**, right-click → Export → `.p12`.

Also download from https://developer.apple.com/account:
- The **Distribution certificate** (`.cer`)
- The **App Store provisioning profile** for `in.myripple.app` (`.mobileprovision`)

Store all of these somewhere safe (1Password / iCloud Drive / encrypted USB) — NOT in the GitHub repo.

---

### 3. Save the App Store Connect API key (optional but recommended)

App Store Connect → Users and Access → Integrations → **App Store Connect API** → generate a key for yourself. Download the `.p8` file (Apple only lets you download it once) and note the **Key ID** and **Issuer ID**.

This lets any future Mac (or a CI service) upload builds without re-doing certificate dance.

---

### 4. Set up Capgo so you can ship JS updates without a Mac

Your app already has `@capgo/capacitor-updater` wired in (`capacitor.config.ts` + `src/main.tsx`). Once Build 3 is approved, you can push UI/logic fixes to installed apps from any computer — Mac not required.

On his Mac while you still have it, do the one-time setup from `docs/APP_STORE_SUBMISSION.md` section 9:
- Sign up at https://capgo.app
- `npx @capgo/cli@latest login` (paste your Capgo API key)
- `npx @capgo/cli@latest app add`
- `npx @capgo/cli@latest bundle upload --channel production` (ship the current build as the baseline)

After this, any future change merged in Lovable can be pushed from your Windows/Linux machine with just `npm run build && npx @capgo/cli@latest bundle upload --channel production`. No Xcode needed.

What still needs a Mac later: new Capacitor plugins, icon/splash/permission changes, Capacitor core upgrades, version bumps for the App Store. Everything else = Capgo.

---

### 5. Things to check are saved off the Mac

- [ ] `/ios` folder committed and pushed
- [ ] `Ripple-Distribution.p12` exported with password (saved off-Mac)
- [ ] Private key `.p12` from Keychain exported (saved off-Mac)
- [ ] App Store Connect API key `.p8` downloaded (optional)
- [ ] App Store screenshots saved somewhere outside the Mac
- [ ] Any review-reply drafts / Apple correspondence copied
- [ ] You are logged into App Store Connect from your own browser (not just his) — confirm at https://appstoreconnect.apple.com

---

### 6. Clean up his Mac

- Xcode → Settings → Accounts → remove your Apple ID
- Keychain Access → delete your Apple Distribution cert + private key after you've confirmed the `.p12` export opens correctly on another machine
- Sign out of App Store Connect / developer.apple.com in his browser
- Delete the local repo clone if it has `.env` or any secrets

---

### What you'll be able to do without his Mac

- ✅ Reply to App Review messages (web only)
- ✅ Ship JS/React/CSS fixes via Capgo OTA to all installed apps
- ✅ Manage the App Store listing, screenshots, pricing, availability
- ✅ Monitor crashes / analytics

### What still needs a Mac

- ❌ Uploading a new native build (Build 4, 5, …)
- ❌ Adding a new Capacitor plugin or permission
- ❌ Updating app icon / splash / version number for the store

For those, either borrow his Mac again briefly, rent a cloud Mac (MacInCloud, MacStadium ~$30/mo), or set up GitHub Actions with the certs you exported in step 2 to build on a hosted macOS runner.
