using System.Collections.Generic;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public static class CourseCatalog
{
    private static readonly IReadOnlyDictionary<int, string> RetiredTitles = new Dictionary<int, string>
    {
        [2] = "Design Systems", [3] = "Product Strategy", [4] = "No-code Prototyping",
        [5] = "JavaScript Basics", [6] = "Advanced CSS", [13] = "English for Work",
        [14] = "Test 1", [15] = "Test v1", [16] = "JavaScript สำหรับหน้าเว็บ", [17] = "พื้นฐานทักษะดิจิทัล"
    };

    internal static bool IsRetired(int id) => id is >= 2 and <= 17;

    // The shared catalog connects to AdminContentStore so any admin edits appear dynamically across all views
    public static List<Course> GetCourses()
    {
        return AdminContentStore.GetAllCourses().Where(course => !IsRetired(course.Id)).ToList();
    }

    public static Course? GetHistoricalCourse(int id) => GetCourses().FirstOrDefault(course => course.Id == id)
        ?? (RetiredTitles.TryGetValue(id, out var title) ? new Course { Id = id, Title = title } : null);
}
