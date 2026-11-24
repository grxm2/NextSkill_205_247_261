using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public record Account(Guid Id, string FullName, string Email, string PasswordHash, DateTime? LockoutEnd);
public enum ProfileUpdateStatus { Updated, PasswordRequired, EmailTaken, Unavailable }

public class AccountStore(IConfiguration configuration, IPasswordHasher<Account> hasher, ILogger<AccountStore> logger)
{
    public const string AdminSessionVersionClaim = "nextskill:admin-session-version";
    public string AdminSessionVersion => configuration["Authentication:AdminSessionVersion"] ?? "1";

    private static string Table(string role) => role switch
    {
        "User" => "dbo.Users", "Admin" => "dbo.Admins", _ => throw new ArgumentException("Invalid role")
    };
    private async Task<SqlConnection> OpenAsync()
    {
        var connection = new SqlConnection(configuration.GetConnectionString("NextSkill"));
        try { await connection.OpenAsync(); return connection; }
        catch { await connection.DisposeAsync(); throw; }
    }
    private static void Add(SqlCommand command, string name, SqlDbType type, object value, int size = 0)
    {
        var parameter = command.Parameters.Add(name, type);
        if (size > 0) parameter.Size = size;
        parameter.Value = value;
    }
    private static Account Read(SqlDataReader r) => new(r.GetGuid(0), r.GetString(1), r.GetString(2),
        r.GetString(3), r.IsDBNull(4) ? null : DateTime.SpecifyKind(r.GetDateTime(4), DateTimeKind.Utc));

    public async Task<LearnerProfile?> GetLearnerProfileAsync(Guid id, CancellationToken token)
    {
        await using var db = await OpenAsync();
        await using var query = new SqlCommand("""
            SELECT FullName, Email, CreatedAt FROM dbo.Users
            WHERE Id=@id AND (LockoutEnd IS NULL OR LockoutEnd<=SYSUTCDATETIME())
            """, db);
        Add(query, "@id", SqlDbType.UniqueIdentifier, id);
        await using var reader = await query.ExecuteReaderAsync(token);
        return await reader.ReadAsync(token)
            ? new(reader.GetString(0), reader.GetString(1), DateTime.SpecifyKind(reader.GetDateTime(2), DateTimeKind.Utc))
            : null;
    }

    public async Task<ProfileUpdateStatus> UpdateLearnerProfileAsync(Guid id, string fullName, string email,
        string? currentPassword, CancellationToken token)
    {
        await using var db = await OpenAsync();
        await using var transaction = (SqlTransaction)await db.BeginTransactionAsync(token);
        await using var query = new SqlCommand("""
            SELECT Id, FullName, Email, PasswordHash, LockoutEnd FROM dbo.Users WITH (UPDLOCK)
            WHERE Id=@id AND (LockoutEnd IS NULL OR LockoutEnd<=SYSUTCDATETIME())
            """, db, transaction);
        Add(query, "@id", SqlDbType.UniqueIdentifier, id);
        Account? account;
        await using (var reader = await query.ExecuteReaderAsync(token))
            account = await reader.ReadAsync(token) ? Read(reader) : null;
        if (account is null) return ProfileUpdateStatus.Unavailable;
        if (!string.Equals(account.Email, email, StringComparison.Ordinal) &&
            (string.IsNullOrEmpty(currentPassword) ||
             hasher.VerifyHashedPassword(account, account.PasswordHash, currentPassword) == PasswordVerificationResult.Failed))
            return ProfileUpdateStatus.PasswordRequired;

        await using var update = new SqlCommand("""
            UPDATE dbo.Users SET FullName=@name, Email=@email, NormalizedEmail=@normalized WHERE Id=@id
            """, db, transaction);
        Add(update, "@id", SqlDbType.UniqueIdentifier, id);
        Add(update, "@name", SqlDbType.NVarChar, fullName, 100);
        Add(update, "@email", SqlDbType.NVarChar, email, 254);
        Add(update, "@normalized", SqlDbType.NVarChar, email.ToUpperInvariant(), 254);
        try { await update.ExecuteNonQueryAsync(token); }
        catch (SqlException ex) when (ex.Number is 2601 or 2627) { return ProfileUpdateStatus.EmailTaken; }

        await transaction.CommitAsync(token);
        return ProfileUpdateStatus.Updated;
    }

