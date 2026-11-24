using System.ComponentModel.DataAnnotations;

namespace NextSkill_205_247_261.Models;

public sealed record CourseFavorite(int CourseId, string Note, bool IsPinned);

public sealed record FavoriteCourseItem(CourseFavorite Favorite, CourseBrowseItem? Course);

public sealed record CourseFavoritesPageViewModel(IReadOnlyList<FavoriteCourseItem> Items, bool Unavailable = false);

public sealed record FavoriteButtonViewModel(CourseBrowseItem Course, bool IsSaved, string ReturnUrl, bool Compact = false);

public sealed class FavoriteEditForm
{
    private string? note;

    [StringLength(300, ErrorMessage = "โน้ตต้องมีความยาวไม่เกิน 300 ตัวอักษร")]
    public string? Note
    {
        get => note;
        set => note = value?.ReplaceLineEndings("\n");
    }

    public bool IsPinned { get; set; }
}

public sealed record FavoriteEditPageViewModel(int CourseId, string CourseTitle, FavoriteEditForm Form);
