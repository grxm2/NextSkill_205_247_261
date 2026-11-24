using System.Data;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.SqlClient;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public sealed class LearningRuleException(string code, string message, int statusCode = 409) : Exception(message)
{
    public string Code { get; } = code;
    public int StatusCode { get; } = statusCode;
}

public sealed partial class LearningStore(IConfiguration configuration, IDataProtectionProvider protection)
{
    private static readonly SemaphoreSlim SchemaLock = new(1, 1);
    private static bool schemaReady;
    public const int CourseCompletionBonus = 100;
    private readonly IDataProtector quizVersions = protection.CreateProtector("NextSkill.QuizVersion.v1");

    internal async Task<SqlConnection> OpenAsync(CancellationToken token)
    {
        var connection = new SqlConnection(configuration.GetConnectionString("NextSkill"));
        try
        {
            await connection.OpenAsync(token);
            if (!schemaReady)
            {
                await SchemaLock.WaitAsync(token);
                try
                {
                    if (!schemaReady)
                    {
                        if (!await HasCurrentSchemaAsync(connection, token))
                        {
                            if (!configuration.GetValue("Learning:AutoMigrate", true))
                                throw new InvalidOperationException("Apply scripts/LearningJourney.sql before starting the app.");

                            await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(token);
                            await using var setup = new SqlCommand(LearningSchema.Sql, connection, transaction);
                            await setup.ExecuteNonQueryAsync(token);
                            await transaction.CommitAsync(token);
                        }
                        schemaReady = true;
                    }
                }
                finally { SchemaLock.Release(); }
            }
            return connection;
        }
        catch { await connection.DisposeAsync(); throw; }
    }

    private static async Task<bool> HasCurrentSchemaAsync(SqlConnection connection, CancellationToken token)
    {
        await using var command = new SqlCommand("SELECT OBJECT_ID(N'dbo.NextSkillLearningSchema', N'U');", connection);
        if (await command.ExecuteScalarAsync(token) is not int) return false;
        command.CommandText = "SELECT 1 FROM dbo.NextSkillLearningSchema WHERE Version=@version;";
        command.Parameters.Add("@version", SqlDbType.Int).Value = LearningSchema.CurrentVersion;
        return await command.ExecuteScalarAsync(token) is not null;
    }

    private static SqlCommand Command(SqlConnection db, SqlTransaction transaction, string sql, Guid accountId, string role)
    {
        var command = new SqlCommand(sql, db, transaction);
        command.Parameters.Add("@account", SqlDbType.UniqueIdentifier).Value = accountId;
        command.Parameters.Add("@role", SqlDbType.VarChar, 10).Value = role;
        return command;
    }

    // Lock the profile first for a coherent progress snapshot across reads and writes.
    private async Task<T> WithProfileAsync<T>(Guid accountId, string role,
        Func<SqlConnection, SqlTransaction, CancellationToken, Task<T>> operation, CancellationToken token,
        bool createProfile = true)
    {
        if (role is not ("User" or "Admin")) throw new LearningRuleException("invalid_account", "ไม่พบบัญชีผู้เรียน", 403);
        await using var db = await OpenAsync(token);
        await using var transaction = (SqlTransaction)await db.BeginTransactionAsync(IsolationLevel.Serializable, token);
        await using (var profile = Command(db, transaction, """
            IF @create=1 AND NOT EXISTS (SELECT 1 FROM dbo.LearningProfiles WITH (UPDLOCK,HOLDLOCK)
                WHERE AccountId=@account AND AccountRole=@role)
                INSERT INTO dbo.LearningProfiles (AccountId,AccountRole) VALUES (@account,@role);
            SELECT AccountId FROM dbo.LearningProfiles WITH (UPDLOCK,HOLDLOCK)
                WHERE AccountId=@account AND AccountRole=@role;
            """, accountId, role))
        {
            profile.Parameters.Add("@create", SqlDbType.Bit).Value = createProfile;
            await profile.ExecuteScalarAsync(token);
        }
        var result = await operation(db, transaction, token);
        await transaction.CommitAsync(token);
        return result;
    }

