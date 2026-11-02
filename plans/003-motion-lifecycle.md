# 003 — Give motion one lifecycle and one transform owner per layer

- **Status:** IMPLEMENTED — verification scope and optional follow-up in IMPLEMENTATION.md
- **Commit:** 98f2107
- **Target branch:** gram-test; revalidate against current HEAD after plan 000
- **Severity:** HIGH
- **Category:** Accessibility, interruptibility, performance, purpose
- **Estimated scope:** new motion-state helper; 5–7 current scene/mascot files and scoped wrappers
- **Root:** application directory `NextSkill_205_247_261/` under the repository containing the `.slnx`; paths below are relative to it

## Problem

Visible PNG at `wwwroot/css/buddy-character.css:48–50`:

```css
.buddy-avatar-idle {
    opacity: 1;
    animation: buddySoftFloat 3.8s ease-in-out infinite;
```

`buddy-motion.css:70–71` disables only old hidden rig animation in reduced motion. `niko-voyage.css:71` pauses only rowing descendants. Island's visible idle PNG therefore lacks a complete equivalent lifecycle.

Both `ocean-world.js:80` and `niko-voyage.css:27–29` write transforms on `.ow-boat-idle`:

```js
idle = gsap.to('.ow-boat-idle',{y:-5,rotation:2,duration:2.4,ease:'sine.inOut',repeat:-1,yoyo:true});
```

```css
animation: nimo-boat-rock 1.5s ease-in-out infinite !important;
```

Home's primary “เลือกคอร์สทันที” (`Index.cshtml:16`) awaits boarding 850ms (`niko-voyage.js:29–35`) then runs a 3.2s tour (`ocean-world.js:100–102`). Cloud arrival (`journey-clouds.js:19,26–31`) prevents cancel and adds a 1900ms reveal after bounded readiness waits. These are observed code budgets, not measured perceived latency.

## Target

Shared motion state derives from user pause, live reduced-motion preference, document visibility, scene intersection and blocking dialog state. A required loading cover uses its own finite state, not ambient eligibility. Resume never replays accumulated ambient events.

Layer ownership: camera wrapper = scroll navigation; vessel position wrapper = travel; boat inner wrapper = one rocking animator; mascot reaction wrapper = Nimo pose; image = artwork selection. Remove any simultaneous CSS/GSAP writes to the same transform property.

Use existing curves, with shared aliases:

```css
--ns-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ns-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ns-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Button feedback 160ms, popover 150–200ms, ordinary dialog 200–250ms. Reduced motion keeps color/opacity feedback and drops travel/bob/splash. Continuous ocean motion may stay slow; do not apply UI timing limits to deliberate scenery.

## Repo conventions to follow

Preserve `NextSkillAgent`, `NextSkillBuddyMotion`, `NextSkillVoyage`, `nextskill:learning-ready`, pagehide/pageshow cleanup, current GSAP static fallback, existing pause preference and interrupted-tour wheel/touch/keyboard handling. Introduce compatibility adapters rather than rewriting every caller at once.

## Steps

1. Write an ownership map of every active animated wrapper. Inventory animation handles/timers and register explicit dispose/pause/resume operations.
2. Add a small vanilla JS motion-state module, with one change event and unsubscribe cleanup. Scene modules subscribe instead of duplicating partial policies.
3. Apply pause/reduced/offscreen/hidden rules to the visible PNG classes, docked/rowing state, wake and waves. Add hover transforms only within `(hover: hover) and (pointer: fine)`.
4. Split boat transform wrappers and choose one rocking driver; retain CSS for predetermined cycles and GSAP for the existing scroll scene. Move animated wake filter to a static shadow; animate transform/opacity.
5. “เลือกคอร์สทันที” opens course selection without awaiting boarding or scenic travel. Keep “ออกเรือไปด้วยกัน” as the optional narrative path. Pointer and keyboard both get an immediate requested action.
6. Keep cloud storytelling for an optional first-arrival sequence: 900ms reveal after the destination is ready, with visible skip. Returning course switches use a 200ms reveal. Reduced motion releases ready content immediately. Required loading is visibly explained and recoverable; skipping never invents ready data.
7. Clean up transitions on navigation, bfcache restore, resize and live preference changes; don't restart a fish/tour/celebration queue after resume.

## Second-pass lifecycle and readiness contract

- Load the motion-state helper before `buddy-agent.js`, `buddy-motion.js`, voyage, clouds, Smart Journey and Ocean consumers. The plan 001 owner integrates this include once. Emit updates only when derived state changes; subscriber callbacks must not feed an identical state back into the source.
- Keep three policies separate: **ambientAllowed** for scene life/bobbing (visible scene, visible tab, no blocking dialog, not paused/reduced), **reactionAllowed** for the active visible Nimo context (a lesson dialog may allow its own meaningful reaction while the sea remains paused), and **transitionState** for navigation readiness. Pausing movement never hides a result or instructional copy.
- Include `buddy-agent` placement/scale as the outer transform owner, separate from camera travel, boat rock, reaction and artwork selection. No new effect writes into the placement scale or restarts the infinite float on the reaction wrapper.
- Assign each finite transition a generation/request token. Cancel and reconcile to a valid stable state; do not call `.finish()` on an old WAAPI animation and blindly execute an awaited stale continuation. This is relevant to current `niko-voyage.js:63–65`. Dispose listeners/timers and invalidate old generations on navigation and live preference changes.
- Current `nextskill:learning-ready` is dispatched in `.finally()` at `smart-journey.js:469`, so it means startup settled, not necessarily succeeded. Introduce an explicit `loading/ready/error` startup result or payload, keeping compatibility for existing listeners until migrated. Both ready content and a visible recoverable error can be revealed; an empty map is not success.
- Cloud reveal uses one timing source for CSS and its close logic: first-arrival 900ms, returning 200ms. Resolve on the owned final transition's `transitionend` with a bounded duration+100ms fallback, not independent unowned sleeps. Skip/reduced motion cancels the reveal and shows ready/error content immediately. Keep a 15s loading-cover watchdog that exposes a recoverable error if startup never settles; it does not award progress or mark data ready.
- Existing account/catalog networking and startup status must coordinate with plan 006-A. A transport error remains visible after the cover closes, and late startup callbacks cannot reopen it.

Split implementation into 003-A visible PNG pause + single transform ownership, then 003-B shared helper/adapters and transition readiness. Verify 003-A on Home and Island before broadening lifecycle refactoring. Do not rewrite all modules in one patch.

## Boundaries

No library installs or full animation-engine replacement. No grading changes. Keep the course gate and static fallbacks. Do not report FPS improvements until profiled on real target devices.

## Verification

- **Mechanical:** build solution during implementation, inspect console and network; instrument active timer/animation counts in QA only.
- **Feel check:** pause during idle, rowing, arrival, dialog and quiz; enable reduced motion live; hide tab for 30s and return; scroll past scene; repeat course switching. Watch at 10% animation speed for snaps or double transforms.
- **Done when:** all visible motion honors the same controls, transforms have single owners, instant course choice is immediate, and no stale effects replay or accumulate on return.
