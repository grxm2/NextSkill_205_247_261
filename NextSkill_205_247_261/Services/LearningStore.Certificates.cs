using System.Data;
using Microsoft.Data.SqlClient;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public sealed partial class LearningStore
{
    private static string CourseAwardKey(int courseId) => FormattableString.Invariant($"course-{courseId}");

    private static async Task AwardCourseAsync(SqlConnection db, SqlTransaction transaction, Guid accountId,
        string role, int courseId, string title, CancellationToken token)
    {
        await using (var command = Command(db, transaction, """
            IF NOT EXISTS (SELECT 1 FROM dbo.LearningAchievements
                WHERE AccountId=@account AND AccountRole=@role AND AchievementKey=@key)
                INSERT INTO dbo.LearningAchievements (AccountId,AccountRole,AchievementKey)
                VALUES (@account,@role,@key);
            """, accountId, role))
        {
            command.Parameters.Add("@key", SqlDbType.VarChar, 80).Value = CourseAwardKey(courseId);
            await command.ExecuteNonQueryAsync(token);
        }

        if (role == "User")
            await IssueCertificateAsync(db, transaction, accountId, courseId, title, isLegacy: false, token);
    }

    public Task<bool> IssueLegacyCertificateAsync(Guid accountId, int courseId, CancellationToken token)
        => WithProfileAsync(accountId, "User", (db, transaction, ct) =>
            IssueCertificateAsync(db, transaction, accountId, courseId, HistoricalTitle(courseId), isLegacy: true, ct),
            token, createProfile: false);

    private static async Task<bool> IssueCertificateAsync(SqlConnection db, SqlTransaction transaction,
        Guid accountId, int courseId, string title, bool isLegacy, CancellationToken token)
    {
        await using var command = new SqlCommand("""
            IF NOT EXISTS (SELECT 1 FROM dbo.LearningCertificates WHERE AccountId=@account AND CourseId=@course)
                INSERT INTO dbo.LearningCertificates
                    (AccountId,CourseId,ReferenceCode,LearnerName,CourseTitle,EarnedAt,IsLegacySnapshot)
                    SELECT learner.Id,@course,@reference,learner.FullName,@title,award.EarnedAt,@legacy
                    FROM dbo.Users AS learner
                    INNER JOIN dbo.LearningAchievements AS award ON award.AccountId=learner.Id
                    WHERE learner.Id=@account AND award.AccountRole='User' AND award.AchievementKey=@award;
            SELECT 1 FROM dbo.LearningCertificates WHERE AccountId=@account AND CourseId=@course;
            """, db, transaction);
        command.Parameters.Add("@account", SqlDbType.UniqueIdentifier).Value = accountId;
        command.Parameters.Add("@course", SqlDbType.Int).Value = courseId;
        command.Parameters.Add("@reference", SqlDbType.UniqueIdentifier).Value = Guid.NewGuid();
        command.Parameters.Add("@title", SqlDbType.NVarChar, -1).Value = title;
        command.Parameters.Add("@legacy", SqlDbType.Bit).Value = isLegacy;
        command.Parameters.Add("@award", SqlDbType.VarChar, 80).Value = CourseAwardKey(courseId);
        return await command.ExecuteScalarAsync(token) is int;
    }

    public Task<IReadOnlyList<LearningCertificate>> CertificatesAsync(Guid accountId, CancellationToken token)
        => ReadCertificatesAsync(accountId, null, token);

    public async Task<LearningCertificate?> CertificateAsync(Guid accountId, int courseId, CancellationToken token)
        => (await ReadCertificatesAsync(accountId, courseId, token)).FirstOrDefault();

    private async Task<IReadOnlyList<LearningCertificate>> ReadCertificatesAsync(Guid accountId, int? courseId, CancellationToken token)
    {
        await using var db = await OpenAsync(token);
        await using var command = new SqlCommand("""
            SELECT award.CourseId, certificate.CourseTitle, COALESCE(certificate.EarnedAt, award.EarnedAt),
                COALESCE(certificate.LearnerName, learner.FullName),
                certificate.ReferenceCode, certificate.IssuedAt, COALESCE(certificate.IsLegacySnapshot, CAST(0 AS bit))
            FROM (
                SELECT AccountId, TRY_CONVERT(int, SUBSTRING(AchievementKey, 8, 80)) AS CourseId, EarnedAt
                FROM dbo.LearningAchievements WHERE AccountId=@account AND AccountRole='User'
                    AND AchievementKey LIKE 'course-%'
            ) AS award
            INNER JOIN dbo.Users AS learner ON learner.Id=award.AccountId
            LEFT JOIN dbo.LearningCertificates AS certificate ON certificate.AccountId=award.AccountId
                AND certificate.CourseId=award.CourseId
            WHERE award.CourseId > 0 AND (@course IS NULL OR award.CourseId=@course)
            ORDER BY award.EarnedAt DESC, award.CourseId;
            """, db);
        command.Parameters.Add("@account", SqlDbType.UniqueIdentifier).Value = accountId;
        command.Parameters.Add("@course", SqlDbType.Int).Value = (object?)courseId ?? DBNull.Value;

        var certificates = new List<LearningCertificate>();
        await using var reader = await command.ExecuteReaderAsync(token);
        while (await reader.ReadAsync(token))
        {
            var id = reader.GetInt32(0);
            var title = reader.IsDBNull(1) ? HistoricalTitle(id) : reader.GetString(1);
            certificates.Add(new LearningCertificate(id, title, reader.GetDateTime(2), reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetGuid(4), reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                reader.GetBoolean(6)));
        }
        return certificates;
    }

    public async Task<CertificateVerification?> VerifyCertificateAsync(Guid code, CancellationToken token)
    {
        await using var db = await OpenAsync(token);
        await using var command = new SqlCommand("""
            SELECT CourseTitle,EarnedAt,IssuedAt FROM dbo.LearningCertificates WHERE ReferenceCode=@code;
            """, db);
        command.Parameters.Add("@code", SqlDbType.UniqueIdentifier).Value = code;
        await using var reader = await command.ExecuteReaderAsync(token);
        return await reader.ReadAsync(token)
            ? new CertificateVerification(reader.GetString(0), reader.GetDateTime(1), reader.GetDateTime(2))
            : null;
    }

    private static string HistoricalTitle(int id) => CourseCatalog.GetHistoricalCourse(id)?.Title ?? $"คอร์ส NextSkill #{id}";
}
