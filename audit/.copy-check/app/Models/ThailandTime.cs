using System.Globalization;

namespace NextSkill_205_247_261.Models;

public static class ThailandTime
{
    public const int UtcOffsetMinutes = 7 * 60;
    public static CultureInfo Culture { get; } = CultureInfo.GetCultureInfo("th-TH");

    public static DateTime ToLocal(DateTime utc) =>
        DateTime.SpecifyKind(utc.AddMinutes(UtcOffsetMinutes), DateTimeKind.Unspecified);

    public static DateTime ToUtc(DateTime local) =>
        DateTime.SpecifyKind(local.AddMinutes(-UtcOffsetMinutes), DateTimeKind.Utc);

    public static DateOnly Date(DateTime utc) => DateOnly.FromDateTime(ToLocal(utc));
}
