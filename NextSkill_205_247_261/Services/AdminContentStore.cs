using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public sealed class ContentValidationException(string message) : Exception(message)
{
}

public static partial class AdminContentStore
{
    public const int CourseTitleLimit = 200;
    public const int CourseCategoryLimit = 80;
    public const int CourseLevelLimit = 60;
    public const int CourseInstructorLimit = 200;
    public const int CourseDescriptionLimit = 4000;
    public const int CourseSkillsLimit = 30;
    public const int CourseSkillLimit = 80;
    public const int CourseLessonLimit = 50;
    public const int CourseReadingSectionLimit = 30;
    public const int VideoUrlLimit = 2048;
    public const int QuestionPromptLimit = 1000;
    public const int QuestionChoiceLimit = 500;
    public const int QuestionNoteLimit = 2000;
    public const int MaxImportedCourses = 100;
    public const int DefaultLessonMinutes = 10;

    private const string CourseFileName = "custom_courses.json";
    private const string QuestionFileName = "custom_questions.json";
    private const int DefaultUnits = 4;
    private const int LastSeedCourseId = 120;
    private static string dataFolder = Path.Combine(AppContext.BaseDirectory, "Database");

    private static string CoursesFilePath => Path.Combine(dataFolder, CourseFileName);
    private static string QuestionsFilePath => Path.Combine(dataFolder, QuestionFileName);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    private static readonly JsonSerializerOptions ImportOptions = new(JsonOptions)
    {
        MaxDepth = 12,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };

    [GeneratedRegex(@"\A[A-Za-z0-9_-]{1,80}\z")]
    private static partial Regex QuestionIdPattern();

    [GeneratedRegex(@"\A[A-Za-z0-9_-]{11}\z")]
    private static partial Regex YouTubeIdPattern();

    public static void Configure(string contentRoot)
    {
        var contentFolder = Path.Combine(contentRoot, "Database");
        var isProjectRoot = File.Exists(Path.Combine(contentRoot, "NextSkill_205_247_261.csproj"));
        dataFolder = isProjectRoot
            ? contentFolder
            : Path.Combine(AppContext.BaseDirectory, "Database");

        var courses = ReadCourses();
        if (courses.Any(course => course.Id <= 0) || courses.Select(course => course.Id).Distinct().Count() != courses.Count)
            throw new InvalidDataException("Course content contains an invalid or duplicate course ID.");
        ReadQuestions();
    }

    public static List<Course> GetAllCourses() => ReadCourses().Where(IsAvailable).ToList();

    public static Course? GetCourse(int id) => ReadCourses().Find(course => course.Id == id && IsAvailable(course));

    public static Course? GetHistoricalCourse(int id) => ReadCourses().Find(course => course.Id == id);

    public static Course SaveCourse(Course course, int highestRecordedCourseId = 0)
    {
        using var contentLock = AcquireWriteLock();
        var courses = ReadCourses();
        if (course.Id <= 0)
        {
            PrepareCourse(course);
            course.Id = NextCourseId(courses, highestRecordedCourseId);
            course.IsPublished = false;
            course.CreatedAt = DateTime.UtcNow;
            courses.Add(course);
        }
        else
        {
            var index = courses.FindIndex(item => item.Id == course.Id && IsAvailable(item));
            if (index < 0)
                throw new ContentValidationException("ไม่พบคอร์สที่สามารถแก้ไขได้");

            var saved = courses[index];
            var questions = ReadQuestions().Where(question => question.CourseId == course.Id).ToList();
            PrepareCourse(course, saved.Lessons);
            course.IsPublished = saved.IsPublished;
            course.CreatedAt = saved.CreatedAt;
            if (ProtectedDefinition(saved, questions) is { } previous)
            {
                if (!saved.Lessons.Select(lesson => lesson.Id).ToHashSet().SetEquals(course.Lessons.Select(lesson => lesson.Id)))
                    throw new ContentValidationException("คอร์สที่เผยแพร่แล้วต้องคงชุดรหัสบทเรียนเดิมไว้เพื่อรักษาประวัติการเรียน");
                EnsurePublishable(course, questions, preserveExplicitFinal: !previous.UsesLegacyFinal);
            }
            else if (questions.Any(question => question.LessonId != AdminQuizQuestion.FinalQuizLessonId &&
                course.Lessons.All(lesson => lesson.Id != question.LessonId)))
            {
                throw new ContentValidationException("ลบหรือย้ายคำถามในบทเรียนที่ต้องการนำออกก่อนบันทึกคอร์ส");
            }
            courses[index] = course;
        }

        WriteRows(CoursesFilePath, courses);
        return course;
    }

