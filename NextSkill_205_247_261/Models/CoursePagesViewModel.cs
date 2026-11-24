using Microsoft.AspNetCore.WebUtilities;

namespace NextSkill_205_247_261.Models;

// Public metadata is sourced from the course catalog. Account progress is optionally hydrated
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

public bool CanStart => Curriculum.CanStart;

public CoursePreviewVideo? PreviewVideo
{
    get
    {
        if (Metadata.VideoUrl is { } sourceUrl && ParseWebUri(sourceUrl) is { } uri)
        {
            var youtubeId = GetYouTubeVideoId(uri);
            var embedUrl = ToEmbedUrl(uri, youtubeId);
            if (embedUrl is not null || IsDirectVideo(uri))
                return new CoursePreviewVideo(sourceUrl.Trim(), embedUrl, youtubeId);
        }

        foreach (var lesson in Metadata.Lessons.OrderBy(lesson => lesson.Id))
        {
            if (lesson.VideoId is { } videoId && IsYouTubeVideoId(videoId))
                return new CoursePreviewVideo($"https://www.youtube.com/watch?v={videoId}", YouTubeEmbedUrl(videoId), videoId);
        }

        return null;
    }
}

public static string? ToEmbedUrl(string? url) =>
    ParseWebUri(url) is { } uri ? ToEmbedUrl(uri, GetYouTubeVideoId(uri)) : null;

private static string? ToEmbedUrl(Uri uri, string? youtubeId)
{
    if (youtubeId is not null)
        return YouTubeEmbedUrl(youtubeId);

    var path = uri.AbsolutePath.Trim('/');
    var vimeoId = uri.Host.ToLowerInvariant() switch
    {
        "vimeo.com" or "www.vimeo.com" => path,
        "player.vimeo.com" when path.StartsWith("video/", StringComparison.Ordinal) => path[6..],
        _ => null
    };
    return vimeoId is { Length: > 0 } && vimeoId.All(char.IsAsciiDigit)
        ? $"https://player.vimeo.com/video/{vimeoId}" : null;
}

private static string? GetYouTubeVideoId(Uri uri)
{
    var path = uri.AbsolutePath.Trim('/');
    var videoId = uri.Host.ToLowerInvariant() switch
    {
        "youtu.be" => path,
        "youtube.com" or "www.youtube.com" or "m.youtube.com" when path == "watch" =>
            QueryHelpers.ParseQuery(uri.Query).GetValueOrDefault("v").ToString(),
        "youtube.com" or "www.youtube.com" or "www.youtube-nocookie.com" when path.StartsWith("embed/", StringComparison.Ordinal) => path[6..],
        _ => null
    };
    return IsYouTubeVideoId(videoId) ? videoId : null;
}

private static bool IsYouTubeVideoId(string? videoId) =>
    videoId is { Length: 11 } && videoId.All(value => char.IsAsciiLetterOrDigit(value) || value is '-' or '_');

private static string YouTubeEmbedUrl(string videoId) => $"https://www.youtube-nocookie.com/embed/{videoId}?rel=0";

public static bool IsDirectVideo(string? url) => ParseWebUri(url) is { } uri && IsDirectVideo(uri);

private static bool IsDirectVideo(Uri uri) =>
    Path.GetExtension(uri.AbsolutePath).ToLowerInvariant() is ".mp4" or ".webm" or ".ogg";

private static Uri? ParseWebUri(string? url) => Uri.TryCreate(url?.Trim(), UriKind.Absolute, out var uri)
    && uri.Scheme is "http" or "https" && uri.UserInfo.Length == 0 ? uri : null;

public CourseCover Cover => CourseCover.For(Id, Category);

public string Art => Curriculum.IslandKind switch
{
    "ux" => "/images/journey/workshop-island.svg",
    "javascript" => "/images/journey/presentation-island.svg",
    "english" => "/images/journey/sea-adventure-world.webp",
    _ => "/images/journey/destination-island-detailed.svg"
};

public string CategoryLabel => Category switch
{
    "Design" => "UX/UI",
    "AI" => "การใช้ AI",
    "Development" => "โค้ด",
    "Technology" => "เทคโนโลยี",
    "Business" => "ธุรกิจ",
    "Language" or "Languages" => "ภาษาอังกฤษ",
    "Marketing" => "การตลาด",
    "Data" or "Data Science" => "ข้อมูล",
    _ => Category
};

  
}

public sealed record CoursePreviewVideo(string SourceUrl, string? EmbedUrl, string? YouTubeId)
{
    public string? YouTubeThumbnailUrl => YouTubeId is null ? null : $"https://i.ytimg.com/vi/{YouTubeId}/hqdefault.jpg";
}

public sealed record CourseCover(string Path, string? Topic)
{
    public static CourseCover For(int courseId, string category)
    {
        var topic = courseId switch
        {
            1 => "UX Research",
            101 => "Greetings",
            102 => "Tenses",
            103 => "Networking",
            104 => "Email",
            105 => "Interview",
            106 => "HTML",
            107 => "CSS",
            108 => "JavaScript",
            109 => "Python",
            110 => "Git",
            111 => "Figma",
            112 => "Buttons",
            113 => "Auto Layout",
            114 => "Navigation",
            115 => "Prototype",
            116 => "AI Limits",
            117 => "Delegation",
            118 => "Prompting",
            119 => "Fact-Check",
            120 => "Responsible AI",
            _ => null
        };

        if (topic is not null)
        {
            return new CourseCover($"/images/courses/topic-covers/{courseId}.webp", topic);
        }

        var fallback = courseId switch
        {
            13 => "english-for-work",
            5 => "javascript-basics",
            2 => "design-systems",
            3 => "product-strategy",
            4 => "no-code-prototyping",
            6 => "advanced-css",
            _ => category switch
            {
                "Languages" or "Language" => "english-for-work",
                "Design" => "design-systems",
                "Technology" or "Development" => "javascript-basics",
                _ => "product-strategy"
            }
        };

        return new CourseCover($"/images/courses/{fallback}.jpg", null);
    }
}

public sealed class CourseCatalogPageViewModel
{
    public IReadOnlyList<CourseBrowseItem> Courses { get; init; } = [];
    public IReadOnlySet<int>? FavoriteCourseIds { get; init; }
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
        "Design" => "UX/UI", "Development" => "โค้ด", "Technology" => "เทคโนโลยี", "AI" => "การใช้ AI",
        "Business" => "ธุรกิจ", "Language" or "Languages" => "ภาษาอังกฤษ",
        "Marketing" => "การตลาด", "Data" or "Data Science" => "ข้อมูล", _ => category
    };
}

public sealed record CourseDetailsPageViewModel(CourseBrowseItem Course, bool? IsFavorite = null);
