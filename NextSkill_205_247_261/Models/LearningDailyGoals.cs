namespace NextSkill_205_247_261.Models;

public sealed record LearningDailyGoal(string Key, string Title, int Target, Func<LearningDayProgress, int> ReadProgress)
{
    public bool IsComplete(LearningDayProgress progress) => ReadProgress(progress) >= Target;
}

public static class LearningDailyGoals
{
    public const int HistoryDays = 7;

    public static IReadOnlyList<LearningDailyGoal> All { get; } =
    [
        new("lessonsToday", "เรียนให้จบ 2 บท", 2, day => day.Lessons),
        new("xpToday", "สะสม 100 XP", 100, day => day.Xp),
        new("coursesToday", "ผ่านบทเรียนจาก 2 คอร์ส", 2, day => day.Courses)
    ];
}