    private static async Task<LearningState> ReadStateAsync(SqlConnection db, SqlTransaction transaction,
        Guid accountId, string role, CancellationToken token, bool includeActivity = false)
    {
        await using var command = Command(db, transaction, """
            SELECT ActiveCourseId,HasCompletedOnboarding,Xp FROM dbo.LearningProfiles
                WHERE AccountId=@account AND AccountRole=@role;
            SELECT CourseId,LastLessonId FROM dbo.LearningCourseProgress
                WHERE AccountId=@account AND AccountRole=@role;
            SELECT CourseId,LessonId,CompletedAt,AwardedXp FROM dbo.LearningLessonCompletions
                WHERE AccountId=@account AND AccountRole=@role;
            SELECT AchievementKey,EarnedAt FROM dbo.LearningAchievements
                WHERE AccountId=@account AND AccountRole=@role ORDER BY EarnedAt,AchievementKey;
            """, accountId, role);
        if (includeActivity)
            command.CommandText += """

                SELECT PassedAt,AwardedXp FROM dbo.LearningCourseFinalResults
                    WHERE AccountId=@account AND AccountRole=@role AND PassedAt IS NOT NULL;
                """;
        await using var reader = await command.ExecuteReaderAsync(token);
        var hasProfile = await reader.ReadAsync(token);
        int? active = hasProfile && !reader.IsDBNull(0) ? reader.GetInt32(0) : null;
        var onboarded = hasProfile && reader.GetBoolean(1);
        var xp = hasProfile ? reader.GetInt32(2) : 0;
        var started = new Dictionary<int, int?>();
        var complete = new HashSet<(int Course, int Lesson)>();
        var awards = new List<LearningAward>();
        // Daily learning goals use the calendar day in Thailand (UTC+07:00).
        var today = ThailandTime.Date(DateTime.UtcNow);
        var historyStart = today.AddDays(-LearningDailyGoals.HistoryDays);
        var learningDays = includeActivity ? new HashSet<DateOnly>() : null;
        var dayTotals = new Dictionary<DateOnly, (int Lessons, int Xp, HashSet<int> Courses)>();
        await reader.NextResultAsync(token);
        while (await reader.ReadAsync(token)) started[reader.GetInt32(0)] = reader.IsDBNull(1) ? null : reader.GetInt32(1);
        await reader.NextResultAsync(token);
        while (await reader.ReadAsync(token))
        {
            var completedCourse = reader.GetInt32(0);
            complete.Add((completedCourse, reader.GetInt32(1)));
            if (learningDays is null) continue;

            var completedDay = ThailandTime.Date(reader.GetDateTime(2));
            learningDays.Add(completedDay);
            if (completedDay < historyStart || completedDay > today) continue;

            var totals = dayTotals.GetValueOrDefault(completedDay);
            totals.Courses ??= [];
            totals.Courses.Add(completedCourse);
            dayTotals[completedDay] = (totals.Lessons + 1, totals.Xp + reader.GetInt32(3), totals.Courses);
        }
        await reader.NextResultAsync(token);
        while (await reader.ReadAsync(token)) awards.Add(new LearningAward(reader.GetString(0), reader.GetDateTime(1)));

        if (learningDays is not null)
        {
            await reader.NextResultAsync(token);
            while (await reader.ReadAsync(token))
            {
                var completedDay = ThailandTime.Date(reader.GetDateTime(0));
                learningDays.Add(completedDay);
                if (completedDay < historyStart || completedDay > today) continue;
                var totals = dayTotals.GetValueOrDefault(completedDay);
                dayTotals[completedDay] = (totals.Lessons, totals.Xp + reader.GetInt32(1), totals.Courses ?? []);
            }
        }

        var catalog = LearningCatalog.Published().ToArray();
        var prerequisites = catalog.GroupBy(course => course.Category, StringComparer.OrdinalIgnoreCase)
            .SelectMany(group => group.Zip(group.Skip(1), (previous, next) => (next.Id, Previous: previous)))
            .ToDictionary(entry => entry.Id, entry => entry.Previous);
        var earnedKeys = awards.Select(award => award.Key).ToHashSet(StringComparer.Ordinal);
        var courses = catalog.Select(course =>
        {
            var done = course.Lessons.Where(l => complete.Contains((course.Id, l.Id))).Select(l => l.Id).ToArray();
            var next = course.Lessons.FirstOrDefault(l => !complete.Contains((course.Id, l.Id)));
            var current = next?.Id ?? (course.Lessons.Length > 0 ? course.Lessons[^1].Id : 1);
            var hasStarted = started.ContainsKey(course.Id);
            var isComplete = earnedKeys.Contains(CourseAwardKey(course.Id));
            var prerequisite = prerequisites.GetValueOrDefault(course.Id);
            var isLocked = !hasStarted && !isComplete && prerequisite is not null &&
                !earnedKeys.Contains(CourseAwardKey(prerequisite.Id));
            var unlocked = course.Lessons.TakeWhile(l => complete.Contains((course.Id, l.Id))).Select(l => l.Id).ToList();
            if (!isLocked && next is not null) unlocked.Add(next.Id);
            var last = started.GetValueOrDefault(course.Id);
            if (!last.HasValue || done.Contains(last.Value) || !unlocked.Contains(last.Value)) last = next?.Id;
            return new LearningCourseProgress(course.Id, course.Title, course.Category, course.Description,
                course.IslandKind, course.Lessons.Length, done, unlocked, current, last,
                isComplete ? 100 : done.Length * 100 / (course.Lessons.Length + 1), hasStarted, isComplete,
                course.Lessons.Select(l => LearningCatalog.Summary(l,
                    done.Contains(l.Id) ? "completed" : !isLocked && l.Id == current ? "current" : "locked")).ToArray())
            { IsLocked = isLocked, PrerequisiteCourseId = prerequisite?.Id, PrerequisiteCourseTitle = prerequisite?.Title };
        }).ToArray();
        var activeProgress = courses.FirstOrDefault(c => c.CourseId == active && c.HasStarted);
        LearningActivity? activity = null;
        if (learningDays is not null)
        {
            var day = learningDays.Contains(today) ? today : today.AddDays(-1);
            var streakDays = 0;
            while (learningDays.Contains(day))
            {
                streakDays++;
                day = day.AddDays(-1);
            }
            var totals = dayTotals.GetValueOrDefault(today);
            dayTotals.Remove(today);
            activity = new LearningActivity(streakDays, totals.Lessons, totals.Xp, totals.Courses?.Count ?? 0)
            {
                RecentDays = dayTotals.ToDictionary(entry => entry.Key,
                    entry => new LearningDayProgress(entry.Value.Lessons, entry.Value.Xp, entry.Value.Courses.Count))
            };
        }
        return new LearningState(activeProgress?.CourseId, activeProgress?.CurrentIslandId, activeProgress?.LastLessonId,
            onboarded, xp, 1 + xp / LearningState.XpPerLevel, awards.Select(award => award.Key).ToArray(), courses)
        { Activity = activity, Awards = awards };
    }

