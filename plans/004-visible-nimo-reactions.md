# 004 — Make the existing Nimo visibly respond to learning

- **Status:** IMPLEMENTED — verification scope and optional follow-up in IMPLEMENTATION.md
- **Commit:** 98f2107
- **Target branch:** gram-test; revalidate against current HEAD after plan 000
- **Severity:** HIGH
- **Category:** Physicality, feedback, missed opportunities
- **Estimated scope:** _SkillBuddy, buddy motion/expression adapters, learning reaction dispatch; optional artwork preparation later
- **Root:** application directory `NextSkill_205_247_261/` under the repository containing the `.slnx`; paths below are relative to it

## Problem

Current visible artwork (`Views/Shared/_SkillBuddy.cshtml:5–6`):

```html
<img src="/images/nimo-learning.png" alt="Nimo" class="buddy-avatar-img buddy-avatar-idle" />
<img src="/images/nimo-rowing.png" alt="Nimo กำลังพายเรือ" class="buddy-avatar-img buddy-avatar-rowing" />
```

The same partial at line 9 hides `.buddy-upper` with opacity 0 and zero width/height; lines 32–33 hide feet/legs. Many handlers in `buddy-motion.js:154–178` and `buddy-expressions.css:10–32` target those hidden pieces. Whole-rig jumps are visible, but hidden facial changes are not evidence of visible expression.

Active learning dispatches `read` at `smart-journey.js:310` and `celebrate` at `:347`; failure copy at `:337–338` has no dedicated visible coaching reaction.

## Target

Keep Nimo's current shape, face, proportions, palette, clothes and illustration style. First implementation must work with the existing visible PNGs, an outer reaction wrapper, short speech and status accents. A flat image cannot independently blink, talk or wave an arm; do not claim those capabilities until matching pose assets/layers exist.

Event-state contract:

| Trigger | State | Visible response / copy |
|---|---|---|
| First greeting | welcome | small whole-body tilt, “เลือกเส้นทาง แล้วไปด้วยกันนะ” |
| Lesson opened | reading | settle to still pose; “ลองอ่านตัวอย่าง แล้วค่อยตอบได้” |
| Hint requested | thinking | one gentle 200ms tilt plus useful lesson-specific hint |
| Server result failed | encouraging | return upright, “ลองดูคำอธิบาย แล้วแก้อีกครั้งได้นะ” |
| First confirmed pass | success | one brief whole-body lift and success accent |
| Confirmed course complete | proud | distinct one-off celebration with real achievement |
| Returning learner | welcome-back | mention actual active course; don't repeat full onboarding |
| Idle ocean fish | curious | optional brief look-like tilt only while no learning task is active |

No decorative reaction blocks Continue. Priorities: system/error feedback and lesson reactions > navigation > ambient curiosity. New meaningful events cancel stale poses rather than queueing them.

## Repo conventions to follow

Keep `NextSkillBuddyMotion.play/express/stop` compatibility and single shared mascot placement from `buddy-agent.js`. Use plan 003 lifecycle. The server's completion response owns success/unlock/award; animation never changes XP.

## Steps

1. Map existing pose names to the actual visible illustration wrapper. Remove hidden-rig work for Nimo after confirming no remaining consumer requires it; preserve adapters where needed.
2. Assign separate wrappers for placement scale, reaction transform and image selection. Keep idle bob off the reaction wrapper.
3. Add a small event-to-state adapter with interruption/cooldown. Dispatch from current lesson/course events, not from arbitrary timers pretending the learner succeeded.
4. Use 160ms color/press and 200ms reaction settling with existing `cubic-bezier(0.23,1,0.32,1)`. Initial tilt target is 3deg and never moves surrounding layout. First-pass lift is one 600ms sequence: compress to scale(1.02,.98) for 100ms, lift translateY(-8px) at scale(1) for 250ms, settle to translateY(0) scale(1) for 250ms. Reduced motion skips transform while copy and result stay visible. Treat these as prototype values requiring visual QA, not guaranteed final art-direction values.
5. Keep speech concise and useful, with at most one bubble. Do not autoplay sound. Read-aloud is opt-in and cancellable on close/navigation.
6. Review companion studio: settings that only recolor hidden DOM or add hidden accessories must be implemented on the visible model or removed/disabled honestly. No new rewards without existing persistence rules.
7. Optional second pass: prepare transparent expression/pose variants or layered art preserving this exact Nimo identity. Approve an asset sheet before wiring eye/mouth/limb movement. Do not stretch a whole PNG and describe it as articulated animation.

## Second-pass visible-state and persistence contract

- Audit all still-exposed pose controls in `_CompanionStudio.cshtml` and agent menus. Map each to a real visible whole-image reaction or truthful text/accent fallback. Do not label a generic tilt as articulated high-five, eye tracking or facial animation. Disable unavailable art-specific controls with an explanation until matching art exists.
- Preserve the PNG model; do not unhide the old CSS body to make its emotions work. The outer agent scale/position stays independent of the reaction wrapper, as specified in 003.
- Emit first-pass celebration only for a successful response with `passed && !alreadyCompleted`. Course-complete ceremony additionally requires a before/after course-completion transition from confirmed state and a non-replayed result. Deduplicate by originating request and course/lesson identity within the page; a repeated callback must not replay it. Retakes get a short review acknowledgement, not a new-award ceremony.
- After an uncertain submission recovered only from State, show confirmed completion/current totals but avoid a first-award ceremony attributed to the lost request. Detailed result recovery belongs to 006. Do not infer an award from cumulative XP deltas across tabs.
- `companion.js:73–105` and `_CompanionStudio.cshtml:20–34` maintain browser-local companion stars/accessories separately from server XP. Preserve existing name/stars/preferences and their storage disclosure. Do not merge companion stars into learning XP, reset them, or introduce automatic star awards from lesson reactions. Hidden recolor/accessory settings become honest unavailable options, without deleting the user's saved selections.
- In a focused lesson dialog, ambient curiosity is suppressed but the lesson's own hint/retry/success reaction remains eligible under 003. Nonmoving textual feedback always works with pause/reduced motion.

Deliver 004-A visible PNG reactions and compatible public pose mappings first. Extra facial/limb artwork is optional 004-B after the same-character asset sheet is reviewed; it is not a prerequisite for the first functional UI release.

## Boundaries

Do not replace Nimo with a new character, recolor its model to imitate Duo, add a 3D engine, or introduce fake speaking AI. Keep emotions supportive; incorrect answers do not trigger shame or loss unrelated to existing rules.

## Verification

- **Mechanical:** call each public pose adapter in a QA harness during implementation; no null hidden-element dependencies or console errors.
- **Feel check:** capture welcome/read/hint/retry/pass/course-complete at normal and 10% speed. Confirm the PNG the user actually sees changes distinctly; rapidly alternate events, open/close dialogs, test keyboard/reduced motion.
- **Done when:** each meaningful reaction has visible evidence on the same model, no duplicate Nimo or stale bubble appears, pause works, and success only follows confirmed learning results.
