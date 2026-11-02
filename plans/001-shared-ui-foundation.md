# 001 — Unify the shared UI foundation

- **Status:** IMPLEMENTED — verification scope and optional follow-up in IMPLEMENTATION.md
- **Commit:** 98f2107
- **Target branch:** gram-test; revalidate against current HEAD after plan 000
- **Severity:** HIGH
- **Category:** Cohesion & tokens / interface consistency
- **Estimated scope:** 2 new CSS files, shared partials, 5 layout entry points, route-specific button migrations
- **Root:** application directory `NextSkill_205_247_261/` under the repository containing the `.slnx`; paths below are relative to it

## Problem

Active routes use different styling contracts. `Views/Shared/_Layout.cshtml:8–18` loads Bootstrap and several legacy theme layers; Home and Island instead use `_SmartJourneyLayout`. Enrollment sets `_HomeLayout` at `Views/Courses/Enrollment.cshtml:5`. Account sets `_AccountLayout`, while `Views/Account/AdminDashboard.cshtml:3` sets `Layout = null`.

Current Journey button (`wwwroot/css/smart-journey.css:8`):

```css
.sj-button:active{transform:translateY(2px)}
```

Different token meanings exist at `account-game.css:34` and `admin-game.css:37`:

```css
--nimo-blue-dark: #1d4ed8;
--nimo-blue-dark: #0c4a6e;
```

`Views/Account/Dashboard.cshtml:15` uses `primary-button` without `nimo-submit-btn`, bypassing the account submit variant. Courses/Details use Bootstrap buttons. Do not judge a legacy CSS file in isolation; inspect its actual cascade.

## Target

Create `wwwroot/css/nextskill-tokens.css` and `nextskill-components.css`. Shared semantic tokens, no new CSS framework:

```css
:root {
  --ns-ink: #173e56; --ns-muted: #577b91;
  --ns-canvas: #e2f6ff; --ns-surface: #fff; --ns-border: #c9e3ef;
  --ns-primary: #087faa; --ns-primary-hover: #086189;
  --ns-radius-control: 14px; --ns-radius-surface: 20px;
  --ns-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ns-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ns-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
.ns-button {
  min-height: 48px;
  transition: transform 160ms var(--ns-ease-out), background-color 160ms ease;
}
.ns-button:active:not(:disabled) { transform: translateY(2px); }
.ns-button:focus-visible { outline: 3px solid var(--ns-primary-hover); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .ns-button { transition: background-color 160ms ease; }
  .ns-button:active:not(:disabled) { transform: none; }
}
```

Define `primary/secondary/text/danger` and default/compact variants. Primary height 52px; ordinary height 48px; icon hit area 44px. Keep Prompt and Manrope. Body learning text 16px/1.8, supporting text 14px. Preserve error meanings and form validation.

## Repo conventions to follow

Use Razor partials, `asp-controller`/`asp-action`, local fonts and `asp-append-version`. Extend Journey's existing `--ease-out/--ease-in-out` values rather than adding slightly different curves per component. Keep ocean illustration palette separate from UI semantic tokens.

## Steps

1. Capture baseline screenshots for active routes before editing: Home, Courses, Details, Enrollment, Island, Login, Register, Dashboard, Admin, Privacy/Terms/AccessDenied.
2. Add shared styles to all five layout entry points, including standalone Admin. Do not include Journey page scripts on catalog/account routes just to reuse a button.
3. Introduce shared brand/navigation and visible status partials. Determine active item from route/action, not hard-coded `active` classes. Account may use a slim navigation variant.
4. Migrate button families incrementally: Journey, catalog/details, account, Enrollment, Admin. Keep behavior/data attributes stable. Temporary aliases must be explicitly listed and later removed, not another permanent override layer.
5. Normalize fields, cards, badges, dialog close controls, loading/error/empty states and focus. Do not turn Admin tables into cinematic scenes.
6. Apply Thai-first UI glossary: เริ่มเรียน / เรียนต่อ / ทบทวน / ผ่านแล้ว / ยังไม่ปลดล็อก / เร็ว ๆ นี้. Keep instructional English as content.
7. Remove obsolete CSS loads only after route usage and visual comparison prove they are no longer needed. Do not delete all historical files based on filename alone.

## Second-pass execution refinements

Prerequisite: plan 000 baseline. Split this work into foundation/layout includes, then one shell at a time. Plan 002 owns Courses/Details/Enrollment markup migration; plan 006 owns the visible learning-status markup/behavior. This plan supplies their component/style contracts and avoids concurrent edits to those views.

Loading shared CSS last is not sufficient: `home-design.css:75` has `#nextskill-home .button-primary`, `ocean-theme.css:73` sets Bootstrap button variables, and `account-game.css:622` uses compound selectors. Inventory computed styles and specificity in each active shell first.

Migration contract:

1. Load semantic tokens before consumer styles. Keep Bootstrap where it currently supplies layout/utilities, then page composition, then the shared migrated component definitions. Do not wrap existing files in CSS cascade layers as an incidental change.
2. For each migrated component, remove or narrow the old visual rules/classes that still match it, instead of appending higher specificity/`!important` fixes. Preserve IDs/data attributes. First inventory class-based JS selectors; keep behavioral classes or migrate those hooks in the same reviewed patch before removing a class.
3. Map legacy color variables to shared tokens within the appropriate shell while it is in transition. A temporary alias has an owner, scope and removal batch. Avoid a global `.btn`/`button` override that changes unrelated Admin or framework controls.
4. Compare computed background/color/border/type/height/focus in default, hover, active, pending and disabled states against the baseline. Never delete a legacy stylesheet until all its active consumers are accounted for.
5. Shared button styles include semantic pending/disabled behavior: native `disabled` for buttons and explicit activation prevention plus `aria-disabled` for link-like controls where needed. Styling alone must not make a link appear disabled while remaining actionable.

The state/style contract is shared; page-specific structure is retained. No blanket migration of catalog/account pages to `_SmartJourneyLayout`, which assumes Learning DOM nodes and scripts.

## Boundaries

No routing, grading, database, authentication or course-content behavior changes in this patch. Do not replace Nimo, ocean artwork, MVC or Bootstrap wholesale. No dependency install. Do not remove an intentional scene delay merely by changing global transition duration.

## Verification

- **Mechanical:** during implementation, `dotnet build NextSkill_205_247_261.slnx` from repository root; compare warnings to baseline, no new errors.
- **Feel check:** traverse every active route at 390/768/1440px, inspect hover/pressed/focus/pending/disabled; Tab and Escape must remain usable. At 200% zoom no form/CTA is clipped.
- **Done when:** all primary buttons use the same semantic contract; colors/type/spacing agree between routes; every important state has visible feedback; shared token changes propagate without route-specific override fights.
