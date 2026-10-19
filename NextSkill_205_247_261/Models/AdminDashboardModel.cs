namespace NextSkill_205_247_261.Models;

public record AdminMember(string FullName, string Email, string Role, DateTime CreatedAt);
public record AdminActivity(string FullName, string Role, string Action, DateTime OccurredAt);
public class AdminDashboardModel
{
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public int Users { get; set; }
    public int Admins { get; set; }
    public int NewUsersThisMonth { get; set; }
    public List<AdminMember> Members { get; } = [];
    public List<AdminActivity> Activities { get; } = [];
}