    public static Course PublishCourse(int id)
    {
        using var contentLock = AcquireWriteLock();
        var courses = ReadCourses();
        var course = courses.Find(item => item.Id == id && IsAvailable(item))
            ?? throw new ContentValidationException("ไม่พบคอร์สที่สามารถเผยแพร่ได้");

        if (course.IsPublished == true) return course;
        course.IsPublished = true;
        EnsurePublishable(course, ReadQuestions());
        WriteRows(CoursesFilePath, courses);
        return course;
    }

    public static bool DeleteCourse(int id)
    {
        using var contentLock = AcquireWriteLock();
        var courses = ReadCourses();
        var course = courses.Find(item => item.Id == id && IsAvailable(item));
        if (course is null) return false;

        // Keep the ID and metadata reserved for existing progress and awards.
        course.IsArchived = true;
        WriteRows(CoursesFilePath, courses);
        return true;
    }

    public static int ImportCourses(string json, int highestRecordedCourseId = 0)
    {
        var imported = JsonSerializer.Deserialize<List<Course>>(json, ImportOptions);
        if (imported is null || imported.Count is < 1 or > MaxImportedCourses)
            throw new ContentValidationException($"ไฟล์ต้องมีรายการคอร์สตั้งแต่ 1 ถึง {MaxImportedCourses} รายการ");

        for (var i = 0; i < imported.Count; i++)
        {
            try
            {
                if (imported[i] is null)
                    throw new ContentValidationException("ข้อมูลคอร์สต้องเป็นออบเจ็กต์ JSON");
                PrepareCourse(imported[i]);
            }
            catch (ContentValidationException exception)
            {
                throw new ContentValidationException($"คอร์สลำดับที่ {i + 1}: {exception.Message}");
            }
        }

        using var contentLock = AcquireWriteLock();
        var courses = ReadCourses();
        var nextId = NextCourseId(courses, highestRecordedCourseId, imported.Count);
        var createdAt = DateTime.UtcNow;
        for (var i = 0; i < imported.Count; i++)
        {
            var course = imported[i];
            course.Id = nextId + i;
            course.IsPublished = false;
            course.CreatedAt = createdAt;
            courses.Add(course);
        }

        WriteRows(CoursesFilePath, courses);
        return imported.Count;
    }

    public static List<AdminQuizQuestion> GetAllQuestions(int? courseId = null)
    {
        var available = ReadCourses().Where(IsAvailable).Select(course => course.Id).ToHashSet();
        return ReadQuestions().Where(question => available.Contains(question.CourseId)
            && (courseId is not > 0 || question.CourseId == courseId)).ToList();
    }

    public static AdminQuizQuestion? GetQuestion(string id) => GetAllQuestions().Find(question => question.Id == id);

    public static AdminQuizQuestion SaveQuestion(AdminQuizQuestion question)
    {
        using var contentLock = AcquireWriteLock();
        var courses = ReadCourses();
        PrepareQuestion(question, courses);
        var questions = ReadQuestions();
        var original = string.IsNullOrEmpty(question.Id) ? null : questions.Find(item => item.Id == question.Id);
        var protectedCourses = courses.Where(course => IsAvailable(course) &&
                (course.Id == question.CourseId || course.Id == original?.CourseId))
            .Select(course => (Course: course, Definition: ProtectedDefinition(course, questions)))
            .Where(item => item.Definition is not null).ToList();
        if (string.IsNullOrWhiteSpace(question.Id))
        {
            question.Id = Guid.NewGuid().ToString("N");
            questions.Add(question);
        }
        else
        {
            if (!QuestionIdPattern().IsMatch(question.Id))
                throw new ContentValidationException("รหัสคำถามไม่ถูกต้อง");
            var index = questions.FindIndex(item => item.Id == question.Id);
            if (index < 0 || !courses.Any(course => course.Id == questions[index].CourseId && IsAvailable(course)))
                throw new ContentValidationException("ไม่พบคำถามที่สามารถแก้ไขได้");
            questions[index] = question;
        }

        foreach (var (course, previous) in protectedCourses)
            EnsurePublishable(course, questions, preserveExplicitFinal: !previous!.UsesLegacyFinal);
        question.UpdatedAt = DateTime.UtcNow;
        WriteRows(QuestionsFilePath, questions);
        return question;
    }

