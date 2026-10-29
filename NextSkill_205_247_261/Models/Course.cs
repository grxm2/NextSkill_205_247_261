using System.Collections.Generic;

namespace NextSkill_205_247_261.Models
{
    public class Course
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public int Units { get; set; }
        public bool Featured { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Instructor { get; set; } = string.Empty;
        public List<string> Skills { get; set; } = new List<string>();
        public List<Lesson> Lessons { get; set; } = new List<Lesson>();
    }
}
