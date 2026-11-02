# 006 — Give lessons a clear rhythm and recoverable feedback

- **Status:** IMPLEMENTED — verification scope and optional follow-up in IMPLEMENTATION.md
- **Commit:** 98f2107
- **Target branch:** gram-test; revalidate against current HEAD after plan 000
- **Severity:** HIGH for stuck submission; MEDIUM for lesson rhythm
- **Category:** Feedback, interaction, purpose and frequency
- **Estimated scope:** Smart Journey lesson/status partials, smart-journey.js, shared component CSS; learner-mode projection if needed
- **Root:** application directory `NextSkill_205_247_261/` under the repository containing the `.slnx`; paths below are relative to it

## Problem

`wwwroot/js/smart-journey.js:295–308` renders all reading and quiz questions in one scrollable dialog. Submission (`:318–324`) disables inputs and close before awaiting an API call without a deadline:

```js
$('#close-lesson').disabled = true;
const result = await api('CompleteLesson', { courseId: lesson.courseId, lessonId: lesson.id, answers });
```

Network errors recover in finally; the issue is an unbounded pending request. Result `:339` always says account-saved if XP is awarded:

```js
$('#lesson-reward').textContent = result.awardedXp ? `+${result.awardedXp} XP · บันทึกกับบัญชีแล้ว` : result.passed ? 'ความก้าวหน้าบันทึกไว้แล้ว' : 'ยังไม่ได้รับ XP';
```

Island already distinguishes account vs guest at `Views/Learning/Island.cshtml:4`. Startup State failure (`smart-journey.js:453–455`) targets an error region inside the usually closed course dialog.

## Target

Use current MVC lesson content and server grading. Present reading → question 1/3 → 2/3 → 3/3 → submit → result/retry/next island. Next on a client-side question means “answer selected”, not “answer correct”; retain all answers and let the existing CompleteLesson action grade the full set. Do not send grading keys to the browser.

Keep one clear primary action, persistent progress, useful explanation, consistent saved-state copy and a page-level visible status region. No scenic fish or roaming mascot during focused reading/quiz.

## Repo conventions to follow

Reuse `Models/LearningModels.cs`, `LearningController`, `LearningStore`, existing antiforgery API helper and stale-lesson AbortController logic (`smart-journey.js:259–284`). Keep current first-award/retake semantics and server transactions. UI transitions use plan 001 tokens, 200ms ease-out; reduced motion uses no positional transition. Keyboard navigation stays immediate and focus is explicitly assigned to each step heading.

## Steps

1. Add a small lesson UI state with reading/question/review/submitting/result/error; it stores selections for the current loaded lesson, not independent XP/unlocks. Keep previous/next actions and an accessible question counter.
2. Stage the existing Razor lesson shell and JS-generated content into visible steps. Keep labels/fieldset/radio semantics. Validate the current question before Next; Previous/Next are `type="button"` and preserve selections. The form uses `novalidate` with explicit submission validation to prevent automatic focus on hidden required radios; final completeness validation first reveals/focuses the first unanswered group, then calls browser validation on that visible group. Keep required semantics. Serialize every answer in the original public question order: `lesson.questions.map(q => selections.get(q.id))`, with zero-based original choice indices. Never serialize by visited-step order, changed DOM order or only incorrect questions.
3. Add a configurable 15s request deadline for submission and a bounded 10s State recovery request. Capture immutable `{courseId, lessonId, answers}` and original lesson/request identity before sending. On timeout say save confirmation is unavailable; aborting fetch does not undo a server commit. Preserve answers and offer Check status / Retry same answers / Leave safely. See recovery contract below; preserve idempotent server behavior.
4. Add a visible page status partial outside closed dialogs for account loading, session expiry, server unavailable, offline and retry. Do not replace all feedback with sr-only announcements.
5. Derive account vs guest wording from a single learner-mode source: account “บันทึกกับบัญชีแล้ว”; guest “บันทึกในโหมดทดลองของเซสชันนี้”. Do not promise transfer to account or cross-device sync for preview.
6. Connect Nimo events through plan 004: reading on lesson start, thinking only during actual submission, encouraging on failed result, success after confirmed new completion, review response for retakes. Do not show invented per-question correctness before server result.
7. After a pass, use “ไปเกาะถัดไป” for travel and an obvious “เริ่มบทถัดไป” once arrived. Returning learners may skip scenic arrival. Course completion presents real total/achievement and next-course choice.
8. Retain close/unsaved-answer protections, focus restoration, Escape behavior and deep links; keep connection recovery usable without a cinematic transition.

## Second-pass recovery and validation contract

`LearningState` (`Models/LearningModels.cs:14–17`) has cumulative XP/completions/achievements, not per-attempt score, feedback or original awarded XP. A retry after a successful commit returns zero additional XP (`LearningStore.CompleteAsync`). Therefore:

- On uncertain result, State may confirm that the lesson is now completed; it must not reconstruct the lost score or attribute an XP-total difference to this request. Another tab could have changed the same account.
- Show confirmed current totals/completion. Say “ยืนยันแล้วว่าบทเรียนนี้ผ่าน” without inventing attempt details. To obtain detailed grading feedback, resubmit the same immutable answer snapshot to the existing endpoint and accept `AlreadyCompleted=true`/`AwardedXp=0` when appropriate.
- If neither State nor retry confirms a result, retain “ยังยืนยันผลไม่ได้”, allow leaving, and do not present success, an unlock or a new award. Snapshot retention is in memory for this page; do not add an attempt-history schema or store submitted answers in persistent browser storage for this plan.
- Every retry/recovery request is bounded and stale responses check the originating lesson/request token before updating UI. No concurrent duplicate submit loop. 401 offers login, 400 explains validation/session refresh, 403/404 restores valid navigation, 503 offers retry.
- After an incorrect result, announce/focus the result explanation and provide “แก้คำตอบ” that returns to the first incorrect group with all choices intact. The next submit includes the full ordered array again.
- Retakes show real feedback and zero new-award treatment. A completed course offers next-course selection; it does not create a nonexistent next-island button. Do not infer a first-time course award from a replayed response.

Split implementation into 006-A request recovery/save copy/status, then 006-B staged lesson UI. Prove recovery on the current form first so a step-layout change cannot hide a regression. Plan 001 owns style tokens; this plan owns the actual visible learning-status partial and its state.

## Boundaries

Do not change pass criteria, curriculum questions, award amounts, identity/authentication, or replace MVC with a SPA. No fake optimistic completion. Avoid adding new persistence tables merely for animation/UI steps.

## Verification

- **Mechanical:** during implementation build solution and verify existing server grading/duplicate-award tests or equivalent focused integration checks; do not use real learner data for destructive tests.
- **Feel check:** complete, fail, correct answers, retake, final lesson, switch course, deep link, guest and account. Offline/slow/deferred requests recover without losing selections, trapping the dialog or falsely claiming save.
- Keyboard/Tab/Enter/Escape, screen reader result announcement and 200% zoom work; reduced motion gives identical learning outcomes without travel.
- **Done when:** every displayed step/action is clear, persistence wording is accurate, pending requests have a bounded recovery path, and all progress/XP agrees with server state across course pages.
