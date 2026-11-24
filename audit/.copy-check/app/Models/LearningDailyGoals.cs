namespace NextSkill_205_247_261.Models;

public sealed record LearningDailyGoal(string Key, string Action, string Unit, int Target, Func<LearningDayProgress, int> ReadProgress)
{
    public string Title => $"{Action} {Target} {Unit}";
    public bool IsComplete(LearningDayProgress progress) => ReadProgress(progress) >= Target;
}

public sealed record DailyGoalStatus(string Key, string Unit, int Progress, int Target, bool Complete);

public static class LearningDailyGoals
{
    public const int HistoryDays = 7;

    public static IReadOnlyList<LearningDailyGoal> All { get; } =
    [
        new("lessonsToday", "เรียนให้จบ", "บท", 2, day => day.Lessons),
        new("xpToday", "สะสม", "XP", 100, day => day.Xp),
        new("coursesToday", "ผ่านบทเรียนจาก", "คอร์ส", 2, day => day.Courses)
    ];
}
