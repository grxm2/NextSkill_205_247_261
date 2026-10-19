# SeaLearn Home on Theme-gram

The Home page at `/Home/Index` now opens with a bright ocean adventure, a floating frosted-glass navigation bar, a preview progress panel, five shortcuts, a searchable course collection, and an underwater adventure banner. The original journey, quests, lesson previews, league, companion studio, Niko practice, and account links remain available below the new introduction.

## Architecture and files

This is the existing ASP.NET Core MVC application targeting .NET 10. No framework, database schema, authentication middleware, route definition, or shared layout was replaced.

Modified:
- `Controllers/HomeController.cs`: populates the Home model with the authenticated display name (or a guest label) and four courses from the existing catalog.
- `Models/HomeDashboardViewModel.cs`: adds course data and explicitly preview-only statistics derived from the existing journey.
- `Views/Home/Index.cshtml`: loads the new partial and Home-only assets while retaining the original dashboard and dialogs.

Added:
- `Views/Shared/_SeaLearnHome.cshtml`: navigation, hero, progress, shortcuts, search, course grid, adventure banner, and community availability notice.
- `Views/Shared/_SeaCourseCard.cshtml`: reusable card linked to the existing course details action.
- `wwwroot/css/sealearn.css`: isolated ocean palette, native web glass approximation, responsive grids, solid-surface fallback, focus states, and reduced-motion support.
- `wwwroot/js/sealearn.js`: mobile menu and bounded pointer/scroll parallax, with frame scheduling, visibility gating, pause controls, cleanup, and back-forward cache restoration.
- `wwwroot/images/sea-world.webp`: optimized derivative of the existing `learning-world.png` (294,218 bytes).
- `wwwroot/images/sea-underwater.webp`: generated underwater fantasy banner (158,440 bytes).
- `scripts/verify-sealearn.cjs`: functional browser regression checks.

## Routes and controls

No routes were added or changed. The application entry `/` still opens the account login flow. Course links use `/Home/Details/{id}` for the actual selected catalog entries. Search uses the existing `/Home/Courses?q=...` action. Enrollment uses `/Courses/Enrollment`; account links respect authentication and admin roles. Learning-path and quest links target the retained sections. Community clearly states that discussion is not yet available and offers the existing preview league instead.

The source specification was recovered from the prior conversation's `Pasted text.txt`. No separate reference screenshot was returned with that conversation. The existing repository landscape supplied the hero artwork. Its scene is complemented by independent cloud and mist layers; separate castle/island cutouts were not available.

## Validation (19 October 2026)

- Baseline and updated `dotnet build`: passed, zero errors.
- `dotnet publish -c Release`: passed; published application also verified in Production.
- JavaScript syntax checks: passed.
- Browser layouts: 320, 375, 768, 1024, 1440, 1920 px, with no document horizontal overflow.
- All 14 unique new navigation destinations and fragment targets: passed.
- Course-detail routes 1, 5, 6, 9, enrollment, login, registration, privacy, and application entry: HTTP 200.
- Mobile menu, Escape and focus return: passed.
- Pointer parallax, pause toggle, OS reduced motion: passed.
- League, companion studio, current journey step, lesson dialog, and Niko practice: passed.
- Search for JavaScript through the existing controller: passed.
- Browser runtime errors and failed HTTP responses during these checks: none.

Existing warnings remain: eight nullable-reference warnings in the original Course/Lesson models and catalog views, plus NU1900 when this environment cannot reach NuGet vulnerability metadata. Authenticated database operations were not tested with real credentials; no database or authentication code was changed.

## Repeating the UI checks

Run the application in Development, or run its published Production output. A non-published Production `dotnet run --no-build` did not serve the framework's compressed assets correctly in this environment; the published output was checked separately and works.

The script requires Node.js, Playwright, and Microsoft Edge. Set `SEALEARN_TEST_URL` to the local server origin (default `http://127.0.0.1:5190`) and run `node scripts/verify-sealearn.cjs`. Screenshots and a JSON report are written under the ignored `artifacts/sealearn/` directory, or the directory named by `SEALEARN_TEST_OUTPUT`.

## Data limitations

The repository catalog is in-memory sample data. There is no persisted learning-progress service, per-course duration/progress feed, coin service, community discussion route, or notification feed. The UI labels preview statistics and unavailable data explicitly. It does not claim that XP, rewards, or course completion have been saved. Course recommendations preserve real catalog titles instead of inventing unavailable Python/3D/game-design detail pages. Session-backed user/admin sign-in behavior remains with the original system.
