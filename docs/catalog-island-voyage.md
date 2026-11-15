# Catalog to learning-island voyage

The course catalog and learning islands now share the original island ocean panorama, water color, horizon, moving crests, sun and single Nimo mascot. The catalog keeps its heading and search controls in the sky, places the cave at the waterline, and reserves a clear horizontal sailing lane above the course grid. Available courses have a direct start/resume action alongside their existing details link. Category, query, sorting and pagination remain server-rendered GET requests.

## Shared ocean camera

- `Views/Shared/_LearningOceanWorld.cshtml` renders identical ocean layers on both pages. `wwwroot/css/shared-ocean.css` owns their final shared appearance.
- `island-water-motion.js` owns the document shoreline and viewport camera. Both documents synchronize ambient wave phase to the same clock. `underwater-journey.js` continues to attach the map waterline to the first island and reveal the existing deep-sea scenery on scroll.
- Before departure, the catalog fades its controls and smoothly returns the camera to the waterfront. Short screens receive a camera position that keeps the complete boat visible. Position settling is checked before sailing begins.
- The departure vessel only translates along X. There is no replacement water overlay, diagonal descent or scale change.
- The one-use arrival marker carries the viewport shoreline. Behind the clouds, the destination aligns its first surface island to that same screen waterline. The existing map boat enters from beyond the left edge at the same height and scale.
- Arrival lands at the surface harbor even when the saved course is further underwater. The current-lesson sidebar, saved progress and learning actions still use the server state.

## Selection and navigation

- `catalog.js` sends the existing antiforgery-protected `POST /Learning/SelectCourse`. A selection lock prevents duplicate requests.
- `course-island-voyage.js` temporarily moves the existing catalog boat into a fixed stage and sails it off the right edge. The shared cloud dialog covers navigation.
- Navigation waits for confirmed selection and a successful, same-origin island GET. Failed selection or page preparation restores the original boat, controls, focus and inert states.
- A short-lived, exact-URL session marker links the two MVC pages. On the island, `journey-clouds.js` aligns and reveals the page, then `archipelago.js` brings the existing map vessel in from beyond the left screen edge.
- The arrival does not change saved course progress or create a second `#nextskill-agent`. Normal map sailing retains the existing boat/submarine behavior.
- Reduced motion, paused motion, hidden tabs, skipping and interruption settle the finite animation. Back navigation restores the catalog and its current server progress.

The shared cloud markup is in `Views/Shared/_JourneyCloudTransition.cshtml`. Catalog layout refinements are isolated in `wwwroot/css/catalog-layout.css`, loaded after the existing catalog styles. The starting island, distant cave location and full Home-to-catalog sea journey are preserved.

## Verification

`scripts/verify-sea-continuity.cjs` passed at 1440×900, 390×844 and 720×450. It measures the rendered shoreline, boat height, width and X/Y motion in both documents. Waterline and boat-height differences stay below one CSS pixel; both legs move horizontally and use the same background/wave assets. It also checks the lane fits short screens, the singleton mascot, no horizontal overflow, and unchanged XP/completions after real selection. Screenshots, one-journey recordings and numerical measurements are in `artifacts/sea-continuity-qa/`.

`scripts/verify-course-island-voyage.cjs` passed against the local Development server and real LocalDB learning endpoints:

1. Actual selection, one POST on double activation, rightward sailing, cloud navigation and left-edge arrival.
2. Back navigation and keyboard resume, preserving XP, completions and active course.
3. Catalog layouts at 320, 390, 768, 1024 and 1440 pixels.
4. Failed selection restores the catalog without navigation.
5. Reduced motion completes without positional arrival animation.
6. Mobile selection and arrival without horizontal overflow or duplicate mascot.
7. Failed island preparation after confirmed selection restores the catalog ready to retry.

Tests use fresh signed Development preview identities. They do not submit lesson answers or award XP. They do create normal course-selection progress for those isolated previews.

The existing `scripts/verify-catalog-voyage.cjs` also passed all ten groups, including the original full-distance journey, real search/filter/sort/pagination/details behavior, keyboard controls, retry, reduced motion, pause and dark mode. Both browser runs reported zero uncaught JavaScript errors.

Final `dotnet build --no-restore --output artifacts/sea-continuity-final-build` passed with zero warnings and errors.

Reports and screenshots: `artifacts/course-island-qa/` and `artifacts/catalog-voyage-qa/`.
