using System;
using System.Collections.Generic;

namespace NextSkill_205_247_261.Models;

public class AdminQuizQuestion
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = "";
    public int LessonId { get; set; } = 1;
    public string LessonTitle { get; set; } = "";
    public string Prompt { get; set; } = "";
    public List<string> Choices { get; set; } = new();
    public int CorrectChoice { get; set; } = 0;
    public string Explanation { get; set; } = "";
    public string Hint { get; set; } = "";
    public string Coaching { get; set; } = "";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
