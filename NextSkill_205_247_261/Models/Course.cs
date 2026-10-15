using System.Collections.Generic;

namespace NextSkill_205_247_261.Models
{
    public class Course
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Category { get; set; }
        public string Level { get; set; }
        public int Units { get; set; }
        public bool Featured { get; set; }
        public string Description { get; set; }
        public string Instructor { get; set; }
        public List<string> Skills { get; set; } = new List<string>();
        public List<Lesson> Lessons { get; set; } = new List<Lesson>();
    }
}