    public Task<LearningState> StateAsync(Guid accountId, string role, CancellationToken token = default, bool includeActivity = false)
        => WithProfileAsync(accountId, role, (db, transaction, ct) => ReadStateAsync(db, transaction, accountId, role, ct, includeActivity),
            token, createProfile: false);

    public Task<LearningState> SelectCourseAsync(Guid accountId, string role, int courseId, CancellationToken token = default)
    {
        var course = RequireCourse(courseId);
        return WithProfileAsync(accountId, role, async (db, transaction, ct) =>
        {
            var state = await ReadStateAsync(db, transaction, accountId, role, ct);
            var candidate = state.Courses.FirstOrDefault(item => item.CourseId == course.Id)
                ?? throw new LearningRuleException("course_unavailable", "คอร์สนี้ยังไม่เปิดให้เรียน", 404);
            RequireUnlockedCourse(candidate);
            await using var command = Command(db, transaction, """
                IF NOT EXISTS (SELECT 1 FROM dbo.LearningCourseProgress
                    WHERE AccountId=@account AND AccountRole=@role AND CourseId=@course)
                    INSERT INTO dbo.LearningCourseProgress (AccountId,AccountRole,CourseId,LastLessonId)
                    VALUES (@account,@role,@course,@first);
                UPDATE dbo.LearningProfiles SET ActiveCourseId=@course,HasCompletedOnboarding=1,UpdatedAt=SYSUTCDATETIME()
                    WHERE AccountId=@account AND AccountRole=@role;
                """, accountId, role);
            command.Parameters.Add("@course", SqlDbType.Int).Value = course.Id;
            command.Parameters.Add("@first", SqlDbType.Int).Value = course.Lessons[0].Id;
            await command.ExecuteNonQueryAsync(ct);
            return await ReadStateAsync(db, transaction, accountId, role, ct);
        }, token);
    }

