# 002 — Connect every course page to the existing Learning flow

- **Status:** IMPLEMENTED — verification scope and optional follow-up in IMPLEMENTATION.md
- **Commit:** 98f2107
- **Target branch:** gram-test; revalidate against current HEAD after plan 000
- **Severity:** HIGH
- **Category:** Navigation and state consistency
- **Estimated scope:** Home course actions/views, catalog.js, course ViewModels; preserve Learning service contract
- **Root:** application directory `NextSkill_205_247_261/` under the repository containing the `.slnx`; paths below are relative to it

## Problem

`Views/Home/Details.cshtml:50` renders:

```html
<button class="btn btn-sm btn-outline-success mark-complete" data-lesson-id="@lesson.Id">Mark as complete</button>
```

`wwwroot/js/catalog.js:4` defines a second state source:

```js
const STORAGE_KEY = 'courseProgress_v1';
```

The Start learning handler at `catalog.js:127–138` marks local started state and scrolls to the list; completion at `:143–151` writes browser state. The modern Learning flow grades answers and awards server-side. Courses (`:123`) and Details (`:68`) still load the old script; these are live routes.

`_JourneyNav.cshtml:7` calls the chooser “แผนที่การเรียน” through Home#journey-world. `ocean-world.js` deliberately intercepts this hash. It is not a broken link under normal JavaScript; the name/destination and fallback need clarity.

## Target

One meaning of course progress across Courses, Details, picker and Island: the existing Learning state. Preserve authenticated account state and isolated Development guest preview. Browser preferences can stay local; browser-only completion must not masquerade as saved progress.

Catalog is discoverable through a normal MVC GET. Details describes the selected course with a clear เริ่มเรียน / เรียนต่อ / ทบทวน or เร็ว ๆ นี้ action. Selection and result writes continue to use current antiforgery-protected Learning actions.

## Repo conventions to follow

Use `Controllers/HomeController.cs` Courses/Details actions and existing `CourseCatalog`, `LearningCatalog`, `LearningStore`. `LearningController` already owns SelectCourse, State, Lesson, Checkpoint and CompleteLesson. Map by stable course/lesson IDs, never by display title. Verify catalog entries without curricula remain upcoming.

## Steps

1. Trace route reachability from account and public pages. Agree canonical destinations for คอร์สเรียน, เกาะของฉัน and แผนที่การเรียน. Use an actual link target plus progressive enhancement for dialog selection.
2. Add strongly typed Courses/Details ViewModels for public metadata and curriculum availability without requiring SQL on public GETs. Hydrate optional progress through existing `/Learning/State` when eligible, with a visible unavailable state. Keep server work out of Razor and grading/progress rules out of JS; do not duplicate LearningController's guest/account identity resolver in HomeController.
3. Replace Details' manual completion buttons with status labels and valid start/resume/review actions. Do not mark completion by navigation or a confirmation click.
4. Remove `courseProgress_v1` as the progress source for these live pages. Do not silently import its ungraded completions into account XP/achievements. Preserve unrelated browser preferences.
5. Connect start/resume to the current SelectCourse → Island flow; maintain ReturnUrl and existing course state when switching. Keep normal links usable if scene animation is unavailable.
6. Resolve the older `/Courses/Enrollment` route with a documented course-ID mapping verified against its model and existing links. Prefer an MVC action-level compatibility redirect to that course's Details page, preserving ReturnUrl where relevant and without changing the active course. Do not load the old `_HomeLayout` after redirect. If no equivalent curriculum can be established, show accurate legacy-course availability instead of silently substituting a startable course. Do not imply its hard-coded 16 lessons are the four-lesson Learning curriculum.
7. Apply plan 001 components to course pages and accurate guest/account/upcoming labels.

## Second-pass execution refinements

- **No-JavaScript boundary:** public GET catalog/details remain discoverable. Actual selection/grading retains the existing JS-enhanced MVC flow. `LearningController.SelectCourse` is a JSON `[FromBody]` POST; an ordinary form must not post URL-encoded data to it. Show a clear `<noscript>` explanation for interactive lessons. GSAP-unavailable is different from JavaScript-unavailable: the static scene must still support course selection when ordinary JS works. Do not mutate selection through a GET or add a new form adapter implicitly.
- **Shared identity:** progress hydration reuses existing Learning endpoints and their cookie/antiforgery/guest rules. An account/database error must not block public course metadata or be replaced with a misleading 0% saved state. Use “ยังโหลดความก้าวหน้าไม่ได้” plus retry.
- **Stable mapping:** catalog IDs with no curriculum stay upcoming; unknown IDs return 404. Keep separate public metadata and actual Learning curriculum lesson IDs/totals. For a curriculum-backed course, details/progress use its Learning totals; do not pair catalog lesson IDs with Learning answer arrays.
- **Ownership:** this plan owns Courses/Details/Enrollment view changes. It consumes plan 001 components; merge its course adapter in `smart-journey.js` before plan 006 edits learning recovery. No duplicate local completion store or guest identity code.
- **Acceptance:** `CanStart=false`, locked lessons and retakes remain gated by current server rules. New buttons, deep links and next-step affordances cannot bypass `RequireAccess`. Manual browser completion data is never converted to server awards.

## Boundaries

Do not change grading, XP totals, authentication or database schema. Do not revive historical `_SeaLearnHome`/demo island flows. Do not load `_SmartJourneyLayout` on every page without first separating its learning-specific DOM/script requirements.

## Verification

- **Mechanical:** build solution during implementation; test course/state routes with existing antiforgery and guest/account rules.
- **Feel check:** discover → details → start → lesson → complete → return to catalog shows matching progress. Change courses, revisit completed/locked/upcoming courses; no false starts or independent percentages.
- **Done when:** all public course actions reach the same learning system, old links still have an explained destination, and no user-facing control can self-award completion through localStorage.
