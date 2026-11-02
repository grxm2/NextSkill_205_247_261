namespace NextSkill_205_247_261.Models;

// Public metadata is rendered without SQL. Account progress is optionally hydrated
// through LearningController so its existing identity and access rules stay central.
public sealed record CourseBrowseItem(Course Metadata, LearningCatalogCourse Curriculum)
{
    public int Id => Metadata.Id;
    public string Title => Curriculum.Title;
    public string Description => Curriculum.Description;
    public string Category => Curriculum.Category;
    public bool CanStart => Curriculum.CanStart;
    public string Art => Curriculum.IslandKind switch
    {
        "ux" => "/images/journey/workshop-island.svg",
        "javascript" => "/images/journey/presentation-island.svg",
        _ => "/images/journey/destination-island-detailed.svg"
    };
    public string CategoryLabel => Category switch
    {
        "Design" => "ออกแบบ", "Technology" or "Development" => "เทคโนโลยี",
        "Business" => "ธุรกิจ", "Language" or "Languages" => "ภาษา",
        "Marketing" => "การตลาด", "Data" or "Data Science" => "ข้อมูล", _ => Category
    };
}

public sealed class CourseCatalogPageViewModel
{
    public IReadOnlyList<CourseBrowseItem> Courses { get; init; } = [];
    public IReadOnlyList<string> Categories { get; init; } = [];
    public string Query { get; init; } = "";
    public string Tag { get; init; } = "All";
    public string Sort { get; init; } = "Recommended";
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 9;
    public int TotalCount { get; init; }
    public int TotalPages { get; init; }
    public static string CategoryLabel(string category) => category switch
    {
        "Design" => "ออกแบบ", "Technology" or "Development" => "เทคโนโลยี",
        "Business" => "ธุรกิจ", "Language" or "Languages" => "ภาษา",
        "Marketing" => "การตลาด", "Data" or "Data Science" => "ข้อมูล", _ => category
    };
}

public sealed record CourseDetailsPageViewModel(CourseBrowseItem Course);