    public static bool DeleteQuestion(string id)
    {
        using var contentLock = AcquireWriteLock();
        var questions = ReadQuestions();
        var available = ReadCourses().Where(IsAvailable).ToDictionary(course => course.Id);
        var index = questions.FindIndex(question => question.Id == id && available.ContainsKey(question.CourseId));
        if (index < 0) return false;

        var course = available[questions[index].CourseId];
        var previous = ProtectedDefinition(course, questions);
        questions.RemoveAt(index);
        if (previous is not null)
            EnsurePublishable(course, questions, preserveExplicitFinal: !previous.UsesLegacyFinal);
        WriteRows(QuestionsFilePath, questions);
        return true;
    }

    private static bool IsAvailable(Course course) => !course.IsArchived && !CourseCatalog.IsRetired(course.Id);

    private static LearningCourseDefinition? ProtectedDefinition(Course course, IEnumerable<AdminQuizQuestion> questions)
    {
        if (course.IsPublished == false) return null;
        var definition = BuildDefinition(course, questions);
        return course.IsPublished == true || definition.CanStart ? definition : null;
    }

    private static LearningCourseDefinition BuildDefinition(Course course, IEnumerable<AdminQuizQuestion> questions) =>
        LearningCatalog.Build(course, questions.Where(question => question.CourseId == course.Id)
            .ToLookup(question => question.LessonId));

    private static void EnsurePublishable(Course course, IEnumerable<AdminQuizQuestion> questions, bool preserveExplicitFinal = false)
    {
        var definition = BuildDefinition(course, questions);
        if (!definition.CanStart || (preserveExplicitFinal && definition.UsesLegacyFinal))
            throw new ContentValidationException("คอร์สที่จะเปิดให้เรียนต้องมีบทอ่านหรือวิดีโอและคำถามในทุกบท พร้อมข้อสอบท้ายคอร์สตามเกณฑ์");
    }

    private static List<Course> ReadCourses()
    {
        var courses = ReadRows<Course>(CoursesFilePath);
        foreach (var course in courses)
        {
            // Older imports could write null collections. Keep them readable as empty lists.
            course.Skills ??= [];
            course.Lessons ??= [];
            foreach (var lesson in course.Lessons)
            {
                if (lesson is null)
                    throw new InvalidDataException("Course content contains an empty lesson entry.");
                lesson.Reading ??= [];
            }
        }
        return courses;
    }

    private static List<AdminQuizQuestion> ReadQuestions()
    {
        var questions = ReadRows<AdminQuizQuestion>(QuestionsFilePath);
        foreach (var question in questions)
            question.Choices ??= [];
        return questions;
    }

    private static int NextCourseId(List<Course> courses, int highestRecordedCourseId, int needed = 1)
    {
        var highestCourse = courses.Select(course => course.Id).DefaultIfEmpty().Max();
        var highestQuestionCourse = ReadQuestions().Select(question => question.CourseId).DefaultIfEmpty().Max();
        var highestId = Math.Max(Math.Max(LastSeedCourseId, highestCourse), Math.Max(highestRecordedCourseId, highestQuestionCourse));
        if (highestId > int.MaxValue - needed)
            throw new ContentValidationException("ไม่สามารถสร้างรหัสคอร์สเพิ่มได้");

        return highestId + 1;
    }

