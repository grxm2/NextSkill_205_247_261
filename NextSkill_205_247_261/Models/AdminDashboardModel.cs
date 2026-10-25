using System;
using System.Collections.Generic;
using System.Linq;

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
    public List<AdminMember> Members { get; } = new();
    public List<AdminActivity> Activities { get; } = new();
    public List<Course> Courses { get; set; } = new();
    public List<AdminQuizQuestion> Questions { get; set; } = new();
    public int TotalLessons => Courses.Sum(c => c.Lessons?.Count ?? c.Units);
    public int TotalQuestions => Questions.Count;
}
