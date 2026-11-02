# 000 — Verify gram-test and capture the current experience

- **Status:** IMPLEMENTED — verification scope and optional follow-up in IMPLEMENTATION.md
- **Target branch:** gram-test
- **Reviewed commit:** 98f210703dc788fb5710e646db3ff8b814f72e33
- **Scope:** branch verification, active-route/script map, runtime baseline and shared work ownership
- **Path convention:** repository root contains `NextSkill_205_247_261.slnx`; application root is its `NextSkill_205_247_261/` subdirectory. Other plans use application-relative paths unless stated otherwise.

## Why this gate exists

The first audit was source-based. The new branch currently matches the audited commit, but typography, visual density, timing, overlap and performance must be checked in the running MVC app before changing them. Several historical views/scripts remain in the repository. Existing `scripts/verify-sealearn.cjs` asserts old `.sea-nav`/`.sea-landing` selectors and is not a passing acceptance test for the active Ocean Home.

## Before editing

From the intended repository root:

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
```

Confirm `gram-test`. Read current diffs; preserve all unrelated work. If the base differs from the reviewed commit, compare changes to plan evidence and refresh affected excerpts before editing. Do not reset, overwrite the older gram-home checkout, merge branches or commit/push as part of this planning gate.

The audit copy is a single-branch clone originally made from master. Its local gram-test was selected explicitly without upstream configuration. Refresh it explicitly when needed; do not assume `git pull` knows this target:

```powershell
git fetch origin refs/heads/gram-test:refs/remotes/origin/gram-test
git log -1 refs/remotes/origin/gram-test
```

Inspect differences before updating a checkout; these commands do not authorize resetting local changes.

## Runtime baseline to perform when implementation begins

1. Confirm .NET 10 SDK and existing project dependencies. Build the current solution and record existing warnings/errors separately from new findings:

   ```powershell
   dotnet build NextSkill_205_247_261.slnx
   ```

2. Use the existing local test database/configuration for account/learning checks. Do not print credentials, run database setup against production or assume guest preview avoids SQL. If a test database is unavailable, public-page visual work can proceed; authenticated persistence checks remain explicitly unverified.
3. Run the existing app in an isolated local process/port during implementation, using the application project and Development for the guest-preview scenario. Record effective environment, URL and configuration flags, without secrets. Repeat production guest/login gating separately where a test environment is available.
4. Map actual route → layout → loaded styles/scripts. Include `/Home/Index`, `/Home/Courses`, `/Home/Details/{id}`, `/Courses/Enrollment`, `/Learning/Island`, account pages and Admin. Do not add findings for an unused partial just because it exists.
5. Save screenshots at 360/390/768/1024/1440px, and clips of course choice, boarding, cloud arrival, answer submission and Nimo idle/reactions. Capture state labels and current computed button styles, not screenshots alone. Store QA output in ignored `artifacts/ux-baseline/`, not source assets.
6. Inspect the current `<form>`, focus, navigation, reduced motion, pause, hidden tab and GSAP-unavailable fallback. Record what actually fails; keep source-confirmed risks distinct from reproduced defects.
7. Review existing QA scripts before using them. Plan focused current-flow checks around `#ocean-journey`, `#course-harbor`, `#lesson-route`, `#lesson-dialog` and `#course-harbor-dialog`; don't rewrite a legacy test and assume all original assumptions still apply.

## Team integration contract

Implement in small batches with one owner per shared file. 001 owns layout includes and the visual contract; 002 owns course markup/state; 003 owns lifecycle/wrappers; 004 owns visible Nimo reaction rendering; 006 integrates learning events/recovery; 005 consumes those stable interfaces for sea life. Shared-file changes are merged sequentially even when other work is parallel.

Keep the current ASP.NET MVC/Razor/Controllers/ViewModels/Services/SQL structure. No new frontend framework, rendering engine or dependency is required by this plan.

## Done when

- gram-test/base/working diff recorded and all affected plan findings revalidated.
- Active route and asset map saved, including compatibility routes and legacy QA gaps.
- Baseline public-page screenshots and relevant clips exist; account/database-dependent gaps are explicitly listed.
- CSS cascade and motion ownership maps agreed; work owners and PR boundaries recorded.
- Only then begin behavior/visual implementation, verifying each batch against this baseline.
