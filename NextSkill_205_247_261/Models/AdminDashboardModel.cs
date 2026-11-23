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
    private static readonly CultureInfo ThaiCulture = new("th-TH");

    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public int Users { get; set; }
    public int Admins { get; set; }
    public int NewUsersThisMonth { get; set; }
    public int ActiveTodayCount { get; set; }
    public int TotalLoginsCount { get; set; }
    public int TotalLessonCompletions { get; set; }
    public int StartedCoursesCount { get; set; }
    public int TotalXpEarned { get; set; }
    public int TotalAchievementsEarned { get; set; }
    public List<DateTime> AllActivityTimestamps { get; } = new();
    public List<AdminMember> Members { get; } = new();
    public List<AdminActivity> Activities { get; } = new();
    public List<Course> Courses { get; set; } = new();
    public List<AdminQuizQuestion> Questions { get; set; } = new();

    public int TotalAccounts => Users + Admins;
    public int TotalLessons => Courses.Sum(c => c.Lessons?.Count ?? c.Units);
    public int TotalQuestions => Questions.Count;
    public int FeaturedCoursesCount => Courses.Count(c => c.Featured);
    public int TotalActivityEvents => AllActivityTimestamps.Count;

    public double CompletionRatePercent
    {
        get
        {
            if (TotalLessonCompletions <= 0) return 0;
            double avgLessonsPerCourse = Courses.Count > 0 ? Math.Max(1.0, (double)TotalLessons / Courses.Count) : 3.0;
            double denominator = Math.Max(TotalLessonCompletions, Math.Max(1, StartedCoursesCount) * avgLessonsPerCourse);
            return Math.Min(100.0, Math.Round(TotalLessonCompletions * 100.0 / denominator, 1));
        }
    }

    public string CompletionRateText => CompletionRatePercent % 1 == 0
        ? $"{CompletionRatePercent:0}%"
        : $"{CompletionRatePercent:0.0}%";

    public List<AdminCategoryShare> GetCategoryShares()
    {
        const double circumference = 238.76; // 2 * pi * 38
        int total = Courses.Count;
        if (total == 0)
        {
            return [new AdminCategoryShare("ยังไม่มีคอร์ส", CategoryPalette[0], 0, 0, 0, circumference, 0)];
        }

        var groups = Courses
            .GroupBy(c => string.IsNullOrWhiteSpace(c.Category) ? "General" : c.Category.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(g => (Category: g.First().Category.Trim(), Count: g.Count()))
            .OrderByDescending(g => g.Count)
            .ThenBy(g => g.Category)
            .ToList();

        var shares = new List<AdminCategoryShare>(groups.Count);
        int allocatedPct = 0;
        double currentOffset = 0;

        for (int i = 0; i < groups.Count; i++)
        {
            var g = groups[i];
            int pct = (i == groups.Count - 1)
                ? Math.Max(0, 100 - allocatedPct)
                : (int)Math.Round(g.Count * 100.0 / total);
            allocatedPct += pct;

            double dashLen = Math.Round((g.Count / (double)total) * circumference, 2);
            double dashGap = Math.Round(Math.Max(0, circumference - dashLen), 2);
            string color = CategoryPalette[i % CategoryPalette.Length];

            shares.Add(new AdminCategoryShare(g.Category, color, g.Count, pct, dashLen, dashGap, Math.Round(-currentOffset, 2)));
            currentOffset += dashLen;
        }

        return shares;
    }

    public (List<AdminMonthlyBar> Bars, int[] YAxisTicks, int TotalInPeriod) GetMonthlyTrend(int monthCount)
    {
        var nowLocal = DateTime.UtcNow.AddHours(7);
        var currentMonthStart = new DateTime(nowLocal.Year, nowLocal.Month, 1);

        var rawMonths = new List<(DateTime MonthStart, string Key, string LabelTh, int Count)>();
        for (int i = monthCount - 1; i >= 0; i--)
        {
            var mStart = currentMonthStart.AddMonths(-i);
            var mEnd = mStart.AddMonths(1);
            int count = AllActivityTimestamps.Count(ts =>
            {
                var local = ts.AddHours(7);
                return local >= mStart && local < mEnd;
            });
            string key = mStart.ToString("MMM", CultureInfo.InvariantCulture);
            string labelTh = mStart.ToString("MMM", ThaiCulture);
            rawMonths.Add((mStart, key, labelTh, count));
        }

        int maxCount = rawMonths.Max(m => m.Count);
        int topTick = maxCount <= 3 ? 3 : (int)Math.Ceiling(maxCount / 3.0) * 3;
        int step = topTick / 3;
        int[] yTicks = [topTick, step * 2, step, 0];

        var bars = rawMonths.Select((m, idx) =>
        {
            bool isLast = idx == rawMonths.Count - 1;
            int heightPct = topTick > 0
                ? (m.Count == 0 ? 8 : Math.Clamp((int)Math.Round(m.Count * 96.0 / topTick), 14, 98))
                : 8;
            return new AdminMonthlyBar(m.Key, m.LabelTh, m.Count, heightPct, isLast);
        }).ToList();

        int totalInPeriod = rawMonths.Sum(m => m.Count);
        return (bars, yTicks, totalInPeriod);
    }
}
