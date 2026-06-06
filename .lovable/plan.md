## Goal

Make the Travel Diaries structure pills truly toggle:
- Tap once → insert the section into the body
- Tap again (deselect) → remove that same section from the body
- Tap a third time → re-insert it

## How it works

Each pill's inserted snippet gets wrapped in a marker element the editor can later locate and remove on its own — without touching anything the user wrote outside it.

### 1. Tag the inserted snippet

In `TravelStructureHelper.tsx`, change `buildPillSnippet` to wrap the heading + two bullets in a block that carries the pill key:

```html
<div data-pill="cost">
  <strong>💰 Cost Breakdown</strong><br>• <br>•&nbsp;
</div>
```

The `data-pill` attribute is the only thing we need later — the inner content stays free-form so users can keep editing it.

### 2. Expose a "remove by pill" method on the editor

In `src/components/RichTextEditor.tsx`, add a second imperative method alongside `insertHtml`:

```ts
removeByPill: (pillKey: string) => void;
```

Implementation:
- Find `el.querySelector('[data-pill="<key>"]')`
- If present, remove the node (and a trailing empty `<br>` if one is left behind so we don't accumulate blank lines)
- Push the updated `el.innerHTML` through the same `onChange` pipeline `insertHtml` already uses

### 3. Toggle behavior in the helper

In `TravelStructureHelper.tsx`:
- Add `onRemove: (pill) => void` prop next to `onInsert`
- When a pill is tapped:
  - If not in `used` → call `onInsert`, add to `used`
  - If already in `used` → call `onRemove`, remove from `used`
- The active red styling stays as the visual indicator of "currently inserted"

### 4. Wire it up in both pages

`CreatePostPage.tsx` and `EditPostPage.tsx` already hold the `bodyEditorRef`. Add an `onRemove` handler next to the existing `onInsert`:

```ts
onRemove={(pill) => bodyEditorRef.current?.removeByPill(pill.key)}
```

## Trade-off to call out

If a user edits text *inside* a pill section and then deselects the pill, that edited text goes away with the section. This matches what "deselect = remove" intuitively means, and the user can paste anything they want to keep back in before deselecting. No confirmation dialog — keep the flow lightweight as the original spec required.

## Files touched

- `src/components/TravelStructureHelper.tsx` — wrap snippet in `<div data-pill>`, add toggle logic, add `onRemove` prop
- `src/components/RichTextEditor.tsx` — expose `removeByPill` on the handle
- `src/pages/CreatePostPage.tsx` — pass `onRemove`
- `src/pages/EditPostPage.tsx` — pass `onRemove`

No DB, no schema, no other components affected. Existing posts (which don't have the `data-pill` wrapper) are unaffected.
