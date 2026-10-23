# Smart Learning Journey backend

NextSkill stores learning progress in the configured `ConnectionStrings:NextSkill` SQL Server database. It uses the existing signed cookie, account GUID and role (`User` or `Admin`); a browser never chooses an account ID. This is separate from all previous demo XP and browser-only island unlocks.

## Data and deployment

- Existing users, admins, invitation codes, password hashing and authentication remain in place.
- Four additive tables are created idempotently on the first authenticated learning read: `LearningProfiles`, `LearningCourseProgress`, `LearningLessonCompletions`, `LearningAchievements`.
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

Three independent paths are ready: English for Work (13), UX Research (1), JavaScript Basics (5). Each has four teaching lessons, each with three server-graded questions. All other existing catalog entries are visible as upcoming rather than falsely startable.

Passing requires all three questions correct. Each first completion grants 50 XP; finishing a course grants another 100 XP and a course achievement. Total per course: 300 XP. The first completion grants `first-lesson`; course badges use `course-13`, `course-1`, `course-5`. Retakes are allowed without additional XP. Failure gives explanations but no completion/unlock/XP.

All reads/writes for one learner serialize on the same profile lock inside a SQL transaction. Unique completion/achievement primary keys plus atomic completion, XP and next-lesson writes prevent duplicate rewards from retries or simultaneous tabs. Independent courses preserve their progress when switched.

## HTTP contract

JSON uses camelCase. All account state responses use `Cache-Control: no-store`. Every POST requires the existing ASP.NET antiforgery cookie and token in `X-CSRF-TOKEN` (the rendered `@Html.AntiForgeryToken()` provides the token).

| Endpoint | Access | Result |
| --- | --- | --- |
| GET `/Learning/Catalog` | Public | `{ courses: [...] }`, all 13 entries, `canStart`, zero-based-path-independent course IDs, lesson summaries |
| GET `/Learning/State` | Authenticated | Persisted LearningState |
| POST `/Learning/SelectCourse` | Authenticated | `{ courseId }` → LearningState; creates only that course if new, changes active pointer, never clears old course |
| GET `/Learning/Island?courseId=N&lessonId=M` | Authenticated | Island Razor view; optional course defaults to active, optional lesson deep link is validated |
| GET `/Learning/Lesson?courseId=N&lessonId=M` | Authenticated | Public teaching/quiz projection; no grading keys |
| POST `/Learning/Checkpoint` | Authenticated | `{ courseId, lessonId }` → LearningState; stores an unlocked unfinished lesson without completing it |
| POST `/Learning/CompleteLesson` | Authenticated | `{ courseId, lessonId, answers: [0,1,2] }` → completion result; answers are zero-based choice indices |

State: `activeCourseId`, `currentIslandId`, `lastLessonId`, `hasCompletedOnboarding`, `xp`, `level`, `achievements`, `courses`.

Course progress: `courseId`, `title`, `category`, `description`, `islandKind`, `totalLessons`, `completedLessons` (IDs), `unlockedIslands` (IDs), `currentIslandId`, `lastLessonId`, `progress` (0–100), `hasStarted`, `isComplete`, `lessons`.

Lesson summary: `id`, `title`, `islandName`, `xp`, `minutes`, `status` (`current`, `completed`, `locked`). Teaching lesson adds `courseId`, `summary`, `reading` (`heading`, `text`, optional `example`), `questions` (`id`, `prompt`, `choices`). Keys and expected answers remain in server definitions.

Completion result: `passed`, `alreadyCompleted`, `score`, `totalQuestions`, `requiredCorrect`, `awardedXp`, `reward`, `feedback` (`questionId`, `correct`, `explanation`), `state`. Replaying a completed lesson yields `alreadyCompleted: true`, `awardedXp: 0`; passed still describes the current submitted attempt.

JSON failures: `{ code, message }`; 400 invalid body/answers, 403 locked lesson, 404 unknown/upcoming curriculum/lesson, 409 course not selected, 503 SQL unavailable. Anonymous JSON APIs return 401 with `loginUrl`. Island navigation uses the normal authentication challenge with its local ReturnUrl. Antiforgery validation occurs before the action and returns ASP.NET 400 when invalid/missing.

## Validation

The backend build has zero errors. The eight existing nullable warnings remain in legacy Course/Lesson models and Home Courses/Details Razor. Integration verification uses real registration/password login and SQL persistence, including a second browser session, independent account isolation, switching, locked lessons, incorrect answers, CSRF, duplicate/concurrent reward attempts and completed-course routing. QA accounts are temporary and cleaned by exact recorded GUID after tests; no existing user progress is reset.

## Local guest preview
In Development, `Learning:GuestPreview` defaults to true so Home can start a course without Login. Set `Learning__GuestPreview=false` to require authentication again. Outside Development anonymous learning requests always require authentication.
Guest progress uses a random identifier in a Data Protection signed, HttpOnly session cookie (`NextSkill.LearningPreview`). It is isolated from account progress, does not issue an authentication cookie, and does not grant access to account/admin endpoints. Closing the browser session may clear this cookie; guest progress is not merged into a signed-in account. Server-side lesson grading, locks and CSRF validation remain in use.
