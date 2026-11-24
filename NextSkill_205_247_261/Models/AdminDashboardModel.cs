using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace NextSkill_205_247_261.Models;

public record AdminMember(string FullName, string Email, string Role, DateTime CreatedAt);
public record AdminActivity(string FullName, string Role, string Action, DateTime OccurredAt);
public record AdminMonthlyBar(string MonthKey, string LabelTh, int Count, int HeightPercent, bool Highlighted);
public record AdminCategoryShare(string Category, string Color, int Count, int Percent, double DashLength, double DashGap, double DashOffset);

public class AdminDashboardModel
{
    private static readonly string[] CategoryPalette = ["#0284c7", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
    public const int ActivityMonths = 12;
    public const int MemberLimit = 100;
    public const int RecentActivityHours = 24;

    public DateTime LocalNow { get; init; } = ThailandTime.ToLocal(DateTime.UtcNow);
    public string ThaiDate => LocalNow.ToString("ddddที่ d MMMM", ThailandTime.Culture);
    public string Greeting => LocalNow.Hour switch
    {
        < 12 => "สวัสดีตอนเช้า",
        < 17 => "สวัสดีตอนบ่าย",
        _ => "สวัสดีตอนเย็น"
    };
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public int Users { get; set; }
    public int Admins { get; set; }
    public int NewUsersThisMonth { get; set; }
    public int ActiveTodayCount { get; set; }
    public int TotalLoginsCount { get; set; }
    public int TotalLessonCompletions { get; set; }
    public int StartedCoursesCount { get; set; }
    public long EnrolledLessonSlots { get; set; }
    public long TotalXpEarned { get; set; }
    public int TotalAchievementsEarned { get; set; }
    public Dictionary<DateOnly, int> MonthlyActivityCounts { get; } = new();
    public List<AdminMember> Members { get; } = new();
    public List<AdminActivity> Activities { get; } = new();
    public List<Course> Courses { get; set; } = new();
    public List<AdminQuizQuestion> Questions { get; set; } = new();

    public int TotalAccounts => Users + Admins;
    public int PublishedCoursesCount { get; init; }
    public int TotalLessons => Courses.Sum(c => c.Lessons.Count);
    public int TotalQuestions => Questions.Count;
    public int FeaturedCoursesCount => Courses.Count(c => c.Featured);
    public int TotalActivityEvents => MonthlyActivityCounts.Values.Sum();
    public double AverageLessonsPerCourse => Courses.Count == 0 ? 0 : Math.Round((double)TotalLessons / Courses.Count, 1);
    public double AverageQuestionsPerLesson => TotalLessons == 0 ? 0 : Math.Round((double)TotalQuestions / TotalLessons, 1);
    public int FeaturedShare => Courses.Count == 0 ? 0 : (int)Math.Round(FeaturedCoursesCount * 100.0 / Courses.Count);
    public double CompletionRatePercent => EnrolledLessonSlots == 0 ? 0
        : Math.Round(TotalLessonCompletions * 100.0 / EnrolledLessonSlots, 1);

    public string CompletionRateText => CompletionRatePercent % 1 == 0
        ? $"{CompletionRatePercent:0}%"
        : $"{CompletionRatePercent:0.0}%";

    public List<AdminCategoryShare> GetCategoryShares()
    {
        const double circumference = 2 * Math.PI * 38;
        int total = Courses.Count;
        if (total == 0) return [];

        var groups = Courses
            .GroupBy(c => string.IsNullOrWhiteSpace(c.Category) ? "General" : c.Category.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(g => (Category: g.Key, Count: g.Count()))
            .OrderByDescending(g => g.Count)
            .ThenBy(g => g.Category)
            .ToList();

        var shares = new List<AdminCategoryShare>(groups.Count);
        int[] percentages = groups.Select(g => (int)(100L * g.Count / total)).ToArray();
        foreach (int index in Enumerable.Range(0, groups.Count)
            .OrderByDescending(i => 100L * groups[i].Count % total)
            .Take(100 - percentages.Sum()))
        {
            percentages[index]++;
        }
        double currentOffset = 0;

        for (int i = 0; i < groups.Count; i++)
        {
            var g = groups[i];
            double dashLen = g.Count * circumference / total;
            string color = CategoryPalette[i % CategoryPalette.Length];
            shares.Add(new AdminCategoryShare(g.Category, color, g.Count, percentages[i],
                dashLen, circumference - dashLen, -currentOffset));
            currentOffset += dashLen;
        }

        return shares;
    }

    public (List<AdminMonthlyBar> Bars, int[] YAxisTicks, int TotalInPeriod) GetMonthlyTrend(int monthCount)
    {
        var currentMonthStart = new DateOnly(LocalNow.Year, LocalNow.Month, 1);

        var rawMonths = new List<(string Key, string LabelTh, int Count)>();
        for (int i = monthCount - 1; i >= 0; i--)
        {
            var mStart = currentMonthStart.AddMonths(-i);
            int count = MonthlyActivityCounts.GetValueOrDefault(mStart);
            string key = mStart.ToString("yyyy-MM", CultureInfo.InvariantCulture);
            string labelTh = mStart.ToString("MMM", ThailandTime.Culture);
            rawMonths.Add((key, labelTh, count));
        }

        int maxCount = rawMonths.Max(m => m.Count);
        int topTick = maxCount <= 3 ? 3 : (int)Math.Ceiling(maxCount / 3.0) * 3;
        int step = topTick / 3;
        int[] yTicks = [topTick, step * 2, step, 0];

        var bars = rawMonths.Select((m, idx) =>
        {
            bool isLast = idx == rawMonths.Count - 1;
            int heightPct = (int)Math.Round(m.Count * 100.0 / topTick);
            return new AdminMonthlyBar(m.Key, m.LabelTh, m.Count, heightPct, isLast);
        }).ToList();

        int totalInPeriod = rawMonths.Sum(m => m.Count);
        return (bars, yTicks, totalInPeriod);
    }
}
