# 005 — Add sparse, connected life to the existing ocean

- **Status:** IMPLEMENTED — verification scope and optional follow-up in IMPLEMENTATION.md
- **Commit:** 98f2107
- **Target branch:** gram-test; revalidate against current HEAD after plan 000
- **Severity:** MEDIUM
- **Category:** Missed opportunities / environment motion
- **Estimated scope:** new ocean-life partial/CSS/JS plus local SVG assets; small integration with current scene and Nimo
- **Root:** application directory `NextSkill_205_247_261/` under the repository containing the `.slnx`; paths below are relative to it

## Problem

Home (`Views/Home/Index.cshtml:4–13`) already separates sky, swell, distant islands, birds, shore, vessel and harbor. `wwwroot/css/ocean-world.css:28–54` provides wave/wake/shore motion. There is no active fish lifecycle. Adding constant independent loops everywhere would increase distraction and fail to create connected events.

Existing scene structure:

```html
<section id="ocean-journey" class="ow-scene" aria-label="เดินทางผ่านโลกทะเลกับ Nimo">
```

## Target

Retain existing art direction. Add a decorative sea-life layer with `pointer-events:none` and `aria-hidden="true"`, positioned in water space away from controls/headlines. Local SVG fish/splash/ripple assets share the islands' simplified illustration language; no stock video, runtime image generator, 3D/WebGL engine or new animation library.

Three coordinated layers:

1. Slow background: existing sea/boat plus restrained cloud/bird drift.
2. Rare event: one fish breaches the surface, falls, splashes, then leaves a fading ripple.
3. Optional response: Nimo briefly tilts toward it only in an idle ocean context, and never during quiz, loading or success feedback.

Initial test values (new design choices, not measured Duolingo constants):

- Desktop event gap randomly 12–24s; coarse pointer/mobile 24–40s.
- At most 1 fish and 2 ripples alive. No event queue.
- Fish travel 900ms, splash opacity/scale 200ms, ripple transform/opacity 1200ms.
- Fish follows a precomputed parabola using transform keyframes with `linear` timing between trajectory samples; UI fades use `cubic-bezier(0.23,1,0.32,1)`.
- Ambient event lifetime <=2300ms including cleanup; all nodes/handles reused or removed.

## Repo conventions to follow

Use plan 003 motion state; add `Views/Shared/_OceanLife.cshtml`, `wwwroot/css/ocean-life.css`, `wwwroot/js/ocean-life.js`, assets in `wwwroot/images/journey/`. Load only on active Home ocean mode in `_SmartJourneyLayout.cshtml`, using versioned local assets.

## Steps

1. Inspect scene composition at 360/390/768/1440px; define normalized water-only event zones with explicit exclusion zones for intro, caption, vessel and harbor controls. Recompute geometry on resize, not per animation frame.
2. Add a bounded scheduler using one scheduled timeout and current scene visibility. Choose the next event only when eligible. Never consume saved learning state for random decorations.
3. Implement fish → splash → ripple with CSS/WAAPI transforms and opacity. Reserve size; do not animate layout/top/left or add live animated blur/shadow.
4. Pause/cancel when offscreen, dialog open, tab hidden or user pauses. Reduced motion shows a static marine detail or omits the breach; learning feedback remains visible. Resume schedules a fresh interval.
5. Dispatch an optional low-priority `ocean:fish-jump` event to plan 004; Nimo may ignore it whenever occupied. Provide no audio without explicit opt-in.
6. After the first fish works, assess existing wave and bird rhythm together. Add one more ambient detail only if it fills a clear quiet region. Avoid filling every empty area with bubbles/particles.
7. Keep completion effects separate: confirmed new island unlock may emit one small local shimmer, while fish remain purely decorative. Retakes do not fabricate rewards.

## Second-pass geometry and reproducibility contract

Put the decorative overlay in `.ow-scene` coordinates, outside `.ow-camera`. The camera moves as far as `-innerWidth*2.2` in current `ocean-world.js`, so resize-only exclusion measurements are not sufficient. Spawn only after camera/scroll/tour has been still for at least 300ms. Cancel an active breach immediately when travel starts, and schedule a fresh interval after stability rather than resuming a half-completed trajectory.

At each eligible spawn, calculate water-space bounds and exclusion boxes for visible intro, caption, navigation controls, vessel and harbor; expand exclusions by 24px. Recompute after stage changes, scroll settling, resize and panel changes. Do not read geometry on every frame. If the whole trajectory plus splash/ripple footprint does not fit a safe zone, skip this event.

Prototype trajectory is reproducible:

- Desktop fish 28×16px, displacement `dx=100px`, apex `h=48px`; mobile/coarse pointer 20×12px, `dx=64px`, `h=32px`.
- 13 transform keyframes: `t=i/12`, `x=x0+dx*t`, `y=yWater-4*h*t*(1-t)` for `i=0..12`; fish is centered on the computed point. Rotation follows the trajectory tangent; don't change the water contact point to dodge an obstacle midflight.
- Travel 900ms; splash at the landing point for 200ms, then ripple 1200ms, total 2300ms. Initial splash footprint 24×12px and ripple scales to 48×18px desktop; mobile uses 18×9px and 34×14px. These values are art-direction starting points requiring baseline visual QA.
- Maximum one fish, one splash, two ripples and one scheduled timeout for this module. Cleanup/fallback must respect the same bound; allow zero eligible spawn zones.
- Provide a deterministic seed/force-one-event hook only in the Development QA harness so tests do not wait on random intervals. Production exposes no autoplay test control and does not persist a new random-event state.

First delivery is fish → splash → ripple with pause/exclusions working. Nimo curiosity and additional birds are a later small patch after 004; they must not delay the first stable living-ocean feature.

## Boundaries

No backend/schema changes for sea life. No DOM/animation growth over time. No extra interaction required to reach a course. Do not change existing Nimo model or course gate. Maintain document-flow fallback without GSAP.

## Verification

- **Mechanical:** during implementation, run Home for 5 minutes; count entities/timers before/after 20 dialog opens, hidden-tab cycles and resizes. Counts must remain bounded.
- **Feel check:** record desktop and a real mobile device; fish must enter/leave the water convincingly, splash follows contact, ripple follows splash; nothing crosses a reading/control region. Check 10% speed.
- Profile frame time on the team's target phone and 60Hz laptop before claiming 60fps. Aim near 16.7ms/frame; reduce decorative density before adding dependencies.
- **Done when:** sea life is noticeable occasionally, connected in cause/effect, silent by default, fully pausable, and does not delay or obscure a learning action.
