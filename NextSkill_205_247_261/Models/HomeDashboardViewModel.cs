namespace NextSkill_205_247_261.Models;

// Preview data. Connect to the learner service when authentication and persistence are ready.
public sealed class HomeDashboardViewModel
{
    public string LearnerName { get; init; } = "Gram";
    public int TotalXp { get; init; } = 2480;
    public int StreakDays { get; init; } = 12;
    public int Hearts { get; init; } = 4;
    public int MaxHearts { get; init; } = 5;
    public int CourseProgress { get; init; } = 13;
    public IReadOnlyList<HomeLesson> Lessons { get; init; } =
    [
        new(1, "Basic", "Everyday introductions", "completed"),
        new(2, "Basic 2", "Conversations at work", "completed"),
        new(3, "Intermediate", "Feedback patterns", "current"),
        new(4, "Intermediate 2", "Confident presentations", "locked"),
        new(5, "Advanced", "Business negotiations", "locked"),
        new(6, "Level 6", "Writing clear emails", "locked"),
        new(7, "Level 7", "Meetings that matter", "locked"),
        new(8, "Level 8", "Working as a team", "locked"),
        new(9, "Level 9", "Solving problems", "locked"),
        new(10, "Level 10", "Sharing your ideas", "locked"),
        new(11, "Level 11", "Talking with customers", "locked"),
        new(12, "Level 12", "Handling disagreement", "locked"),
        new(13, "Level 13", "Telling a clear story", "locked"),
        new(14, "Level 14", "Leading a conversation", "locked"),
        new(15, "Level 15", "Pitching your project", "locked"),
        new(16, "Final level", "Your workplace challenge", "locked")
    ];
    public IReadOnlyList<HomeJourneySection> JourneySections => Lessons.Chunk(4)
        .Select((lessons, index) => new HomeJourneySection(index + 1,
            new[] { "เริ่มต้นอย่างมั่นใจ", "นำไปใช้ในทุกวัน", "สื่อสารให้เข้าใจกัน", "พร้อมสำหรับทุกโอกาส" }[Math.Min(index, 3)], lessons))
        .ToArray();

    // Server-rendered fallback; the browser refines the ribbon against the actual node centres.
    internal static string BuildJourneyPath(int count)
    {
        if (count == 0) return string.Empty;
        int[] columns = [180, 420, 180, 420];
        var path = new System.Text.StringBuilder($"M{columns[0]} 38");
        for (var index = 1; index < count; index++)
        {
            var previousX = columns[(index - 1) % columns.Length];
            var nextX = columns[index % columns.Length];
            var nextY = 38 + index * 136;
            var middleY = nextY - 68;
            path.Append($" C{previousX} {middleY} {nextX} {middleY} {nextX} {nextY}");
        }
        return path.ToString();
    }
    public IReadOnlyList<HomeQuest> Quests { get; init; } =
    [new("lesson", "เรียนให้จบ 1 บท", 0, 1, "+30 XP"), new("xp", "สะสม 80 XP", 45, 80, "+20 XP"), new("quiz", "ทำควิซเต็มคะแนน", 0, 1, "+50 XP")];
    public IReadOnlyList<HomeLeagueMember> League { get; init; } =
    [new(1, "P", 820, false), new(2, "Gram", 760, true), new(3, "Game", 710, false)];
}
public sealed record HomeLesson(int Number, string Level, string Title, string Status);
public sealed record HomeJourneySection(int Number, string Title, IReadOnlyList<HomeLesson> Lessons)
{
    public int MapHeight => Lessons.Count * 136;
    public string Path => HomeDashboardViewModel.BuildJourneyPath(Lessons.Count);
    public string CompletedPath => Lessons.Any(lesson => lesson.Status == "completed")
        ? HomeDashboardViewModel.BuildJourneyPath(Math.Min(Lessons.Count, Lessons.TakeWhile(lesson => lesson.Status == "completed").Count() + 1))
        : string.Empty;
}
public sealed record HomeQuest(string Kind, string Title, int Current, int Target, string Reward);
public sealed record HomeLeagueMember(int Rank, string Name, int Xp, bool IsCurrentUser);
