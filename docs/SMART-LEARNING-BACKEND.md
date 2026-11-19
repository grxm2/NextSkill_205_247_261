# Smart Learning Journey backend

NextSkill stores learning progress in the configured `ConnectionStrings:NextSkill` SQL Server database. It uses the existing signed cookie, account GUID and role (`User` or `Admin`); a browser never chooses an account ID. This is separate from all previous demo XP and browser-only island unlocks.

## Data and deployment

- Existing users, admins, invitation codes, password hashing and authentication remain in place.
- The first account-linked learning read creates the profile, course progress, lesson completion, video confirmation, video start and achievement tables as needed.
- `scripts/LearningJourney.sql` provides the same additive setup for deployment accounts that cannot create tables at runtime. Run against the existing configured database after the original authentication setup. No existing table or row is dropped, reset or renamed.
- Each table keys progress by `(AccountId, AccountRole)`. Course and completion rows additionally include course/lesson IDs. Account roles have separate namespaces, matching the existing separate user/admin tables.
- `activeCourseId` and onboarding are profile fields. Last unfinished lesson is stored per course. Current island, unlocked islands, progress and completion are derived from persisted completions; level is `1 + floor(XP / 200)`. Derived values do not drift from their source records.
- The final completed island remains available when a course finishes; `lastLessonId` then becomes null. Returning does not force a new course selection.
- Database errors return 503 with a retry message. Selection and awards never fall back to localStorage. The root can still show public Home while the database is unavailable.

## Navigation

- Only `/` routes through `/Learning/Entry`.
- Guest or signed-in learner without an active course → explicit `/Home/Index`.
- Signed-in learner with an active course → `/Learning/Island?courseId=N`, even after completion.
- Explicit Home, course and lesson links are respected. Reading a different course never silently changes the active one.
- Local ReturnUrl passes from login/register GET through POST, registration success and password login. External URLs and auth-page loops are rejected; otherwise login dispatches through Learning/Entry.
- `/Learning/Island?courseId=N&lessonId=M` validates the course/lesson and unlocked island before rendering. For a course not yet started, its first island can be viewed and the UI explicitly selects it before opening the lesson.

## Authored curricula and awards

The catalog keeps UX Research (ID 1, four lessons) and adds 20 single-lesson courses across Languages, Development, Design and AI (IDs 101–120). The active course and quiz files are `Database/custom_courses.json` and `Database/custom_questions.json` under the app. Retired IDs do not appear in learning routes. Historical SQL records are retained.

Every available lesson has a configured YouTube video and server-graded quiz. After pressing play, the learner can watch or seek to the last 10% of the timeline. The learner can also skip directly, even if the player fails to open. Both actions open the quiz immediately. The server checks for a playback start tied to the current learner, course, lesson and video, then persists the quiz unlock.

The current quizzes require three of four correct answers. Failure lets the learner take the quiz again using the existing video confirmation or restart the video and earn a new confirmation. A first lesson completion grants 50 XP and the account's first-lesson badge when applicable. Completion of every lesson in a course grants another 100 XP, a `course-{id}` achievement and a printable certificate under the learner's account. These rewards are idempotent.

Each included question has a short Nimo hint and a separate concept explanation. The unlocked lesson returns both as `hint` and `coaching` on the question. Correct choices stay on the server, and grading feedback appears after submission. Administrators can edit both texts in the question form.

All reads/writes for one learner serialize on the same profile lock inside a SQL transaction. Unique completion/achievement primary keys plus atomic completion, XP and next-lesson writes prevent duplicate rewards from retries or simultaneous tabs. Independent courses preserve their progress when switched.

## HTTP contract

JSON uses camelCase. All account state responses use `Cache-Control: no-store`. Every POST requires the existing ASP.NET antiforgery cookie and token in `X-CSRF-TOKEN` (the rendered `@Html.AntiForgeryToken()` provides the token).

