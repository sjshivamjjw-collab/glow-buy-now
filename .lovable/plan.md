## Apple App Review fixes (Guideline 4 + 5.1.1(v))

Two issues to address from the rejection.

### 1. Guideline 4 — iPad layout looks crowded / unoptimized

The app is built mobile-first with `max-w-lg mx-auto`, so on iPad it renders as a narrow phone-width column with huge empty black margins (visible in Apple's iPad screenshot). The cleanest, lowest-risk fix accepted by Apple is to mark the app **iPhone-only**. The product is a vertical, single-column social feed designed for phones — there is no real iPad UX, and trying to redesign every page for iPad in this submission cycle would be risky and out of scope.

Change in `ios/App/App.xcodeproj/project.pbxproj`:
- `TARGETED_DEVICE_FAMILY = "1,2"` → `TARGETED_DEVICE_FAMILY = "1"` (both Debug and Release configs, lines 318 & 340)

This makes the binary iPhone-only. iPad reviewers will then test on iPhone 17 Pro Max only, and Guideline 4 (iPad layout) no longer applies. The app still runs on iPad in iPhone-compatibility mode for users who want it.

After this change you'll need to run `npx cap sync ios` locally before re-submitting.

### 2. Guideline 5.1.1(v) — Account deletion appears to require email

Apple wrote: *"The app requires users to email to complete account deletion."* The in-app delete button does exist on `/delete-account`, but the page presents the **email option (Option 2)** with equal weight and visual prominence right next to Option 1, so the reviewer concluded email was required. Fix by making in-app deletion the only documented path and removing email as a deletion mechanism.

Edits in `src/pages/DeleteAccountPage.tsx`:
- **Remove** the "Option 2 — Email request" card entirely (lines 64–77).
- **Remove** the "Option 1 —" label wording so the in-app card just reads "Delete in the app" with instructions to tap the red button below.
- **Move** the red "Permanently delete my account" button **above** the explanatory sections (right after the intro + Timeline card) so it's the first actionable element on the page, not buried at the bottom. Keep the confirmation modal as-is.
- **Show the delete button for signed-out users too**, but on tap route them to `/auth` with a return path back to `/delete-account` — so a reviewer who isn't signed in still sees a clear in-app deletion entry point and isn't pushed to email.
- **Soften the support footer**: keep the support email block but rephrase to "Need help with something else? Email …" so email is clearly support, not the deletion mechanism.
- Keep `delete-user` edge function and `handleDelete` logic unchanged.

### Out of scope
- No changes to the delete-user edge function, auth flow, or any other page.
- No iPad-specific responsive redesign (deferred — iPhone-only ships faster).
- No copy changes to Privacy / Terms.

### Follow-up after merge
1. Bump iOS build number in Xcode.
2. Run `npx cap sync ios` and rebuild.
3. Re-submit to App Review noting: "App is now iPhone-only; account deletion is now self-serve in-app with no email step required."