    public async Task<Account?> AuthenticateAsync(string role, string email, string password)
    {
        await using var db = await OpenAsync();
        await using var query = new SqlCommand($"SELECT Id, FullName, Email, PasswordHash, LockoutEnd FROM {Table(role)} WHERE NormalizedEmail=@email", db);
        Add(query, "@email", SqlDbType.NVarChar, email.Trim().ToUpperInvariant(), 254);
        Account? account;
        await using (var reader = await query.ExecuteReaderAsync())
            account = await reader.ReadAsync() ? Read(reader) : null;
        if (account is null || account.LockoutEnd > DateTime.UtcNow) return null;
        var result = hasher.VerifyHashedPassword(account, account.PasswordHash, password);
        if (result == PasswordVerificationResult.Failed)
        {
            await using var fail = new SqlCommand($"""
                UPDATE {Table(role)} SET
                  LockoutEnd=CASE WHEN (CASE WHEN LockoutEnd<=SYSUTCDATETIME() THEN 0 ELSE FailedAttempts END)+1>=5
                    THEN DATEADD(minute,15,SYSUTCDATETIME()) ELSE NULL END,
                  FailedAttempts=(CASE WHEN LockoutEnd<=SYSUTCDATETIME() THEN 0 ELSE FailedAttempts END)+1
                WHERE Id=@id AND (LockoutEnd IS NULL OR LockoutEnd<=SYSUTCDATETIME())
                """, db);
            Add(fail, "@id", SqlDbType.UniqueIdentifier, account.Id);
            await fail.ExecuteNonQueryAsync();
            return null;
        }
        await using var success = new SqlCommand($"""
            UPDATE {Table(role)} SET FailedAttempts=0, LockoutEnd=NULL, LastLoginAt=SYSUTCDATETIME(), PasswordHash=@hash
            WHERE Id=@id AND (LockoutEnd IS NULL OR LockoutEnd<=SYSUTCDATETIME())
            """, db);
        Add(success, "@id", SqlDbType.UniqueIdentifier, account.Id);
        Add(success, "@hash", SqlDbType.NVarChar,
            result == PasswordVerificationResult.SuccessRehashNeeded ? hasher.HashPassword(account, password) : account.PasswordHash, 512);
        return await success.ExecuteNonQueryAsync() == 1 ? account : null;
    }