| Endpoint | Access | Result |
| --- | --- | --- |
| GET `/Learning/Catalog` | Public | `{ courses: [...] }` with stable course IDs, `canStart` and lesson summaries |
| GET `/Learning/State` | Authenticated | Persisted LearningState |
| POST `/Learning/SelectCourse` | Authenticated | `{ courseId }` → LearningState; creates only that course if new, changes active pointer, never clears old course |
| GET `/Learning/Island?courseId=N&lessonId=M` | Authenticated | Island Razor view; optional course defaults to active, optional lesson deep link is validated |
| GET `/Learning/Lesson?courseId=N&lessonId=M` | Authenticated | Lesson and video information. Quiz prompts appear after a video confirmation. |
| POST `/Learning/StartVideo` | Authenticated | `{ courseId, lessonId, videoId }` → records an allowed session's playback start |
| POST `/Learning/CompleteVideo` | Authenticated | Adds `positionSeconds` and `skipVideo` to the playback request. Returns the unlocked lesson after a recorded start and a qualifying position or explicit skip. Accepts `watchedSeconds` as a position alias for older clients. |
| POST `/Learning/RestartVideo` | Authenticated | Clears confirmation and resets playback time for the selected lesson |
| POST `/Learning/Checkpoint` | Authenticated | `{ courseId, lessonId }` → LearningState; stores an unlocked unfinished lesson without completing it |
| POST `/Learning/CompleteLesson` | Authenticated | `{ courseId, lessonId, answers: [0,1,2] }` → completion result; answers are zero-based choice indices |
| GET `/Account/Certificate?courseId=N` | Signed-in learner | A printable certificate owned by the learner who earned the course achievement |

State: `activeCourseId`, `currentIslandId`, `lastLessonId`, `hasCompletedOnboarding`, `xp`, `level`, `achievements`, `courses`.

Course progress: `courseId`, `title`, `category`, `description`, `islandKind`, `totalLessons`, `completedLessons` (IDs), `unlockedIslands` (IDs), `currentIslandId`, `lastLessonId`, `progress` (0–100), `hasStarted`, `isComplete`, `lessons`.

Lesson summary: `id`, `title`, `islandName`, `xp`, `minutes`, `status` (`current`, `completed`, `locked`). Teaching lesson adds `courseId`, `summary`, `reading` (`heading`, `text`, optional `example`), `questions` (`id`, `prompt`, `choices`). Keys and expected answers remain in server definitions.

Completion result: `passed`, `alreadyCompleted`, `score`, `totalQuestions`, `requiredCorrect`, `awardedXp`, `reward`, `feedback` (`questionId`, `correct`, `explanation`), `state`. Replaying a completed lesson yields `alreadyCompleted: true`, `awardedXp: 0`; passed still describes the current submitted attempt.

JSON failures: `{ code, message }`; 400 invalid body/answers, 403 locked lesson, 404 unknown/upcoming curriculum/lesson, 409 course not selected, 503 SQL unavailable. Anonymous JSON APIs return 401 with `loginUrl`. Island navigation uses the normal authentication challenge with its local ReturnUrl. Antiforgery validation occurs before the action and returns ASP.NET 400 when invalid/missing.

## Validation

The video workflow can be exercised with a controlled player against an isolated LocalDB instance. Verify that completion requires a recorded start. Check that seeking to the final 10% or clicking the skip button immediately opens the quiz. Verify failed attempts, both retry options, completion without duplicate rewards and certificate access from a separate account. Older snapshots that use retired course IDs do not reflect the current catalog.

## Local guest preview
In Development, `Learning:GuestPreview` defaults to true so Home can start a course without Login. Set `Learning__GuestPreview=false` to require authentication again. Outside Development anonymous learning requests always require authentication.
Guest progress uses a random identifier in a Data Protection signed, HttpOnly session cookie (`NextSkill.LearningPreview`). It is isolated from account progress, does not issue an authentication cookie, and does not grant access to account/admin endpoints. Closing the browser session may clear this cookie; guest progress is not merged into a signed-in account. Server-side lesson grading, locks and CSRF validation remain in use.
