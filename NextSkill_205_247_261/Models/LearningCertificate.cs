namespace NextSkill_205_247_261.Models;

public sealed record LearningCertificate(int CourseId, string CourseTitle, DateTime EarnedAt,
    string LearnerName, Guid? ReferenceCode, DateTime? IssuedAt, bool IsLegacySnapshot);

public sealed record CertificateVerification(string CourseTitle, DateTime EarnedAt, DateTime IssuedAt);
