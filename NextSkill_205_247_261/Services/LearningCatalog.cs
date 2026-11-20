using System.Text.RegularExpressions;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public sealed record LearningQuizDefinition(int Id, string Prompt, string[] Choices, int CorrectChoice, string Explanation,
    string? Hint, string? Coaching);
public sealed record LearningLessonDefinition(int Id, string Title, string IslandName, string Summary,
    LearningReading[] Reading, LearningQuizDefinition[] Questions, int Minutes, int Xp, LearningLessonVideo? Video)
{
    public int RequiredCorrect => Questions.Length / 2 + 1;
}

public sealed record LearningCourseDefinition(int Id, string Title, string Category, string Description,
    string IslandKind, LearningLessonDefinition[] Lessons)
{
    public bool CanStart => Lessons.Length > 0 &&
        Lessons.All(lesson => (lesson.Video is not null || lesson.Reading.Length > 0) &&
            lesson.Questions.Length is >= 1 and <= 20);
}

public static partial class LearningCatalog
{
    [GeneratedRegex(@"\A[A-Za-z0-9_-]{11}\z")]
    private static partial Regex YouTubeId();

    public static LearningCourseDefinition? Find(int id)
    {
        var course = CourseCatalog.GetCourses().FirstOrDefault(item => item.Id == id);
        return course is null ? null : Build(course, AdminContentStore.GetAllQuestions(id).ToLookup(question => question.LessonId));
    }

    private static LearningCourseDefinition[] All()
    {
        var questions = AdminContentStore.GetAllQuestions().ToLookup(question => question.CourseId);
        return CourseCatalog.GetCourses()
            .OrderBy(course => course.Id)
            .Select(course => Build(course, questions[course.Id].ToLookup(question => question.LessonId)))
            .ToArray();
    }

    public static IEnumerable<LearningCourseDefinition> Published() => All().Where(course => course.CanStart);

    private static LearningCourseDefinition Build(Course course, ILookup<int, AdminQuizQuestion> questions)
    {
        var islandKind = course.Category switch
        {
            "Languages" or "Language" => "english",
            "Design" => "ux",
            "Technology" or "Development" => "javascript",
            _ => "destination"
        };

        var lessons = course.Lessons.OrderBy(lesson => lesson.Id).Select(lesson =>
        {
            var video = lesson.VideoId is { } id && YouTubeId().IsMatch(id) && lesson.VideoDurationSeconds is > 0 and <= 7200
                ? new LearningLessonVideo(id, lesson.VideoDurationSeconds, lesson.VideoCreator ?? "YouTube", lesson.VideoTitle)
                : null;
            var quiz = questions[lesson.Id]
                .Where(question => !string.IsNullOrWhiteSpace(question.Prompt) &&
                    question.Choices.Count >= 2 &&
                    question.CorrectChoice >= 0 && question.CorrectChoice < question.Choices.Count &&
                    question.Choices.All(choice => !string.IsNullOrWhiteSpace(choice)))
                .Select((question, index) => new LearningQuizDefinition(index + 1, question.Prompt,
                    question.Choices.ToArray(), question.CorrectChoice, question.Explanation,
                    question.Hint, question.Coaching))
                .ToArray();
            var summary = lesson.Summary ?? course.Description;
            var minutes = video is null ? Math.Max(1, lesson.DurationMinutes) : (video.DurationSeconds + 59) / 60;
            var reading = lesson.Reading.Where(section => !string.IsNullOrWhiteSpace(section?.Heading) &&
                !string.IsNullOrWhiteSpace(section.Text)).ToArray();
            return new LearningLessonDefinition(lesson.Id, lesson.Title, $"เกาะบทที่ {lesson.Id}", summary,
                reading, quiz, minutes, 50, video);
        }).ToArray();

        return new LearningCourseDefinition(course.Id, course.Title, course.Category, course.Description, islandKind, lessons);
    }

    public static IReadOnlyList<LearningCatalogCourse> PublicCatalog() => All().Select(course =>
        new LearningCatalogCourse(course.Id, course.Title, course.Category, course.Description, course.IslandKind,
            course.Lessons.Length, course.CanStart,
            course.Lessons.Select((lesson, index) => Summary(lesson, index == 0 ? "current" : "locked")).ToArray()))
        .ToArray();

    public static LearningLessonSummary Summary(LearningLessonDefinition lesson, string status)
        => new(lesson.Id, lesson.Title, lesson.IslandName, lesson.Xp, lesson.Minutes, status);

    // Answer keys stay on the server. Only the lesson's quiz access rule controls when prompts are sent.
    public static LearningLessonContent PublicLesson(int courseId, LearningLessonDefinition lesson, string status, bool quizUnlocked)
        => new(courseId, lesson.Id, lesson.Title, lesson.IslandName, lesson.Summary, lesson.Reading,
            quizUnlocked ? lesson.Questions.Select(q => new LearningQuestion(q.Id, q.Prompt, q.Choices, q.Hint, q.Coaching)).ToArray() : [],
            lesson.Xp, lesson.Minutes, status, lesson.Questions.Length, lesson.RequiredCorrect, lesson.Video,
            lesson.Video is not null && quizUnlocked);
}