    public async Task<string?> RegisterAsync(string role, string fullName, string email, string password, string? invitation)
    {
        await using var db = await OpenAsync();
        await using var transaction = (SqlTransaction)await db.BeginTransactionAsync();
        if (role == "Admin")
        {
            var code = invitation?.Trim();
            if (string.IsNullOrEmpty(code))
                return "รหัสเชิญไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว";

            var codeHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code)));
            await using var redeem = new SqlCommand("""
                UPDATE dbo.AdminInvitations SET RedeemedAt=SYSUTCDATETIME()
                WHERE CodeHash=@hash AND RedeemedAt IS NULL AND ExpiresAt>SYSUTCDATETIME()
                """, db, transaction);
            Add(redeem, "@hash", SqlDbType.VarChar, codeHash, 64);
            if (await redeem.ExecuteNonQueryAsync() != 1)
                return "รหัสเชิญไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว";
        }
        var account = new Account(Guid.NewGuid(), fullName.Trim(), email.Trim(), "", null);
        await using var insert = new SqlCommand($"""
            INSERT INTO {Table(role)} (Id,FullName,Email,NormalizedEmail,PasswordHash,TermsAcceptedAt)
            VALUES (@id,@name,@email,@normalized,@hash,SYSUTCDATETIME())
            """, db, transaction);
        Add(insert, "@id", SqlDbType.UniqueIdentifier, account.Id);
        Add(insert, "@name", SqlDbType.NVarChar, account.FullName, 100);
        Add(insert, "@email", SqlDbType.NVarChar, account.Email, 254);
        Add(insert, "@normalized", SqlDbType.NVarChar, account.Email.ToUpperInvariant(), 254);
        Add(insert, "@hash", SqlDbType.NVarChar, hasher.HashPassword(account, password), 512);
        try { await insert.ExecuteNonQueryAsync(); }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        { return "สมัครบัญชีไม่สำเร็จ กรุณาตรวจสอบข้อมูลหรือลองเข้าสู่ระบบ"; }
        await transaction.CommitAsync();
        return null;
    }

    public async Task<bool> IsValidPrincipalAsync(ClaimsPrincipal principal)
    {
        var role = principal.FindFirstValue(ClaimTypes.Role);
        if (role is not ("User" or "Admin") || !Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return false;
        if (role == "Admin" && principal.FindFirstValue(AdminSessionVersionClaim) != AdminSessionVersion) return false;
        try
        {
            await using var db = await OpenAsync();
            await using var query = new SqlCommand($"SELECT COUNT(*) FROM {Table(role)} WHERE Id=@id AND (LockoutEnd IS NULL OR LockoutEnd<=SYSUTCDATETIME())", db);
            Add(query, "@id", SqlDbType.UniqueIdentifier, id);
            return (int)(await query.ExecuteScalarAsync())! == 1;
        }
        catch (SqlException ex)
        {
            logger.LogWarning(ex, "Could not validate an authenticated session");
            return false;
        }
    }

    public async Task<AdminDashboardModel> AdminOverviewAsync(LearningStore learning, CancellationToken token)
    {
        var now = DateTime.UtcNow;
        var localNow = ThailandTime.ToLocal(now);
        var monthStartLocal = new DateTime(localNow.Year, localNow.Month, 1);
        var published = LearningCatalog.Published().ToArray();
        var publishedLessons = published.SelectMany(course => course.Lessons.Select(lesson =>
            new { CourseId = course.Id, LessonId = lesson.Id }));

        await using var db = await learning.OpenAsync(token);
        await using var query = new SqlCommand("""
            SET NOCOUNT ON;

            DECLARE @catalog TABLE (CourseId int NOT NULL, LessonId int NOT NULL, PRIMARY KEY (CourseId, LessonId));
            INSERT INTO @catalog
                SELECT DISTINCT CourseId, LessonId FROM OPENJSON(@publishedLessons)
                WITH (CourseId int, LessonId int);

            DECLARE @lessonTotals TABLE (CourseId int PRIMARY KEY, LessonCount int NOT NULL);
            INSERT INTO @lessonTotals SELECT CourseId, COUNT(*) FROM @catalog GROUP BY CourseId;

            DECLARE @enrolled TABLE (
                AccountId uniqueidentifier NOT NULL, CourseId int NOT NULL, StartedAt datetime2 NOT NULL,
                LessonCount int NOT NULL, PRIMARY KEY (AccountId, CourseId)
            );
            INSERT INTO @enrolled
                SELECT p.AccountId, p.CourseId, p.StartedAt, totals.LessonCount
                FROM dbo.LearningCourseProgress p
                INNER JOIN dbo.Users u ON u.Id=p.AccountId
                INNER JOIN @lessonTotals totals ON totals.CourseId=p.CourseId
                WHERE p.AccountRole='User';

            DECLARE @passed TABLE (
                AccountId uniqueidentifier NOT NULL, CourseId int NOT NULL, LessonId int NOT NULL,
                CompletedAt datetime2 NOT NULL, AwardedXp int NOT NULL,
                PRIMARY KEY (AccountId, CourseId, LessonId)
            );
            INSERT INTO @passed
                SELECT p.AccountId, p.CourseId, p.LessonId, p.CompletedAt, p.AwardedXp
                FROM dbo.LearningLessonCompletions p
                INNER JOIN @enrolled enrollment ON enrollment.AccountId=p.AccountId AND enrollment.CourseId=p.CourseId
                INNER JOIN @catalog lesson ON lesson.CourseId=p.CourseId AND lesson.LessonId=p.LessonId
                WHERE p.AccountRole='User';

            DECLARE @finalPassed TABLE (PassedAt datetime2 NOT NULL, AwardedXp int NOT NULL);
            INSERT INTO @finalPassed
                SELECT p.PassedAt, p.AwardedXp FROM dbo.LearningCourseFinalResults p
                INNER JOIN @enrolled e ON e.AccountId=p.AccountId AND e.CourseId=p.CourseId
                WHERE p.AccountRole='User' AND p.PassedAt IS NOT NULL;

            SELECT
              (SELECT COUNT(*) FROM dbo.Users),
              (SELECT COUNT(*) FROM dbo.Admins),
              (SELECT COUNT(*) FROM dbo.Users WHERE CreatedAt >= @monthStartUtc AND CreatedAt <= @now),
              (SELECT COUNT(*) FROM dbo.Users WHERE LastLoginAt >= @recentActivityStart OR CreatedAt >= @recentActivityStart)
              + (SELECT COUNT(*) FROM dbo.Admins WHERE LastLoginAt >= @recentActivityStart OR CreatedAt >= @recentActivityStart),
              (SELECT COUNT(*) FROM dbo.Users WHERE LastLoginAt IS NOT NULL)
              + (SELECT COUNT(*) FROM dbo.Admins WHERE LastLoginAt IS NOT NULL),
              (SELECT COUNT(*) FROM @passed),
              (SELECT COUNT(*) FROM @enrolled),
              (SELECT COALESCE(SUM(CONVERT(bigint, AwardedXp)), 0) FROM @passed)
              + (SELECT COALESCE(SUM(CONVERT(bigint, AwardedXp)), 0) FROM @finalPassed),
              (SELECT COUNT(*) FROM dbo.LearningAchievements award
               INNER JOIN dbo.Users u ON u.Id=award.AccountId
               WHERE award.AccountRole='User' AND (
                   (award.AchievementKey='first-lesson' AND EXISTS (
                       SELECT 1 FROM @passed p WHERE p.AccountId=award.AccountId))
                   OR EXISTS (
                       SELECT 1 FROM @enrolled e WHERE e.AccountId=award.AccountId
                         AND award.AchievementKey=CONCAT('course-', e.CourseId))
               )),
              (SELECT COALESCE(SUM(CONVERT(bigint, LessonCount)), 0) FROM @enrolled);

            SELECT TOP (@memberLimit) FullName, Email, Role, CreatedAt FROM (
              SELECT Id, FullName, Email, 'User' AS Role, CreatedAt FROM dbo.Users
              UNION ALL
              SELECT Id, FullName, Email, 'Admin' AS Role, CreatedAt FROM dbo.Admins
            ) members ORDER BY CreatedAt DESC, Id;

            SELECT TOP (10) FullName, Role, Action, OccurredAt FROM (
              SELECT FullName, 'User' AS Role, N'สมัครบัญชีผู้เรียน' AS Action, CreatedAt AS OccurredAt FROM dbo.Users
              UNION ALL SELECT FullName, 'Admin', N'สมัครบัญชีผู้ดูแล', CreatedAt FROM dbo.Admins
              UNION ALL SELECT FullName, 'User', N'เข้าสู่ระบบล่าสุด', LastLoginAt FROM dbo.Users WHERE LastLoginAt IS NOT NULL
              UNION ALL SELECT FullName, 'Admin', N'เข้าสู่ระบบล่าสุด', LastLoginAt FROM dbo.Admins WHERE LastLoginAt IS NOT NULL
            ) activity ORDER BY OccurredAt DESC, FullName;

            ;WITH LearnerEvents AS (
                SELECT CreatedAt AS OccurredAt FROM dbo.Users WHERE CreatedAt >= @trendStartUtc AND CreatedAt <= @now
                UNION ALL SELECT LastLoginAt FROM dbo.Users WHERE LastLoginAt >= @trendStartUtc AND LastLoginAt <= @now
                UNION ALL SELECT StartedAt FROM @enrolled WHERE StartedAt >= @trendStartUtc AND StartedAt <= @now
                UNION ALL SELECT CompletedAt FROM @passed WHERE CompletedAt >= @trendStartUtc AND CompletedAt <= @now
                UNION ALL SELECT PassedAt FROM @finalPassed WHERE PassedAt >= @trendStartUtc AND PassedAt <= @now
            ),
            ThaiMonths AS (
                SELECT DATEADD(minute, @thaiOffsetMinutes, OccurredAt) AS LocalDate FROM LearnerEvents
            )
            SELECT DATEFROMPARTS(YEAR(LocalDate), MONTH(LocalDate), 1), COUNT(*)
            FROM ThaiMonths
            GROUP BY YEAR(LocalDate), MONTH(LocalDate);
            """, db);
        query.Parameters.Add("@publishedLessons", SqlDbType.NVarChar, -1).Value = JsonSerializer.Serialize(publishedLessons);
        Add(query, "@now", SqlDbType.DateTime2, now);
        Add(query, "@monthStartUtc", SqlDbType.DateTime2, ThailandTime.ToUtc(monthStartLocal));
        Add(query, "@trendStartUtc", SqlDbType.DateTime2,
            ThailandTime.ToUtc(monthStartLocal.AddMonths(1 - AdminDashboardModel.ActivityMonths)));
        Add(query, "@thaiOffsetMinutes", SqlDbType.Int, ThailandTime.UtcOffsetMinutes);
        Add(query, "@memberLimit", SqlDbType.Int, AdminDashboardModel.MemberLimit);
        Add(query, "@recentActivityStart", SqlDbType.DateTime2, now.AddHours(-AdminDashboardModel.RecentActivityHours));

        await using var reader = await query.ExecuteReaderAsync(token);
        await reader.ReadAsync(token);
        var model = new AdminDashboardModel
        {
            LocalNow = localNow,
            PublishedCoursesCount = published.Length,
            Users = reader.GetInt32(0),
            Admins = reader.GetInt32(1),
            NewUsersThisMonth = reader.GetInt32(2),
            ActiveTodayCount = reader.GetInt32(3),
            TotalLoginsCount = reader.GetInt32(4),
            TotalLessonCompletions = reader.GetInt32(5),
            StartedCoursesCount = reader.GetInt32(6),
            TotalXpEarned = reader.GetInt64(7),
            TotalAchievementsEarned = reader.GetInt32(8),
            EnrolledLessonSlots = reader.GetInt64(9)
        };
        await reader.NextResultAsync(token);
        while (await reader.ReadAsync(token))
            model.Members.Add(new(reader.GetString(0), reader.GetString(1), reader.GetString(2), DateTime.SpecifyKind(reader.GetDateTime(3), DateTimeKind.Utc)));
        await reader.NextResultAsync(token);
        while (await reader.ReadAsync(token))
            model.Activities.Add(new(reader.GetString(0), reader.GetString(1), reader.GetString(2), DateTime.SpecifyKind(reader.GetDateTime(3), DateTimeKind.Utc)));
        await reader.NextResultAsync(token);
        while (await reader.ReadAsync(token))
            model.MonthlyActivityCounts.Add(DateOnly.FromDateTime(reader.GetDateTime(0)), reader.GetInt32(1));
        return model;
    }

    public async Task<(int Users, int Admins)> CountsAsync()
    {
        await using var db = await OpenAsync();
        await using var query = new SqlCommand("SELECT (SELECT COUNT(*) FROM dbo.Users), (SELECT COUNT(*) FROM dbo.Admins)", db);
        await using var reader = await query.ExecuteReaderAsync();
        await reader.ReadAsync();
        return (reader.GetInt32(0), reader.GetInt32(1));
    }
}