    public Task<LearningState> CheckpointAsync(Guid accountId, string role, int courseId, int lessonId, CancellationToken token = default)
    {
        RequireLesson(courseId, lessonId);
        return WithProfileAsync(accountId, role, async (db, transaction, ct) =>
        {
            var state = await ReadStateAsync(db, transaction, accountId, role, ct);
            var course = RequireAccess(state, courseId, lessonId);
            if (course.CompletedLessons.Contains(lessonId)) return state;

            await using var command = Command(db, transaction, """
                UPDATE dbo.LearningCourseProgress SET LastLessonId=@lesson,UpdatedAt=SYSUTCDATETIME()
                    WHERE AccountId=@account AND AccountRole=@role AND CourseId=@course;
                """, accountId, role);
            command.Parameters.Add("@course", SqlDbType.Int).Value = courseId;
            command.Parameters.Add("@lesson", SqlDbType.Int).Value = lessonId;
            await command.ExecuteNonQueryAsync(ct);
            return await ReadStateAsync(db, transaction, accountId, role, ct);
        }, token);
    }

    private static SqlCommand VideoCommand(SqlConnection db, SqlTransaction transaction, string sql,
        Guid accountId, string role, int courseId, LearningLessonDefinition lesson)
    {
        var command = Command(db, transaction, sql, accountId, role);
        command.Parameters.Add("@course", SqlDbType.Int).Value = courseId;
        command.Parameters.Add("@lesson", SqlDbType.Int).Value = lesson.Id;
        command.Parameters.Add("@video", SqlDbType.VarChar, 11).Value = lesson.Video!.YouTubeId;
        return command;
    }

    private static async Task<bool> CanTakeQuizAsync(SqlConnection db, SqlTransaction transaction, Guid accountId,
        string role, int courseId, LearningLessonDefinition lesson, CancellationToken token)
    {
        if (lesson.Video is null) return lesson.Reading.Length > 0;
        await using var command = VideoCommand(db, transaction, """
            SELECT 1 FROM dbo.LearningLessonVideos
            WHERE AccountId=@account AND AccountRole=@role AND CourseId=@course AND LessonId=@lesson AND VideoId=@video;
            """, accountId, role, courseId, lesson);
        return await command.ExecuteScalarAsync(token) is not null;
    }

    public Task<LearningLessonContent> LessonAsync(Guid accountId, string role, int courseId, int lessonId, CancellationToken token = default)
    {
        var lesson = RequireLesson(courseId, lessonId);
        return WithProfileAsync(accountId, role, async (db, transaction, ct) =>
        {
            var state = await ReadStateAsync(db, transaction, accountId, role, ct);
            var progress = RequireAccess(state, courseId, lessonId);
            var unlocked = await CanTakeQuizAsync(db, transaction, accountId, role, courseId, lesson, ct);
            return LessonContent(accountId, role, courseId, lesson,
                progress.CompletedLessons.Contains(lessonId) ? "completed" : "current", unlocked);
        }, token, createProfile: false);
    }

    private LearningLessonContent LessonContent(Guid accountId, string role, int courseId,
        LearningLessonDefinition lesson, string status, bool unlocked)
    {
        var content = LearningCatalog.PublicLesson(courseId, lesson, status, unlocked);
        return unlocked
            ? content with { QuizVersion = quizVersions.Protect(QuizStamp(accountId, role, courseId, lesson.Id, lesson.Questions)) }
            : content;
    }

