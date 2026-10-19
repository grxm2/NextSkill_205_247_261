# SeaLearn Home on Theme-gram

The Home at `/Home/Index` is now a compact ocean-adventure game menu. It retains the supplied fantasy reference scene and adds a gold start button, beveled controls, a framed player HUD, transparent compass emblem, mini stage map, current practice quest, and dark-blue course selection panels. The actual Niko feedback practice is playable directly from the hero, with the original app routes and learning tools retained.

## Game-menu revision

- Added `wwwroot/css/sea-game.css` as an isolated Home-only game skin. Reduced-motion and opaque fallbacks remain supported.
- Added `wwwroot/images/sea-compass-emblem.webp`: a 256 x 256 transparent game emblem generated with the built-in image tool. Its prompt is in `docs/SEALEARN-ART.md`.
- Updated `Views/Home/Index.cshtml`, `_SeaLearnHome.cshtml`, and `_SeaCourseCard.cshtml` for the current-quest preview, player level/hearts, model-derived mini map, real course difficulty, and stage selection controls.
- Extended the existing `wwwroot/js/niko-coach.js` entry point to accept the hero's practice button. It uses the same practice state, retry feedback, three scenarios, summary, browser storage, and focus return. The label changes to continue or review when appropriate.
- Completed and locked stage states are derived from the existing model. Available mini-map nodes open the retained journey; locked stages are non-interactive. Practice does not award invented XP or consume hearts.
- Updated `scripts/verify-sealearn.cjs` to play all three scenarios, check incorrect-answer retry behavior, summary, focus return, updated start label, unchanged preview XP, and mini-map states.


## What changed in the reference revision

- Replaced the pale white landing treatment with an immersive blue ocean world.
- Generated a new hero scene and two course-thumbnail illustrations; optimized them as WebP. Removed the unused first-version `sea-world.webp` derivative. The original `learning-world.png` is unchanged.
- Moved the existing search form to the header without changing its endpoint or `q` field.
- Reduced repeated statistics, card descriptions, labels, and unsupported course-progress displays. The progress preview remains explicitly labeled.
- Preserved the original learning dashboard in a native expandable workspace. Learning-path and quest links open it automatically, including direct URL fragments. Niko, practice, studio, league, lesson previews, and existing rewards remain available.
- Added a visible primary main landmark and retained keyboard navigation, pause controls, mobile parallax reduction, and OS reduced motion.

## MVC and routes

The existing ASP.NET Core MVC (.NET 10) architecture, models, database, authentication middleware, shared layout, and route definitions remain intact. The first version's `HomeController` and `HomeDashboardViewModel` integration is retained. `/` still opens the existing account entry flow.

`/Home/Courses?q=...` handles search. Cards open `/Home/Details/{id}` for actual catalog courses. Enrollment uses `/Courses/Enrollment`; account links respect authenticated user/admin roles. No new routes were added.

## Files in this revision

Modified:
- `Views/Home/Index.cshtml`
- `Views/Shared/_SeaLearnHome.cshtml`
- `Views/Shared/_SeaCourseCard.cshtml`
- `wwwroot/css/sealearn.css`
- `wwwroot/js/sealearn.js`
- `scripts/verify-sealearn.cjs`
- `README-SEALEARN.md`

Added:
- `wwwroot/images/sea-adventure-world.webp` (266,296 bytes)
- `wwwroot/images/sea-coding-study.webp` (97,266 bytes)
- `wwwroot/images/sea-design-study.webp` (93,706 bytes)
- `docs/SEALEARN-ART.md` (image-generation provenance and prompts)

Removed:
- Unused `wwwroot/images/sea-world.webp`; the source original remains in the repository and the derivative remains in Git history.

## Validation (19 October 2026)

Build and Release publish passed with zero errors. Browser regression checks against the published Production application cover widths 320, 375, 768, 1024, 1440, and 1920 px, no horizontal overflow, loaded images, menu/Escape focus return, pointer parallax/pause/reduced motion, all 17 unique new navigation destinations, community disclosure, league/studio, expandable workspace, current journey/lesson, Niko practice, direct quest deep links, existing JavaScript course search, course details, enrollment, account pages, privacy, and application entry. The hero entry was also tested through an incorrect answer, all three correct answers, the completion summary, and keyboard focus return; preview XP remains unchanged. No runtime JavaScript errors or failed HTTP responses were observed.

Existing nullable-reference warnings remain in original Course/Lesson models and catalog views. NU1900 occurs when this environment cannot reach NuGet vulnerability metadata. Real authenticated SQL operations were not tested with credentials; no database or authentication code was changed.

To repeat UI checks, run the application locally with Node.js, Playwright and Microsoft Edge available. Set `SEALEARN_TEST_URL` to the local origin (default `http://127.0.0.1:5190`), then run `node scripts/verify-sealearn.cjs`. Reports/screenshots go to ignored `artifacts/sealearn/`, or `SEALEARN_TEST_OUTPUT` if set.

## Data limitations

The existing catalog is in-memory sample data. Persisted learner progress, per-course durations/progress, coins, discussion, and notifications do not have real data feeds in this repository. The Home page keeps explicit preview labeling, displays actual catalog titles and lesson counts, and avoids claiming saved rewards or completion.
