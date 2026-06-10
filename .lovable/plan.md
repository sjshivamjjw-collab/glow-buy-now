## Save iOS build memory

Add a Core rule to `mem://index.md` so future sessions never reference CocoaPods or `.xcworkspace` for this project.

### Memory to add (Core section)
```
iOS build uses Swift Package Manager only — NO CocoaPods. Open `ios/App/App.xcodeproj` (never `.xcworkspace`). SPM resolves dependencies automatically on open.
```

### Files changed
- `mem://index.md` — append one line under Core.

That's the entire change. Approve and I'll save it.