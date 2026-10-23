using System.ComponentModel.DataAnnotations;

namespace NextSkill_205_247_261.Models;

public sealed record LearningLessonSummary(int Id, string Title, string IslandName, int Xp, int Minutes, string Status);
public sealed record LearningCatalogCourse(int Id, string Title, string Category, string Description,
    string IslandKind, int TotalLessons, bool CanStart, IReadOnlyList<LearningLessonSummary> Lessons)
{
    public int CourseId => Id;
}
public sealed record LearningCourseProgress(int CourseId, string Title, string Category, string Description,
    string IslandKind, int TotalLessons, IReadOnlyList<int> CompletedLessons, IReadOnlyList<int> UnlockedIslands,
    int CurrentIslandId, int? LastLessonId, int Progress, bool HasStarted, bool IsComplete,
    IReadOnlyList<LearningLessonSummary> Lessons);
public sealed record LearningState(int? ActiveCourseId, int? CurrentIslandId, int? LastLessonId,
    bool HasCompletedOnboarding, int Xp, int Level, IReadOnlyList<string> Achievements,
    IReadOnlyList<LearningCourseProgress> Courses);
public sealed record LearningReading(string Heading, string Text, string? Example = null);
public sealed record LearningQuestion(int Id, string Prompt, IReadOnlyList<string> Choices);
public sealed record LearningLessonContent(int CourseId, int Id, string Title, string IslandName,
    string Summary, IReadOnlyList<LearningReading> Reading, IReadOnlyList<LearningQuestion> Questions,
    int Xp, int Minutes, string Status);
public sealed record LearningFeedback(int QuestionId, bool Correct, string Explanation);
public sealed record LearningCompletion(bool Passed, bool AlreadyCompleted, int Score, int TotalQuestions,
    int RequiredCorrect, int AwardedXp, string Reward, IReadOnlyList<LearningFeedback> Feedback, LearningState State);
public sealed class LearningIslandViewModel
{
    public required LearningState State { get; init; }
    public required LearningCourseProgress Course { get; init; }
    public string LearnerName { get; init; } = "ผู้เรียน";
    public int? InitialLessonId { get; init; }
    public string? ErrorMessage { get; init; }
}
public sealed class SelectLearningCourseRequest
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
}
