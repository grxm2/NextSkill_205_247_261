using System.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.SqlClient;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public sealed partial class LearningStore
{
    public Task<CourseFinalQuizPage> FinalQuizAsync(Guid accountId, string role, int courseId, CancellationToken token)
        => WithProfileAsync(accountId, role, async (db, transaction, ct) =>
        {
            var state = await ReadStateAsync(db, transaction, accountId, role, ct);
            var progress = RequireFinalAccess(state, courseId);
            var course = RequireCourse(courseId);
            return BuildFinalQuizPage(accountId, role, course, progress.IsComplete, state);
        }, token, createProfile: false);

    public Task<CourseFinalQuizPage> CompleteFinalQuizAsync(Guid accountId, string role,
        CourseFinalQuizSubmission request, CancellationToken token)
        => WithProfileAsync(accountId, role, async (db, transaction, ct) =>
        {
            var state = await ReadStateAsync(db, transaction, accountId, role, ct);
            var progress = RequireFinalAccess(state, request.CourseId);
            var course = RequireCourse(request.CourseId);
            if (progress.IsComplete)
                return BuildFinalQuizPage(accountId, role, course, true, state);

            var questions = course.FinalQuestions;
            if (!QuizVersionMatches(request.QuizVersion, accountId, role, course.Id, AdminQuizQuestion.FinalQuizLessonId, questions))
                return BuildFinalQuizPage(accountId, role, course, false, state) with
                { Error = "ข้อสอบท้ายคอร์สเปลี่ยนแล้ว กรุณาตอบชุดคำถามที่แสดงอยู่ตอนนี้", ErrorStatus = 409 };

            if (!ValidAnswers(questions, request.Answers))
                return BuildFinalQuizPage(accountId, role, course, false, state) with
                { Error = "กรุณาตอบคำถามทุกข้อให้ครบ" };
            var score = questions.Where((question, index) => question.CorrectChoice == request.Answers[index]).Count();
            var required = LearningQuizDefinition.RequiredCorrect(questions.Length);
            var passed = score >= required;
            var xp = passed ? CourseCompletionBonus : 0;
            await SaveFinalResultAsync(db, transaction, accountId, role, course.Id, score, questions.Length, passed, xp, ct);

            if (passed) await AwardCourseAsync(db, transaction, accountId, role, course.Id, progress.Title, ct);

            return BuildFinalQuizPage(accountId, role, course, passed, state) with
            { Result = new CourseFinalResult(passed, score, questions.Length, required, xp) };
        }, token, createProfile: false);

    private CourseFinalQuizPage BuildFinalQuizPage(Guid accountId, string role, LearningCourseDefinition course,
        bool completed, LearningState state)
    {
        var next = completed ? state.Courses.FirstOrDefault(item => item.PrerequisiteCourseId == course.Id) : null;
        var questions = completed ? Array.Empty<LearningQuestion>() : course.FinalQuestions
            .Select(question => LearningCatalog.PublicQuestion(question) with { Hint = null, Coaching = null }).ToArray();
        var version = completed ? null : quizVersions.Protect(QuizStamp(accountId, role, course.Id,
            AdminQuizQuestion.FinalQuizLessonId, course.FinalQuestions));
        return new CourseFinalQuizPage(course.Id, course.Title, questions,
            LearningQuizDefinition.RequiredCorrect(course.FinalQuestions.Length), version, completed,
            next?.CourseId, next?.Title);
    }

    private static LearningCourseProgress RequireFinalAccess(LearningState state, int courseId)
    {
        var course = state.Courses.FirstOrDefault(item => item.CourseId == courseId)
            ?? throw new LearningRuleException("course_unavailable", "คอร์สนี้ยังไม่เปิดให้เรียน", 404);
        RequireUnlockedCourse(course);
        if (!course.FinalQuizReady && !course.IsComplete)
            throw new LearningRuleException("final_quiz_locked", "เรียนและผ่านแบบทดสอบทุกบทก่อนทำแบบทดสอบท้ายคอร์ส", 403);
        return course;
    }

    private static async Task SaveFinalResultAsync(SqlConnection db, SqlTransaction transaction, Guid accountId,
        string role, int courseId, int score, int questionCount, bool passed, int xp, CancellationToken token)
    {
        await using var command = Command(db, transaction, """
            DECLARE @completed datetime2 = CASE WHEN @passed=1 THEN SYSUTCDATETIME() ELSE NULL END;
            UPDATE dbo.LearningCourseFinalResults
                SET Attempts=Attempts+1,Score=@score,QuestionCount=@questionCount,
                    LastAttemptAt=SYSUTCDATETIME(),PassedAt=@completed,AwardedXp=@xp
                WHERE AccountId=@account AND AccountRole=@role AND CourseId=@course;
            IF @@ROWCOUNT=0
                INSERT INTO dbo.LearningCourseFinalResults
                    (AccountId,AccountRole,CourseId,Attempts,Score,QuestionCount,PassedAt,AwardedXp)
                VALUES (@account,@role,@course,1,@score,@questionCount,@completed,@xp);
            IF @passed=1
                UPDATE dbo.LearningProfiles SET Xp=Xp+@xp,UpdatedAt=SYSUTCDATETIME()
                    WHERE AccountId=@account AND AccountRole=@role;
            """, accountId, role);
        command.Parameters.Add("@course", SqlDbType.Int).Value = courseId;
        command.Parameters.Add("@score", SqlDbType.Int).Value = score;
        command.Parameters.Add("@questionCount", SqlDbType.Int).Value = questionCount;
        command.Parameters.Add("@passed", SqlDbType.Bit).Value = passed;
        command.Parameters.Add("@xp", SqlDbType.Int).Value = xp;
        await command.ExecuteNonQueryAsync(token);
    }
}
