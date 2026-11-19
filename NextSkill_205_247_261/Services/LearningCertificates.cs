using System.Globalization;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public static class LearningCertificates
{
    public static IReadOnlyList<LearningCertificate> EarnedBy(LearningState? state)
    {
        if (state is null) return [];

        const string prefix = "course-";
        var certificates = new List<LearningCertificate>();
        foreach (var award in state.Awards.OrderByDescending(item => item.EarnedAt))
        {
            if (!award.Key.StartsWith(prefix, StringComparison.Ordinal) ||
                !int.TryParse(award.Key.AsSpan(prefix.Length), NumberStyles.None, CultureInfo.InvariantCulture, out var id) ||
                id <= 0)
                continue;

            var title = state.Courses.FirstOrDefault(course => course.CourseId == id)?.Title
                ?? CourseCatalog.GetHistoricalCourse(id)?.Title
                ?? $"คอร์ส NextSkill #{id}";
            certificates.Add(new LearningCertificate(id, title, award.EarnedAt));
        }
        return certificates;
    }
}
