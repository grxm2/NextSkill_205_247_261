namespace NextSkill_205_247_261.Models;

// Preview details share Home's journey. Enrollment is local to the browser.
public sealed class CourseEnrollmentViewModel
{
    public HomeDashboardViewModel Learner { get; } = new();
    public string Title => "English for Business";
    public string CourseId => "english-business";
    public int TotalXp => Learner.Lessons.Count * 40;
    public IReadOnlyList<CourseOutcome> Outcomes { get; } =
    [
        new("เริ่มบทสนทนาอย่างมั่นใจ", "แนะนำตัวและสื่อสารกับเพื่อนร่วมงาน", "Everyday introductions"),
        new("ให้ฟีดแบ็กอย่างสร้างสรรค์", "เลือกคำพูดที่สุภาพและเสนอทางเลือก", "Feedback patterns"),
        new("ประชุมและนำเสนอได้ชัดเจน", "เล่าไอเดียให้คนฟังเข้าใจตรงกัน", "Confident presentations"),
        new("พร้อมรับมือสถานการณ์จริง", "ฝึกเจรจา แก้ปัญหา และทำงานเป็นทีม", "Your workplace challenge")
    ];
}

public sealed record CourseOutcome(string Title, string Description, string Example);