    private static string QuizStamp(Guid accountId, string role, int courseId, int lessonId, LearningQuizDefinition[] questions)
    {
        var digest = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(questions)));
        return $"{accountId:N}:{role}:{courseId}:{lessonId}:{digest}";
    }

    private bool QuizVersionMatches(string? version, Guid accountId, string role, int courseId, int lessonId,
        LearningQuizDefinition[] questions)
    {
        if (string.IsNullOrEmpty(version)) return false;
        try
        {
            return string.Equals(quizVersions.Unprotect(version), QuizStamp(accountId, role, courseId, lessonId, questions),
                StringComparison.Ordinal);
        }
        catch (CryptographicException)
        {
            return false;
        }
    }

    private static LearningLessonDefinition RequireVideo(LearningVideoRequest request)
    {
        var lesson = RequireLesson(request.CourseId, request.LessonId);
        if (lesson.Video is null || !string.Equals(lesson.Video.YouTubeId, request.VideoId, StringComparison.Ordinal))
            throw new LearningRuleException("video_unavailable", "วิดีโอของบทเรียนเปลี่ยนแล้ว กรุณาเปิดบทเรียนใหม่", 409);
        return lesson;
    }

    public Task<bool> StartVideoAsync(Guid accountId, string role, LearningVideoRequest request,
        CancellationToken token = default)
    {
        var lesson = RequireVideo(request);
        return WithProfileAsync(accountId, role, async (db, transaction, ct) =>
        {
            var state = await ReadStateAsync(db, transaction, accountId, role, ct);
            RequireAccess(state, request.CourseId, request.LessonId);
            await using var command = VideoCommand(db, transaction, """
                IF NOT EXISTS (SELECT 1 FROM dbo.LearningVideoWatchStarts
                    WHERE AccountId=@account AND AccountRole=@role AND CourseId=@course AND LessonId=@lesson)
                    INSERT INTO dbo.LearningVideoWatchStarts (AccountId,AccountRole,CourseId,LessonId,VideoId)
                    VALUES (@account,@role,@course,@lesson,@video);
                ELSE
                    UPDATE dbo.LearningVideoWatchStarts SET VideoId=@video,StartedAt=SYSUTCDATETIME()
                    WHERE AccountId=@account AND AccountRole=@role AND CourseId=@course AND LessonId=@lesson AND VideoId<>@video;
                """, accountId, role, request.CourseId, lesson);
            await command.ExecuteNonQueryAsync(ct);
            return true;
        }, token);
    }

    public Task<LearningLessonContent> CompleteVideoAsync(Guid accountId, string role, CompleteLearningVideoRequest request,
        CancellationToken token = default)
    {
        var lesson = RequireVideo(request);
        var video = lesson.Video!;
        var positionSeconds = request.PositionSeconds ?? request.WatchedSeconds;

        return WithProfileAsync(accountId, role, async (db, transaction, ct) =>
        {
            var state = await ReadStateAsync(db, transaction, accountId, role, ct);
            var progress = RequireAccess(state, request.CourseId, request.LessonId);
            var status = progress.CompletedLessons.Contains(request.LessonId) ? "completed" : "current";
            if (await CanTakeQuizAsync(db, transaction, accountId, role, request.CourseId, lesson, ct))
                return LessonContent(accountId, role, request.CourseId, lesson, status, true);

            if (!request.SkipVideo && (positionSeconds < video.RequiredPositionSeconds || positionSeconds > video.DurationSeconds))
                throw new LearningRuleException("video_required", "เลื่อนวิดีโอไปช่วงท้าย หรือกดข้ามเพื่อเริ่มแบบทดสอบ", 403);
            await using var watch = VideoCommand(db, transaction, """
                SELECT 1 FROM dbo.LearningVideoWatchStarts
                WHERE AccountId=@account AND AccountRole=@role AND CourseId=@course AND LessonId=@lesson AND VideoId=@video;
                """, accountId, role, request.CourseId, lesson);
            if (await watch.ExecuteScalarAsync(ct) is null)
                throw new LearningRuleException("video_required", "เปิดวิดีโอก่อนเริ่มแบบทดสอบ", 403);

            await using var command = VideoCommand(db, transaction, """
                UPDATE dbo.LearningLessonVideos SET VideoId=@video, ReachedEndAt=SYSUTCDATETIME()
                WHERE AccountId=@account AND AccountRole=@role AND CourseId=@course AND LessonId=@lesson;
                IF @@ROWCOUNT=0
                    INSERT INTO dbo.LearningLessonVideos (AccountId,AccountRole,CourseId,LessonId,VideoId)
                    VALUES (@account,@role,@course,@lesson,@video);
                """, accountId, role, request.CourseId, lesson);
            await command.ExecuteNonQueryAsync(ct);
            return LessonContent(accountId, role, request.CourseId, lesson, status, true);
        }, token);
    }

    public Task<LearningLessonContent> RestartVideoAsync(Guid accountId, string role, LearningVideoRequest request,
        CancellationToken token = default)
    {
        var lesson = RequireVideo(request);
        return WithProfileAsync(accountId, role, async (db, transaction, ct) =>
        {
            var state = await ReadStateAsync(db, transaction, accountId, role, ct);
            var progress = RequireAccess(state, request.CourseId, request.LessonId);
            await using var command = VideoCommand(db, transaction, """
                DELETE FROM dbo.LearningLessonVideos
                WHERE AccountId=@account AND AccountRole=@role AND CourseId=@course AND LessonId=@lesson;
                DELETE FROM dbo.LearningVideoWatchStarts
                WHERE AccountId=@account AND AccountRole=@role AND CourseId=@course AND LessonId=@lesson;
                """, accountId, role, request.CourseId, lesson);
            await command.ExecuteNonQueryAsync(ct);
            return LearningCatalog.PublicLesson(request.CourseId, lesson,
                progress.CompletedLessons.Contains(request.LessonId) ? "completed" : "current", false);
        }, token);
    }

    public Task<LearningCompletion> CompleteAsync(Guid accountId, string role, CompleteLearningLessonRequest request, CancellationToken token = default)
    {
        var lesson = RequireLesson(request.CourseId, request.LessonId);
        return WithProfileAsync(accountId, role, async (db, transaction, ct) =>
        {
            var state = await ReadStateAsync(db, transaction, accountId, role, ct);
            var progress = RequireAccess(state, request.CourseId, request.LessonId);
            if (!await CanTakeQuizAsync(db, transaction, accountId, role, request.CourseId, lesson, ct))
                throw new LearningRuleException("video_required", "เปิดวิดีโอแล้วเลื่อนไปช่วงท้ายหรือกดข้ามก่อนทำแบบทดสอบ", 403);
            if (!QuizVersionMatches(request.QuizVersion, accountId, role, request.CourseId, lesson.Id, lesson.Questions))
                throw new LearningRuleException("quiz_changed", "แบบทดสอบเปลี่ยนแล้ว กรุณาเปิดบทเรียนใหม่ก่อนส่งคำตอบ");
            if (!ValidAnswers(lesson.Questions, request.Answers))
                throw new LearningRuleException("invalid_answers", "กรุณาตอบคำถามทุกข้อให้ครบ", 400);

            var feedback = lesson.Questions.Select((question, index) => new LearningFeedback(question.Id,
                request.Answers[index] == question.CorrectChoice, question.Explanation)).ToArray();
            var score = feedback.Count(item => item.Correct);
            var passed = score >= lesson.RequiredCorrect;
            var alreadyCompleted = progress.CompletedLessons.Contains(request.LessonId);
            if (!passed)
                return new LearningCompletion(false, alreadyCompleted, score, lesson.Questions.Length, lesson.RequiredCorrect, 0,
                    "ดูคำอธิบาย แล้วเลือกเรียนใหม่หรือสอบใหม่ได้", feedback, state);
            if (alreadyCompleted)
                return new LearningCompletion(passed, true, score, lesson.Questions.Length, lesson.RequiredCorrect, 0,
                    "ทบทวนบทเรียนแล้ว — ได้รับ XP ของบทนี้ไปแล้ว", feedback, state);

            var finishingLessons = progress.CompletedLessons.Count + 1 == progress.TotalLessons;
            var reward = lesson.Xp;
            var next = progress.Lessons.FirstOrDefault(l => l.Id > request.LessonId)?.Id;
            await using (var command = Command(db, transaction, """
                INSERT INTO dbo.LearningLessonCompletions (AccountId,AccountRole,CourseId,LessonId,AwardedXp)
                    VALUES (@account,@role,@course,@lesson,@reward);
                UPDATE dbo.LearningProfiles SET Xp=Xp+@reward,UpdatedAt=SYSUTCDATETIME()
                    WHERE AccountId=@account AND AccountRole=@role;
                UPDATE dbo.LearningCourseProgress SET LastLessonId=@next,UpdatedAt=SYSUTCDATETIME()
                    WHERE AccountId=@account AND AccountRole=@role AND CourseId=@course;
                IF NOT EXISTS (SELECT 1 FROM dbo.LearningAchievements
                    WHERE AccountId=@account AND AccountRole=@role AND AchievementKey='first-lesson')
                    INSERT INTO dbo.LearningAchievements (AccountId,AccountRole,AchievementKey)
                    VALUES (@account,@role,'first-lesson');
                """, accountId, role))
            {
                command.Parameters.Add("@course", SqlDbType.Int).Value = request.CourseId;
                command.Parameters.Add("@lesson", SqlDbType.Int).Value = request.LessonId;
                command.Parameters.Add("@reward", SqlDbType.Int).Value = reward;
                command.Parameters.Add("@next", SqlDbType.Int).Value = (object?)next ?? DBNull.Value;
                await command.ExecuteNonQueryAsync(ct);
            }
            var message = finishingLessons && !progress.IsComplete
                ? "ผ่านครบทุกบทแล้ว ทำแบบทดสอบท้ายคอร์สเพื่อจบคอร์สนี้"
                : "ผ่านบทเรียนแล้ว";
            return new LearningCompletion(true, false, score, lesson.Questions.Length, lesson.RequiredCorrect, reward,
                message, feedback, await ReadStateAsync(db, transaction, accountId, role, ct));
        }, token);
    }

    private static bool ValidAnswers(LearningQuizDefinition[] questions, int[]? answers) =>
        answers is not null && answers.Length == questions.Length &&
        !answers.Where((choice, index) => choice < 0 || choice >= questions[index].Choices.Length).Any();

    public static void RequireUnlockedCourse(LearningCourseProgress course)
    {
        if (course.IsLocked)
            throw new LearningRuleException("course_locked", $"ผ่านแบบทดสอบท้ายคอร์ส “{course.PrerequisiteCourseTitle}” ก่อนเริ่มคอร์สนี้", 403);
    }

    public async Task<int> HighestRecordedCourseIdAsync(CancellationToken token)
    {
        await using var db = await OpenAsync(token);
        await using var command = new SqlCommand("""
            SELECT COALESCE(MAX(CourseId), 0) FROM (
                SELECT CourseId FROM dbo.LearningCourseProgress
                UNION ALL
                SELECT ActiveCourseId FROM dbo.LearningProfiles
                UNION ALL
                SELECT TRY_CONVERT(int, SUBSTRING(AchievementKey, 8, 80))
                FROM dbo.LearningAchievements WHERE AchievementKey LIKE 'course-%'
            ) AS RecordedCourses;
            """, db);
        return Convert.ToInt32(await command.ExecuteScalarAsync(token));
    }

    public static LearningCourseDefinition RequireCourse(int courseId)
        => LearningCatalog.Find(courseId) is { CanStart: true } course
            ? course : throw new LearningRuleException("course_unavailable", "เส้นทางนี้ยังไม่เปิดให้เรียน", 404);
    public static LearningLessonDefinition RequireLesson(int courseId, int lessonId)
        => RequireCourse(courseId).Lessons.FirstOrDefault(l => l.Id == lessonId)
            ?? throw new LearningRuleException("lesson_not_found", "ไม่พบบทเรียนนี้", 404);
    public static LearningCourseProgress RequireAccess(LearningState state, int courseId, int lessonId)
    {
        var course = state.Courses.FirstOrDefault(c => c.CourseId == courseId)
            ?? throw new LearningRuleException("course_unavailable", "เส้นทางนี้ยังไม่เปิดให้เรียน", 404);
        RequireUnlockedCourse(course);
        if (!course.HasStarted) throw new LearningRuleException("course_not_selected", "เลือกคอร์สนี้ก่อนเริ่มเรียน", 409);
        if (!course.UnlockedIslands.Contains(lessonId)) throw new LearningRuleException("lesson_locked", "เรียนด่านก่อนหน้าให้ผ่านเพื่อเปิดเกาะนี้", 403);
        return course;
    }
}
