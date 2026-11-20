namespace NextSkill_205_247_261.Models
{
    public class Lesson
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int DurationMinutes { get; set; }
        public string? Summary { get; set; }
        public LearningReading[] Reading { get; set; } = [];
        public string? VideoId { get; set; }
        public int VideoDurationSeconds { get; set; }
        public string? VideoCreator { get; set; }
        public string? VideoTitle { get; set; }
    }
}
