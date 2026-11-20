namespace NextSkill_205_247_261.Models;

public sealed record LearningCertificate(int CourseId, string CourseTitle, DateTime EarnedAt);

public sealed record LearningCertificateViewModel(string LearnerName, LearningCertificate Certificate);
