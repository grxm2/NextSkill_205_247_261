# Nimo text speech

Nimo shares the existing `#nextskill-agent` and anchor system. `nimo-speech.js`
adds one Liquid glass speech surface. There is no audio, remote chatbot, new
progress store or reward logic. The existing mascot menu has a “คุยกับ Nimo”
action; clicking the mascot still opens its original menu.

- Home advice waits until the arrival and landing finish. Travel, jump, catalog
  transitions, background tabs and unrelated dialogs hide speech immediately.
- Contextual Thai tips cover starting, searching, choosing a course and studying.
  Lesson feedback mirrors `#lesson-nimo-message`, `#lesson-result`,
  `#lesson-error` and `#submission-recovery`, which the existing learning
  controller updates. Speech never interprets XP deltas as an earned award.
- `lastAutoKey` deduplicates continuous state callbacks. A later lesson attempt
  may show the same useful hint again. A new message cancels the previous
  typewriter instead of adding it to a queue. Closing suppresses the current
  message until a new meaningful state or a manual request.
- The glass uses a manual popover above the mascot to escape scene clipping,
  with a fixed-position fallback. Candidate placements exclude navigation,
  hero text, search and lesson actions. On phones the home island and all its
  attached scenery receive 88px of clearance together. The dedicated lesson
  page places the bubble inside the coach's document flow, above Nimo.
- Thai graphemes reveal once; a hidden live region announces complete text
  once. A separate SVG mouth layer clips the original PNG's mouth and animates
  only that region. Existing illustrated travel/wave poses suppress this layer.
  Existing body reactions retain priority over the speech gesture.
- Pause, reduced motion and keyboard requests display complete text immediately.
  Closing returns focus when it was inside the bubble. Automatic advice does
  not focus a control. Page lifecycle hooks cancel speech work on departure.

`window.NextSkillSpeech.help({ motion, focus })` rotates contextual tips;
`say(text, { compact, pose, motion, focus })` renders bounded plain text;
`dismiss()` closes it. These are presentation-only APIs.

Verification: `scripts/verify-nimo-speech.cjs` uses disposable Development guest
sessions. It checks arrival, real course navigation, singleton placement,
mouth/typewriter movement, cancellation, keyboard/pause behavior, six viewport
sizes, glass themes and real reading/question hints. Uncertain-save/error/retry
adapter cases use explicit DOM fixtures; they are not claims that a real result
was submitted or earned. `CompleteLesson` is blocked and treated as a failure.
Existing practice initialization can select/checkpoint a course in that
disposable guest session. `scripts/verify-home-arrival.cjs` checks the retained
intro, interruptions and course voyage.
