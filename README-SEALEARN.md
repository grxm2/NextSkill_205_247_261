# SeaLearn Home — Theme-gram

## Ocean Liquid Glass redesign (19 October 2026)

The Home at `/Home/Index` follows the supplied SeaLearn reference: an airy ocean-blue adventure scene, navy Thai headings, translucent navigation and shortcut panels, a blue primary action, and a pale course area. The existing locally hosted scene, illustrations, fonts, course data and learning tools are reused; no new runtime dependency is needed.

The CSS approximates Liquid Glass on the web using translucent fills, edge highlights and backdrop blur. Solid-fill fallbacks support browsers without blur and the reduced-transparency preference. All new styling is scoped to the Home-only `sea-glass-theme` class.

### Changed files

- `NextSkill_205_247_261/Views/Home/Index.cshtml`: selects the new Home skin instead of the previous dark game skin.
- `NextSkill_205_247_261/Views/Shared/_SeaLearnHome.cshtml`: simplifies the hero kicker, adds shortcut descriptions, and introduces the popular-course heading. The existing practice action, player preview, journey links and real course links remain.
- `NextSkill_205_247_261/wwwroot/css/sea-glass.css`: responsive ocean-glass presentation, readable text, precise-pointer hover effects, focus states, reduced-transparency and forced-color fallbacks.
- `NextSkill_205_247_261/wwwroot/js/sealearn.js`: frame-rate-independent pointer/scroll easing, geometry reads only when needed, compositor hint release after settling, hidden-tab suspension, and immediate in-flight cleanup when motion preferences change.
- `scripts/verify-sealearn.cjs`: adds unobstructed-control checks, small-screen static-scene checks, parallax settling, live reduced-motion changes and bounded waits synchronized with browser state.
- `README-SEALEARN.md`: current implementation and validation notes.

### Motion behavior

Only decorative background layers move. Learning text and controls remain stationary. Pointer and scroll input share a single scheduled animation frame, with an 85ms exponential smoothing time constant. Rendering stops when the scene settles, leaves the viewport, or the tab is hidden. Parallax is disabled below 1024px, on coarse pointers, and with `prefers-reduced-motion: reduce`; a visible pause control is also available. Existing Home reduced-motion rules remove positional hover effects and animated scrolling.

### MVC and preserved behavior

No controller, model, database, authentication, route, shared application layout or non-Home page was changed. `/` continues to open the existing account entry flow. `/Home/Courses?q=...` handles search; course cards open `/Home/Details/{id}`. Enrollment remains at `/Courses/Enrollment`.

The existing learning workspace still opens from journey and quest links, including direct URL fragments. Niko practice, retries, the three-scenario summary, keyboard focus return, the companion studio, league preview and locked journey states remain available. Progress/XP are still explicitly labeled as preview data; practice does not claim saved XP or rewards.

### Validation

- Release build passed: zero errors; eight pre-existing nullable-reference warnings in Course/Lesson models and catalog views.
- Project-level Release publish passed with zero errors.
- Edge/Playwright checks passed against the published Production app at widths 320, 375, 768, 1024, 1440 and 1920px: no horizontal overflow or broken landing images; visible primary/shortcut controls unobstructed.
- Pointer/scroll parallax, settling and compositor-hint release, pause/resume, static small-screen behavior, and live reduced-motion reset passed.
- Mobile menu/Escape, 17 unique navigation destinations, course search, details, enrollment, account pages, privacy, entry route, journey/lesson dialogs, deep links, companion studio, league and all three Niko scenarios passed.
- No browser JavaScript errors or failed HTTP responses occurred.
- Desktop, tablet and mobile screenshots were visually reviewed. Browser coverage is Edge; authenticated SQL-backed operations were not exercised with real credentials.

Repeat checks with .NET 10, Node.js, Playwright and Microsoft Edge installed:

```powershell
dotnet publish NextSkill_205_247_261/NextSkill_205_247_261.csproj -c Release -o artifacts/publish
# Start the published app in artifacts/publish:
dotnet NextSkill_205_247_261.dll --urls http://127.0.0.1:5190
# From the repository root in a second terminal:
node scripts/verify-sealearn.cjs
```

Set `SEALEARN_TEST_URL` to override the origin, or `SEALEARN_TEST_OUTPUT` to override the report directory. Reports and screenshots default to ignored `artifacts/sealearn/`.
