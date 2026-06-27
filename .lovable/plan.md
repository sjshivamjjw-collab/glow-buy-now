## Apple rejection: three-dots button unresponsive

### Diagnosis
The reviewer was on another user's profile (`/u/:userId` → `UserProfilePage`) and tapped the top-right three-dots button. That button uses Radix `DropdownMenu` with `DropdownMenuTrigger asChild`. In Capacitor's iOS WebView (especially iOS 26), Radix DropdownMenu triggers are known to occasionally swallow the first tap and not open — particularly when the trigger is `asChild` wrapping a custom `<button>`. On the rest of the app where the same "more options" UX exists (e.g. `PostDetailPage`), we already use a bottom `Sheet` instead, which works reliably on iOS.

### Fix
Convert the three-dots menu on `UserProfilePage` to the same controlled bottom-`Sheet` pattern used in `PostDetailPage`, so taps reliably open the menu on iOS.

### Changes

**`src/pages/UserProfilePage.tsx`**
- Replace the `DropdownMenu` / `DropdownMenuTrigger` / `DropdownMenuContent` block (around lines 156–173) with a controlled `Sheet` (`open`/`onOpenChange` state).
- Trigger: same 40×40 rounded button with `MoreHorizontal` icon, `type="button"`, `aria-label="More options"`.
- `SheetContent side="bottom" className="rounded-t-2xl pb-8"` containing either:
  - "Block user" (destructive styling, `Ban` icon) when not blocked, calling existing `handleBlock`
  - "Unblock user" (`ShieldOff` icon) when blocked, calling existing `handleUnblock`
- Each action closes the sheet (`setMoreOpen(false)`) before/after running.
- Remove the now-unused `DropdownMenu*` imports; add `Sheet`, `SheetContent`, `SheetTrigger` imports (already used in `PostDetailPage`).

### Why this resolves the Apple bug
- Bottom Sheet is the same primitive already shipping on `PostDetailPage` and verified working on iOS.
- Eliminates the Radix DropdownMenu trigger touch issue on iOS 26 WebView.
- No behavior change on web; menu options are identical.

### Out of scope
No other UI changes, no native config changes — only the trigger primitive on this one screen.