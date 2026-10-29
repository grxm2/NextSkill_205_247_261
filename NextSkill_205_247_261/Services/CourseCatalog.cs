using System.Collections.Generic;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public static class CourseCatalog
{
    // The shared catalog connects to AdminContentStore so any admin edits appear dynamically across all views
    public static List<Course> GetCourses()
    {
        return AdminContentStore.GetAllCourses();
    }
}
