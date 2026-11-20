namespace NextSkill_205_247_261.Models;

public sealed record LearnerProfile(string FullName, string Email, DateTime CreatedAt);

public sealed record LearnerProfileViewModel(LearnerProfile Account, ProfileEditForm Edit, LearningState? Learning,
    IReadOnlyList<LearningCertificate> Certificates)
{
    public string AwardTitle(string key)
    {
        if (key == "first-lesson") return "ผ่านบทเรียนแรก";
        if (key.StartsWith("course-", StringComparison.Ordinal) && int.TryParse(key.AsSpan(7), out var courseId))
        {
            var certificate = Certificates.FirstOrDefault(item => item.CourseId == courseId);
            return certificate is null ? "เรียนจบคอร์ส" : $"เรียนจบ {certificate.CourseTitle}";
        }
        return "เหรียญความสำเร็จ";
    }
}
