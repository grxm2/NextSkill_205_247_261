using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace NextSkill_205_247_261.Models;

public sealed record LearningLessonSummary(int Id, string Title, string IslandName, int Xp, int Minutes, string Status)
{
    public string DisplayTitle
    {
        get
        {
            var separator = Title.IndexOfAny([':', '：']);
            if (separator <= 0) return Title;
            var prefix = Title[..separator].TrimEnd();
            if (prefix != $"บทเรียนที่ {Id}" && prefix != $"บทที่ {Id}") return Title;

            var name = Title[(separator + 1)..].Trim();
            return name.Length > 0 ? name : Title;
        }
    }
}
public sealed record LearningCatalogCourse(int Id, string Title, string Category, string Description,
    string IslandKind, int TotalLessons, bool CanStart, IReadOnlyList<LearningLessonSummary> Lessons)
{
    public int CourseId => Id;
    public int LessonXpTotal => Lessons.Sum(lesson => lesson.Xp);
}
public sealed record LearningCourseProgress(int CourseId, string Title, string Category, string Description,
    string IslandKind, int TotalLessons, IReadOnlyList<int> CompletedLessons, IReadOnlyList<int> UnlockedIslands,
    int CurrentIslandId, int? LastLessonId, int Progress, bool HasStarted, bool IsComplete,
    IReadOnlyList<LearningLessonSummary> Lessons)
{
    public bool HasFinishedLessons => TotalLessons > 0 && CompletedLessons.Count == TotalLessons;
    public bool FinalQuizReady => HasStarted && HasFinishedLessons && !IsComplete;
    public bool IsLocked { get; init; }
    public int? PrerequisiteCourseId { get; init; }
    public string? PrerequisiteCourseTitle { get; init; }
}
public sealed record LearningState(int? ActiveCourseId, int? CurrentIslandId, int? LastLessonId,
    bool HasCompletedOnboarding, int Xp, int Level, IReadOnlyList<string> Achievements,
    IReadOnlyList<LearningCourseProgress> Courses)
{
    public const int XpPerLevel = 200;
    public int LevelXp => Xp % XpPerLevel;
    public int XpUntilNextLevel => XpPerLevel - LevelXp;
    public int CompletedCourseCount => Achievements.Count(key => key.StartsWith("course-", StringComparison.Ordinal));

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public LearningActivity? Activity { get; init; }

    [JsonIgnore]
    public IReadOnlyList<LearningAward> Awards { get; init; } = [];
}

public sealed record LearningAward(string Key, DateTime EarnedAt);
public sealed record LearningDayProgress(int Lessons, int Xp, int Courses);
public sealed record LearningActivity(int StreakDays, int LessonsToday, int XpToday, int CoursesToday)
{
    public IReadOnlyList<DailyGoalStatus> Goals => LearningDailyGoals.All
        .Select(goal => new DailyGoalStatus(goal.Key, goal.Unit, goal.ReadProgress(Today), goal.Target, goal.IsComplete(Today)))
        .ToArray();

    [JsonIgnore]
    public LearningDayProgress Today => new(LessonsToday, XpToday, CoursesToday);

    [JsonIgnore]
    public IReadOnlyDictionary<DateOnly, LearningDayProgress> RecentDays { get; init; } =
        new Dictionary<DateOnly, LearningDayProgress>();
}
public sealed record LearningReading(string Heading, string Text, string? Example = null);
public sealed record LearningQuestion(int Id, string Prompt, IReadOnlyList<string> Choices, string? Hint, string? Coaching);
public sealed record LearningLessonVideo(string YouTubeId, int DurationSeconds, string Creator, string? Title)
{
    public int RequiredPositionSeconds => (int)Math.Ceiling(DurationSeconds * 0.9m);
    public int RequiredWatchSeconds => RequiredPositionSeconds;
}
public sealed record LearningLessonContent(int CourseId, int Id, string Title, string IslandName,
    string Summary, IReadOnlyList<LearningReading> Reading, IReadOnlyList<LearningQuestion> Questions,
    int Xp, int Minutes, string Status, int QuestionCount, int RequiredCorrect, LearningLessonVideo? Video, bool VideoUnlocked)
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? QuizVersion { get; init; }
}
public sealed record LearningFeedback(int QuestionId, bool Correct, string Explanation);
public sealed record LearningCompletion(bool Passed, bool AlreadyCompleted, int Score, int TotalQuestions,
    int RequiredCorrect, int AwardedXp, string Reward, IReadOnlyList<LearningFeedback> Feedback, LearningState State);
public sealed record CourseFinalQuizPage(int CourseId, string CourseTitle, IReadOnlyList<LearningQuestion> Questions,
    int RequiredCorrect, string? QuizVersion, bool AlreadyCompleted, int? NextCourseId, string? NextCourseTitle,
    CourseFinalResult? Result = null, string? Error = null, int ErrorStatus = 400);
public sealed record CourseFinalResult(bool Passed, int Score, int TotalQuestions, int RequiredCorrect, int AwardedXp);
public sealed class CourseFinalQuizSubmission : SelectLearningCourseRequest
{
    [Required, StringLength(1024)] public string? QuizVersion { get; set; }
    [Required, MinLength(1), MaxLength(20)] public int[] Answers { get; set; } = [];
}
public sealed class LearningIslandViewModel
{
    public required LearningState State { get; init; }
    public required LearningCourseProgress Course { get; init; }
    public string LearnerName { get; init; } = "ผู้เรียน";
    public int? InitialLessonId { get; init; }
    public string? ErrorMessage { get; init; }
}
public class SelectLearningCourseRequest
{
    [Range(1, int.MaxValue)] public int CourseId { get; set; }
}
public class LearningCheckpointRequest
{
    [Range(1, int.MaxValue)] public int CourseId { get; set; }
    [Range(1, int.MaxValue)] public int LessonId { get; set; }
}
public sealed class CompleteLearningLessonRequest : LearningCheckpointRequest
{
    [Required, MinLength(1), MaxLength(20)] public int[] Answers { get; set; } = [];
    [StringLength(1024)] public string? QuizVersion { get; set; }
}
public class LearningVideoRequest : LearningCheckpointRequest
{
    [Required, StringLength(11, MinimumLength = 11)] public string VideoId { get; set; } = "";
}
public sealed class CompleteLearningVideoRequest : LearningVideoRequest
{
    [Range(0, 7200)] public int? PositionSeconds { get; set; }
    [Range(0, 7200)] public int WatchedSeconds { get; set; }
    public bool SkipVideo { get; set; }
}