    private static void PrepareCourse(Course course, List<Lesson>? existingLessons = null)
    {
        course.Title = ReadText(course.Title, CourseTitleLimit, "ชื่อคอร์ส", required: true);
        course.Category = ReadText(course.Category, CourseCategoryLimit, "หมวดหมู่", required: true);
        course.Level = ReadText(string.IsNullOrWhiteSpace(course.Level) ? "Beginner" : course.Level,
            CourseLevelLimit, "ระดับ");
        course.Instructor = ReadText(course.Instructor, CourseInstructorLimit, "เจ้าของเนื้อหา", required: true);
        course.Description = ReadText(course.Description, CourseDescriptionLimit, "คำอธิบายคอร์ส");
        if (course.Units is < 0 or > CourseLessonLimit)
            throw new ContentValidationException($"จำนวนบทเรียนต้องไม่เกิน {CourseLessonLimit}");
        if (course.Skills is null || course.Skills.Count > CourseSkillsLimit)
            throw new ContentValidationException($"ทักษะต้องเป็นรายการที่มีไม่เกิน {CourseSkillsLimit} รายการ");
        course.Skills = course.Skills.Select(skill => ReadText(skill, CourseSkillLimit, "ทักษะ", required: true))
            .Distinct(StringComparer.OrdinalIgnoreCase).ToList();

        course.VideoUrl = ReadOptionalText(course.VideoUrl, VideoUrlLimit, "URL วิดีโอ");
        if (course.VideoUrl is not null && !CourseBrowseItem.IsDirectVideo(course.VideoUrl) &&
            CourseBrowseItem.ToEmbedUrl(course.VideoUrl) is null)
            throw new ContentValidationException("รองรับเฉพาะลิงก์ YouTube, Vimeo หรือลิงก์ไฟล์วิดีโอ HTTP(S)");

        if (course.Lessons is null)
            throw new ContentValidationException("บทเรียนต้องเป็นรายการ");
        if (course.Lessons.Count == 0)
        {
            if (existingLessons is { Count: > 0 })
            {
                course.Lessons = existingLessons;
            }
            else
            {
                var unitCount = course.Units > 0 ? course.Units : DefaultUnits;
                course.Lessons = Enumerable.Range(1, unitCount).Select(id => new Lesson
                {
                    Id = id,
                    Title = $"บทเรียนที่ {id}",
                    DurationMinutes = DefaultLessonMinutes
                }).ToList();
            }
        }
        else
        {
            if (course.Lessons.Count > CourseLessonLimit || course.Lessons.Any(lesson => lesson is null) ||
                course.Lessons.Select(lesson => lesson.Id).Distinct().Count() != course.Lessons.Count)
                throw new ContentValidationException("จำนวนบทเรียนเกินกำหนดหรือมีรหัสบทเรียนซ้ำ");
            foreach (var lesson in course.Lessons)
                PrepareLesson(lesson);
        }

        course.Units = course.Lessons.Count;
        course.IsArchived = false;
    }

    private static void PrepareLesson(Lesson lesson)
    {
        if (lesson.Id is <= 0 or > CourseLessonLimit)
            throw new ContentValidationException($"รหัสบทเรียนต้องอยู่ระหว่าง 1 ถึง {CourseLessonLimit}");
        if (lesson.DurationMinutes is < 0 or > 720)
            throw new ContentValidationException("ระยะเวลาอ่านบทเรียนอยู่นอกช่วงที่รองรับ");

        lesson.Title = ReadText(lesson.Title, CourseTitleLimit, "ชื่อบทเรียน", required: true);
        lesson.Summary = ReadOptionalText(lesson.Summary, CourseDescriptionLimit, "สรุปบทเรียน");
        if (lesson.Reading is null || lesson.Reading.Length > CourseReadingSectionLimit ||
            lesson.Reading.Any(section => section is null))
            throw new ContentValidationException("รูปแบบเนื้อหาบทเรียนไม่ถูกต้องหรือแบ่งเป็นหัวข้อมากเกินกำหนด");

        lesson.Reading = lesson.Reading.Select(section => new LearningReading(
            ReadText(section.Heading, CourseTitleLimit, "หัวข้อบทอ่าน", required: true),
            ReadText(section.Text, CourseDescriptionLimit, "เนื้อหาบทอ่าน", required: true),
            ReadOptionalText(section.Example, CourseDescriptionLimit, "ตัวอย่างบทอ่าน"))).ToArray();

        lesson.VideoId = ReadOptionalText(lesson.VideoId, 11, "รหัสวิดีโอบทเรียน");
        if ((lesson.VideoId is not null && (!YouTubeIdPattern().IsMatch(lesson.VideoId) ||
                lesson.VideoDurationSeconds is <= 0 or > 7200)) ||
            (lesson.VideoId is null && lesson.VideoDurationSeconds != 0))
            throw new ContentValidationException("รหัสหรือระยะเวลาวิดีโอบทเรียนไม่ถูกต้อง");

        lesson.VideoTitle = ReadOptionalText(lesson.VideoTitle, CourseTitleLimit, "ชื่อวิดีโอ");
        lesson.VideoCreator = ReadOptionalText(lesson.VideoCreator, CourseInstructorLimit, "เจ้าของวิดีโอ");
    }

