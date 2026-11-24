using System.Data;
using Microsoft.Data.SqlClient;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public sealed class CourseFavoriteStore(LearningStore learningStore)
{
    public async Task<IReadOnlySet<int>> GetCourseIdsAsync(Guid userId, CancellationToken token)
    {
        await using var connection = await learningStore.OpenAsync(token);
        await using var command = CreateCommand(connection, userId,
            "SELECT CourseId FROM dbo.CourseFavorites WHERE UserId = @userId;");
        await using var reader = await command.ExecuteReaderAsync(token);
        var ids = new HashSet<int>();
        while (await reader.ReadAsync(token))
            ids.Add(reader.GetInt32(0));
        return ids;
    }

    public async Task<IReadOnlyList<CourseFavorite>> GetAllAsync(Guid userId, CancellationToken token)
    {
        await using var connection = await learningStore.OpenAsync(token);
        await using var command = CreateCommand(connection, userId, """
            SELECT CourseId, Note, IsPinned FROM dbo.CourseFavorites
            WHERE UserId = @userId
            ORDER BY IsPinned DESC, AddedAt DESC, CourseId;
            """);
        await using var reader = await command.ExecuteReaderAsync(token);
        var favorites = new List<CourseFavorite>();
        while (await reader.ReadAsync(token))
            favorites.Add(new CourseFavorite(reader.GetInt32(0), reader.GetString(1), reader.GetBoolean(2)));
        return favorites;
    }

    public async Task<CourseFavorite?> FindAsync(Guid userId, int courseId, CancellationToken token)
    {
        await using var connection = await learningStore.OpenAsync(token);
        await using var command = CreateCommand(connection, userId, """
            SELECT Note, IsPinned FROM dbo.CourseFavorites WHERE UserId = @userId AND CourseId = @courseId;
            """, courseId);
        await using var reader = await command.ExecuteReaderAsync(token);
        return await reader.ReadAsync(token) ? new CourseFavorite(courseId, reader.GetString(0), reader.GetBoolean(1)) : null;
    }

    public async Task SetAsync(Guid userId, int courseId, bool save, CancellationToken token)
    {
        // Protect the key range for concurrent saves and preserve existing notes on retry.
        const string insert = """
            INSERT INTO dbo.CourseFavorites (UserId, CourseId)
            SELECT @userId, @courseId
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.CourseFavorites WITH (UPDLOCK, HOLDLOCK)
                WHERE UserId = @userId AND CourseId = @courseId);
            """;
        const string delete = "DELETE FROM dbo.CourseFavorites WHERE UserId = @userId AND CourseId = @courseId;";
        await using var connection = await learningStore.OpenAsync(token);
        await using var command = CreateCommand(connection, userId, save ? insert : delete, courseId);
        await command.ExecuteNonQueryAsync(token);
    }

    public async Task<bool> UpdateAsync(Guid userId, int courseId, FavoriteEditForm form, CancellationToken token)
    {
        await using var connection = await learningStore.OpenAsync(token);
        await using var command = CreateCommand(connection, userId, """
            UPDATE dbo.CourseFavorites SET Note = @note, IsPinned = @isPinned
            WHERE UserId = @userId AND CourseId = @courseId;
            """, courseId);
        command.Parameters.Add("@note", SqlDbType.NVarChar, 300).Value = form.Note?.Trim() ?? "";
        command.Parameters.Add("@isPinned", SqlDbType.Bit).Value = form.IsPinned;
        return await command.ExecuteNonQueryAsync(token) > 0;
    }

    private static SqlCommand CreateCommand(SqlConnection connection, Guid userId, string sql, int? courseId = null)
    {
        var command = new SqlCommand(sql, connection);
        command.Parameters.Add("@userId", SqlDbType.UniqueIdentifier).Value = userId;
        if (courseId is int id)
            command.Parameters.Add("@courseId", SqlDbType.Int).Value = id;
        return command;
    }
}
