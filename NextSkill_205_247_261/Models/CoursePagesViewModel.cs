namespace NextSkill_205_247_261.Models;

// Public metadata is rendered without SQL. Account progress is optionally hydrated
// through LearningController so its existing identity and access rules stay central.
public sealed record CourseBrowseItem(Course Metadata, LearningCatalogCourse Curriculum)
{
    public int Id => Metadata.Id;

public string Title => !string.IsNullOrWhiteSpace(Metadata.Title)
    ? Metadata.Title : Curriculum.Title;

public string Description => !string.IsNullOrWhiteSpace(Metadata.Description)
    ? Metadata.Description : Curriculum.Description;

public string Category => !string.IsNullOrWhiteSpace(Metadata.Category)
    ? Metadata.Category : Curriculum.Category;

public bool CanStart => Curriculum.CanStart ||
    (Metadata.Lessons != null && Metadata.Lessons.Count > 0);

// ภาพหน้าปกคอร์สจาก admin-dashboard
public string CoverArt => "/images/courses/" + (Id switch
{
    13 => "english-for-work",
    1 => "ux-research",
    5 => "javascript-basics",
    2 => "design-systems",
    3 => "product-strategy",
    4 => "no-code-prototyping",
    6 => "advanced-css",
    _ => Category switch
    {
        "Languages" or "Language" => "english-for-work",
        "Design" => "design-systems",
        "Technology" or "Development" => "javascript-basics",
        _ => "product-strategy"
    }
}) + ".jpg";

// ภาพเกาะจาก master
public string Art => Curriculum.IslandKind switch
{
    "ux" => "/images/journey/workshop-island.svg",
    "javascript" => "/images/journey/presentation-island.svg",
    "english" => "/images/journey/sea-adventure-world.webp",
    _ => "/images/journey/destination-island-detailed.svg"
};

// ชื่อหมวดหมู่ภาษาไทยจาก master
public string CategoryLabel => Category switch
{
    "Design" => "ออกแบบ",
    "Technology" or "Development" => "เทคโนโลยี",
    "Business" => "ธุรกิจ",
    "Language" or "Languages" => "ภาษา",
    "Marketing" => "การตลาด",
    "Data" or "Data Science" => "ข้อมูล",
    _ => Category
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
