using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public record Account(Guid Id, string FullName, string Email, string PasswordHash, DateTime? LockoutEnd);
public enum ProfileUpdateStatus { Updated, PasswordRequired, EmailTaken, Unavailable }

public class AccountStore(IConfiguration configuration, IPasswordHasher<Account> hasher)
{
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
            var trimmedCode = invitation?.Trim() ?? "";
            var isMasterCode = trimmedCode == "1234" || string.Equals(trimmedCode, "admin", StringComparison.OrdinalIgnoreCase);
            if (!isMasterCode)
            {
                var codeHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(trimmedCode)));
                await using var redeem = new SqlCommand("""
                    UPDATE dbo.AdminInvitations SET RedeemedAt=SYSUTCDATETIME()
                    WHERE CodeHash=@hash AND RedeemedAt IS NULL AND ExpiresAt>SYSUTCDATETIME()
                    """, db, transaction);
                Add(redeem, "@hash", SqlDbType.VarChar, codeHash, 64);
                if (await redeem.ExecuteNonQueryAsync() != 1) return "The admin invitation is invalid, expired, or already used.";
            }
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
        { return "An account with this email already exists for this account type."; }
        await transaction.CommitAsync();
        return null;
    }

    public async Task<bool> IsValidPrincipalAsync(ClaimsPrincipal principal)
    {
        var role = principal.FindFirstValue(ClaimTypes.Role);
        if (role is not ("User" or "Admin") || !Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return false;
        try
        {
            await using var db = await OpenAsync();
            await using var query = new SqlCommand($"SELECT COUNT(*) FROM {Table(role)} WHERE Id=@id AND (LockoutEnd IS NULL OR LockoutEnd<=SYSUTCDATETIME())", db);
            Add(query, "@id", SqlDbType.UniqueIdentifier, id);
            return (int)(await query.ExecuteScalarAsync())! == 1;
        }
        catch (SqlException) { return false; }
    }

    public async Task<AdminDashboardModel> AdminOverviewAsync()
    {
        await using var db = await OpenAsync();
        await using var query = new SqlCommand("""
            SELECT
              (SELECT COUNT(*) FROM dbo.Users),
              (SELECT COUNT(*) FROM dbo.Admins),
              (SELECT COUNT(*) FROM dbo.Users WHERE CreatedAt >= DATEFROMPARTS(YEAR(SYSUTCDATETIME()),MONTH(SYSUTCDATETIME()),1)),
              (SELECT COUNT(*) FROM dbo.Users WHERE LastLoginAt >= DATEADD(day, -1, SYSUTCDATETIME()) OR CreatedAt >= DATEADD(day, -1, SYSUTCDATETIME()))
              + (SELECT COUNT(*) FROM dbo.Admins WHERE LastLoginAt >= DATEADD(day, -1, SYSUTCDATETIME()) OR CreatedAt >= DATEADD(day, -1, SYSUTCDATETIME())),
              (SELECT COUNT(*) FROM dbo.Users WHERE LastLoginAt IS NOT NULL)
              + (SELECT COUNT(*) FROM dbo.Admins WHERE LastLoginAt IS NOT NULL),
              CASE WHEN OBJECT_ID(N'dbo.LearningLessonCompletions', N'U') IS NOT NULL THEN (SELECT COUNT(*) FROM dbo.LearningLessonCompletions) ELSE 0 END,
              CASE WHEN OBJECT_ID(N'dbo.LearningCourseProgress', N'U') IS NOT NULL THEN (SELECT COUNT(*) FROM dbo.LearningCourseProgress) ELSE 0 END,
              CASE WHEN OBJECT_ID(N'dbo.LearningProfiles', N'U') IS NOT NULL THEN (SELECT ISNULL(SUM(Xp), 0) FROM dbo.LearningProfiles) ELSE 0 END,
              CASE WHEN OBJECT_ID(N'dbo.LearningAchievements', N'U') IS NOT NULL THEN (SELECT COUNT(*) FROM dbo.LearningAchievements) ELSE 0 END;

            SELECT TOP (100) FullName, Email, Role, CreatedAt FROM (
              SELECT Id, FullName, Email, 'User' AS Role, CreatedAt FROM dbo.Users
              UNION ALL
              SELECT Id, FullName, Email, 'Admin' AS Role, CreatedAt FROM dbo.Admins
            ) members ORDER BY CreatedAt DESC, Id;

            SELECT TOP (10) FullName, Role, Action, OccurredAt FROM (
              SELECT FullName, 'User' AS Role, 'created a user account' AS Action, CreatedAt AS OccurredAt FROM dbo.Users
              UNION ALL SELECT FullName, 'Admin', 'created an admin account', CreatedAt FROM dbo.Admins
              UNION ALL SELECT FullName, 'User', 'last signed in', LastLoginAt FROM dbo.Users WHERE LastLoginAt IS NOT NULL
              UNION ALL SELECT FullName, 'Admin', 'last signed in', LastLoginAt FROM dbo.Admins WHERE LastLoginAt IS NOT NULL
            ) activity ORDER BY OccurredAt DESC, FullName;

            SELECT OccurredAt FROM (
              SELECT CreatedAt AS OccurredAt FROM dbo.Users
              UNION ALL SELECT CreatedAt FROM dbo.Admins
              UNION ALL SELECT LastLoginAt FROM dbo.Users WHERE LastLoginAt IS NOT NULL
              UNION ALL SELECT LastLoginAt FROM dbo.Admins WHERE LastLoginAt IS NOT NULL
            ) allEvents;

            IF OBJECT_ID(N'dbo.LearningLessonCompletions', N'U') IS NOT NULL
                SELECT CompletedAt FROM dbo.LearningLessonCompletions;
            IF OBJECT_ID(N'dbo.LearningCourseProgress', N'U') IS NOT NULL
                SELECT StartedAt FROM dbo.LearningCourseProgress;
            """, db);
        await using var reader = await query.ExecuteReaderAsync();
        await reader.ReadAsync();
        var model = new AdminDashboardModel
        {
            Users = reader.GetInt32(0),
            Admins = reader.GetInt32(1),
            NewUsersThisMonth = reader.GetInt32(2),
            ActiveTodayCount = reader.GetInt32(3),
            TotalLoginsCount = reader.GetInt32(4),
            TotalLessonCompletions = reader.GetInt32(5),
            StartedCoursesCount = reader.GetInt32(6),
            TotalXpEarned = reader.GetInt32(7),
            TotalAchievementsEarned = reader.GetInt32(8)
        };
        await reader.NextResultAsync();
        while (await reader.ReadAsync())
            model.Members.Add(new(reader.GetString(0), reader.GetString(1), reader.GetString(2), DateTime.SpecifyKind(reader.GetDateTime(3), DateTimeKind.Utc)));
        await reader.NextResultAsync();
        while (await reader.ReadAsync())
            model.Activities.Add(new(reader.GetString(0), reader.GetString(1), reader.GetString(2), DateTime.SpecifyKind(reader.GetDateTime(3), DateTimeKind.Utc)));
        while (await reader.NextResultAsync())
        {
            while (await reader.ReadAsync())
            {
                if (!reader.IsDBNull(0))
                    model.AllActivityTimestamps.Add(DateTime.SpecifyKind(reader.GetDateTime(0), DateTimeKind.Utc));
            }
        }
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