    private static void PrepareQuestion(AdminQuizQuestion question, List<Course> courses)
    {
        var course = courses.Find(item => item.Id == question.CourseId && IsAvailable(item));
        var isFinalQuiz = question.LessonId == AdminQuizQuestion.FinalQuizLessonId;
        var lesson = course?.Lessons.Find(item => item.Id == question.LessonId);
        if (course is null || (!isFinalQuiz && lesson is null))
            throw new ContentValidationException("ไม่พบคอร์สหรือบทเรียนที่เลือก");

        question.Prompt = ReadText(question.Prompt, QuestionPromptLimit, "คำถาม", required: true);
        if (question.Choices is null || question.Choices.Count is < 2 or > 4 ||
            question.CorrectChoice < 0 || question.CorrectChoice >= question.Choices.Count)
            throw new ContentValidationException("ระบุตัวเลือก 2 ถึง 4 ข้อและเลือกคำตอบที่ถูกต้อง");
        question.Choices = question.Choices.Select(choice => ReadText(choice, QuestionChoiceLimit,
            "ตัวเลือกคำตอบ", required: true)).ToList();
        if (question.Choices.Distinct(StringComparer.OrdinalIgnoreCase).Count() != question.Choices.Count)
            throw new ContentValidationException("ตัวเลือกคำตอบต้องไม่ซ้ำกัน");

        question.Explanation = ReadText(question.Explanation, QuestionNoteLimit, "คำอธิบายเฉลย", required: true);
        question.Hint = ReadText(question.Hint, QuestionNoteLimit, "คำใบ้");
        question.Coaching = ReadText(question.Coaching, QuestionNoteLimit, "แนวคิดเพิ่มเติม");
        question.CourseTitle = course.Title;
        question.LessonTitle = isFinalQuiz ? "แบบทดสอบท้ายคอร์ส" : lesson!.Title;
    }

    private static string ReadText(string? value, int limit, string field, bool required = false)
    {
        var text = value?.Trim() ?? string.Empty;
        if (required && text.Length == 0)
            throw new ContentValidationException($"กรุณาระบุ{field}");
        if (text.Length > limit)
            throw new ContentValidationException($"{field}ต้องมีความยาวไม่เกิน {limit} ตัวอักษร");
        return text;
    }

    private static string? ReadOptionalText(string? value, int limit, string field)
    {
        var text = ReadText(value, limit, field);
        return text.Length > 0 ? text : null;
    }

    private static List<T> ReadRows<T>(string path) where T : class
    {
        // Read the committed file on every request so other processes see the latest write.
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
        try
        {
            var rows = JsonSerializer.Deserialize<List<T>>(stream, JsonOptions);
            if (rows is null || rows.Any(row => row is null))
                throw new InvalidDataException($"Invalid content in {Path.GetFileName(path)}.");
            return rows;
        }
        catch (JsonException exception)
        {
            throw new InvalidDataException($"Invalid JSON in {Path.GetFileName(path)}.", exception);
        }
    }

    private static FileStream AcquireWriteLock()
    {
        var path = Path.Combine(dataFolder, ".content.lock");
        var started = Stopwatch.StartNew();
        while (true)
        {
            try
            {
                return new FileStream(path, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
            }
            catch (IOException) when (started.ElapsedMilliseconds < 2500)
            {
                Thread.Sleep(25);
            }
        }
    }

    private static void WriteRows<T>(string path, List<T> rows)
    {
        // A same-directory rename commits the completed file without ever exposing a partial save.
        var temporaryPath = Path.Combine(dataFolder, $".content-{Guid.NewGuid():N}.tmp");
        try
        {
            using (var stream = new FileStream(temporaryPath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                JsonSerializer.Serialize(stream, rows, JsonOptions);
                stream.Flush(flushToDisk: true);
            }
            File.Move(temporaryPath, path, overwrite: true);
        }
        finally
        {
            try
            {
                // On success the rename already removed the temporary file.
                File.Delete(temporaryPath);
            }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }
}
