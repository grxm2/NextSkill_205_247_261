using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public static class AdminContentStore
{
    private static readonly object syncLock = new();
    private static List<Course>? cachedCourses;
    private static List<AdminQuizQuestion>? cachedQuestions;

    private static string DataFolder
    {
        get
        {
            var folder = Path.Combine(Directory.GetCurrentDirectory(), "Database");
            if (!Directory.Exists(folder))
            {
                Directory.CreateDirectory(folder);
            }
            return folder;
        }
    }

    private static string CoursesFilePath => Path.Combine(DataFolder, "custom_courses.json");
    private static string QuestionsFilePath => Path.Combine(DataFolder, "custom_questions.json");

    private static readonly JsonSerializerOptions jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    // ==========================================
    // Course Management
    // ==========================================

    public static List<Course> GetAllCourses()
    {
        lock (syncLock)
        {
            if (cachedCourses is not null) return cachedCourses.Select(CloneCourse).ToList();

            if (File.Exists(CoursesFilePath))
            {
                try
                {
                    var json = File.ReadAllText(CoursesFilePath);
                    var loaded = JsonSerializer.Deserialize<List<Course>>(json, jsonOptions);
                    if (loaded is { Count: > 0 })
                    {
                        cachedCourses = loaded;
                        return cachedCourses.Select(CloneCourse).ToList();
                    }
                }
                catch
                {
                    // Fall back to seed
                }
            }

            cachedCourses = SeedInitialCourses();
            SaveCoursesToDisk();
            return cachedCourses.Select(CloneCourse).ToList();
        }
    }

    public static Course? GetCourse(int id)
    {
        return GetAllCourses().FirstOrDefault(c => c.Id == id);
    }

    public static Course SaveCourse(Course course)
    {
        lock (syncLock)
        {
            var list = GetAllCourses();
            if (course.Id <= 0)
            {
                course.Id = list.Count > 0 ? list.Max(c => c.Id) + 1 : 1;
                if (course.Lessons == null || course.Lessons.Count == 0)
                {
                    course.Lessons = new List<Lesson>();
                    int unitCount = Math.Max(1, course.Units > 0 ? course.Units : 4);
                    for (int i = 1; i <= unitCount; i++)
                    {
                        course.Lessons.Add(new Lesson
                        {
                            Id = i,
                            Title = $"บทเรียนที่ {i}: {course.Title}",
                            DurationMinutes = 10
                        });
                    }
                }
                list.Add(course);
            }
            else
            {
                var idx = list.FindIndex(c => c.Id == course.Id);
                if (idx >= 0)
                {
                    if ((course.Lessons == null || course.Lessons.Count == 0) && list[idx].Lessons != null && list[idx].Lessons.Count > 0)
                    {
                        course.Lessons = list[idx].Lessons;
                    }
                    list[idx] = course;
                }
                else
                {
                    list.Add(course);
                }
            }

            cachedCourses = list;
            SaveCoursesToDisk();
            return CloneCourse(course);
        }
    }

    public static bool DeleteCourse(int id)
    {
        lock (syncLock)
        {
            var list = GetAllCourses();
            var count = list.RemoveAll(c => c.Id == id);
            if (count > 0)
            {
                cachedCourses = list;
                SaveCoursesToDisk();
                return true;
            }
            return false;
        }
    }

    public static int ImportCourses(string json)
    {
        lock (syncLock)
        {
            var imported = JsonSerializer.Deserialize<List<Course>>(json, jsonOptions);
            if (imported is null || imported.Count == 0) return 0;

            var list = GetAllCourses();
            int count = 0;
            foreach (var item in imported)
            {
                if (string.IsNullOrWhiteSpace(item.Title)) continue;
                if (item.Id <= 0 || list.Any(c => c.Id == item.Id))
                {
                    item.Id = list.Count > 0 ? list.Max(c => c.Id) + 1 : 1;
                }
                list.Add(item);
                count++;
            }

            cachedCourses = list;
            SaveCoursesToDisk();
            return count;
        }
    }

    private static void SaveCoursesToDisk()
    {
        try
        {
            if (cachedCourses is null) return;
            var json = JsonSerializer.Serialize(cachedCourses, jsonOptions);
            File.WriteAllText(CoursesFilePath, json);
        }
        catch
        {
            // Logging can be attached
        }
    }

    // ==========================================
    // Question Management
    // ==========================================

    public static List<AdminQuizQuestion> GetAllQuestions(int? courseId = null)
    {
        lock (syncLock)
        {
            if (cachedQuestions is null)
            {
                if (File.Exists(QuestionsFilePath))
                {
                    try
                    {
                        var json = File.ReadAllText(QuestionsFilePath);
                        var loaded = JsonSerializer.Deserialize<List<AdminQuizQuestion>>(json, jsonOptions);
                        if (loaded is { Count: > 0 })
                        {
                            cachedQuestions = loaded;
                        }
                    }
                    catch
                    {
                        // Fall back to seed
                    }
                }

                if (cachedQuestions is null || cachedQuestions.Count == 0)
                {
                    cachedQuestions = SeedInitialQuestions();
                    SaveQuestionsToDisk();
                }
            }

            var query = cachedQuestions.AsEnumerable();
            if (courseId.HasValue && courseId.Value > 0)
            {
                query = query.Where(q => q.CourseId == courseId.Value);
            }
            return query.Select(CloneQuestion).ToList();
        }
    }

    public static AdminQuizQuestion? GetQuestion(string id)
    {
        return GetAllQuestions().FirstOrDefault(q => q.Id == id);
    }

    public static AdminQuizQuestion SaveQuestion(AdminQuizQuestion question)
    {
        lock (syncLock)
        {
            var list = GetAllQuestions();
            if (string.IsNullOrWhiteSpace(question.Id))
            {
                question.Id = Guid.NewGuid().ToString("N");
            }
            question.UpdatedAt = DateTime.UtcNow;

            var idx = list.FindIndex(q => q.Id == question.Id);
            if (idx >= 0)
            {
                list[idx] = question;
            }
            else
            {
                list.Add(question);
            }

            cachedQuestions = list;
            SaveQuestionsToDisk();
            return CloneQuestion(question);
        }
    }

    public static bool DeleteQuestion(string id)
    {
        lock (syncLock)
        {
            var list = GetAllQuestions();
            var count = list.RemoveAll(q => q.Id == id);
            if (count > 0)
            {
                cachedQuestions = list;
                SaveQuestionsToDisk();
                return true;
            }
            return false;
        }
    }

    public static int ImportQuestions(string json)
    {
        lock (syncLock)
        {
            var imported = JsonSerializer.Deserialize<List<AdminQuizQuestion>>(json, jsonOptions);
            if (imported is null || imported.Count == 0) return 0;

            var list = GetAllQuestions();
            int count = 0;
            foreach (var q in imported)
            {
                if (string.IsNullOrWhiteSpace(q.Prompt)) continue;
                if (string.IsNullOrWhiteSpace(q.Id)) q.Id = Guid.NewGuid().ToString("N");
                q.UpdatedAt = DateTime.UtcNow;
                var existingIdx = list.FindIndex(existing => existing.Id == q.Id);
                if (existingIdx >= 0) list[existingIdx] = q;
                else list.Add(q);
                count++;
            }

            cachedQuestions = list;
            SaveQuestionsToDisk();
            return count;
        }
    }

    private static void SaveQuestionsToDisk()
    {
        try
        {
            if (cachedQuestions is null) return;
            var json = JsonSerializer.Serialize(cachedQuestions, jsonOptions);
            File.WriteAllText(QuestionsFilePath, json);
        }
        catch
        {
            // Ignore write errors
        }
    }

    // ==========================================
    // Helpers & Seeds
    // ==========================================

    private static Course CloneCourse(Course c) => new()
    {
        Id = c.Id,
        Title = c.Title,
        Category = c.Category,
        Level = c.Level,
        Units = c.Units,
        Featured = c.Featured,
        Description = c.Description,
        Instructor = c.Instructor,
        VideoUrl = c.VideoUrl,
        Skills = new List<string>(c.Skills ?? new()),
        Lessons = c.Lessons?.Select(l => new Lesson { Id = l.Id, Title = l.Title, DurationMinutes = l.DurationMinutes }).ToList() ?? new()
    };

    private static AdminQuizQuestion CloneQuestion(AdminQuizQuestion q) => new()
    {
        Id = q.Id,
        CourseId = q.CourseId,
        CourseTitle = q.CourseTitle,
        LessonId = q.LessonId,
        LessonTitle = q.LessonTitle,
        Prompt = q.Prompt,
        Choices = new List<string>(q.Choices ?? new()),
        CorrectChoice = q.CorrectChoice,
        Explanation = q.Explanation,
        Hint = q.Hint,
        UpdatedAt = q.UpdatedAt
    };

    private static List<Course> SeedInitialCourses()
    {
        var list = new List<Course>();
        int id = 1;

        list.Add(new Course
        {
            Id = id++,
            Title = "UX Research",
            Category = "Design",
            Level = "Beginner",
            Units = 6,
            Featured = true,
            Instructor = "Alex Kim",
            VideoUrl = "https://www.youtube.com/watch?v=c9Wg6Cb_YlU",
            Description = "เรียนรู้วิธีการทำวิจัยผู้ใช้ สัมภาษณ์ และทดสอบการใช้งานจริง",
            Skills = new() { "Research", "UX", "Interviewing" },
            Lessons = new()
            {
                new() { Id = 1, Title = "ตั้งคำถามวิจัย", DurationMinutes = 10 },
                new() { Id = 2, Title = "สัมภาษณ์โดยไม่ชี้นำ", DurationMinutes = 10 },
                new() { Id = 3, Title = "จากข้อมูลสู่ข้อค้นพบ", DurationMinutes = 10 },
                new() { Id = 4, Title = "วางแผนทดสอบการใช้งาน", DurationMinutes = 10 }
            }
        });

        list.Add(new Course
        {
            Id = id++,
            Title = "Design Systems",
            Category = "Design",
            Level = "Intermediate",
            Units = 8,
            Featured = false,
            Instructor = "Maya Li",
            Description = "สร้างและดูแลจัดการระบบ Design System สำหรับองค์กร",
            Skills = new() { "Design", "System", "Figma" },
            Lessons = new()
            {
                new() { Id = 1, Title = "Tokenization", DurationMinutes = 8 },
                new() { Id = 2, Title = "Components & Variants", DurationMinutes = 12 },
                new() { Id = 3, Title = "Documentation & Hand-off", DurationMinutes = 10 }
            }
        });

        list.Add(new Course
        {
            Id = id++,
            Title = "Product Strategy",
            Category = "Business",
            Level = "Beginner",
            Units = 5,
            Featured = true,
            Instructor = "John Doe",
            Description = "กำหนดกลยุทธ์ผลิตภัณฑ์ วางโรดแมป และวัดผลลัพธ์ธุรกิจ",
            Skills = new() { "Product", "Strategy", "Roadmap" },
            Lessons = new()
            {
                new() { Id = 1, Title = "Product Vision & Goals", DurationMinutes = 10 },
                new() { Id = 2, Title = "Roadmaps & Prioritization", DurationMinutes = 15 }
            }
        });

        list.Add(new Course
        {
            Id = id++,
            Title = "No-code Prototyping",
            Category = "Technology",
            Level = "Intermediate",
            Units = 7,
            Featured = false,
            Instructor = "Sara Park",
            Description = "สร้างโปรโตไทป์และเว็บแอปพลิเคชันโดยไม่ต้องเขียนโค้ด",
            Skills = new() { "Prototyping", "No-code" },
            Lessons = new()
            {
                new() { Id = 1, Title = "No-code Tools Overview", DurationMinutes = 8 },
                new() { Id = 2, Title = "Interactive User Flows", DurationMinutes = 12 }
            }
        });

        list.Add(new Course
        {
            Id = id++,
            Title = "JavaScript Basics",
            Category = "Technology",
            Level = "Beginner",
            Units = 10,
            Featured = true,
            Instructor = "Lee Chan",
            Description = "เรียนรู้พื้นฐาน JavaScript ตั้งแต่ตัวแปร เงื่อนไข ฟังก์ชัน จนถึง DOM",
            Skills = new() { "JavaScript", "Frontend", "Web" },
            Lessons = new()
            {
                new() { Id = 1, Title = "ตัวแปรและชนิดข้อมูล", DurationMinutes = 8 },
                new() { Id = 2, Title = "เงื่อนไขและการเปรียบเทียบ", DurationMinutes = 10 },
                new() { Id = 3, Title = "ฟังก์ชันและอาร์เรย์", DurationMinutes = 10 },
                new() { Id = 4, Title = "ปุ่มและ DOM Manipulation", DurationMinutes = 10 }
            }
        });

        list.Add(new Course
        {
            Id = id++,
            Title = "Advanced CSS",
            Category = "Design",
            Level = "Intermediate",
            Units = 8,
            Featured = false,
            Instructor = "Nina Rossi",
            Description = "เทคนิค CSS ขั้นสูง Flexbox, Grid, Animations และ Responsive Design",
            Skills = new() { "CSS", "UI", "Flexbox" },
            Lessons = new()
            {
                new() { Id = 1, Title = "Modern CSS Layouts", DurationMinutes = 10 },
                new() { Id = 2, Title = "Micro-interactions & Keyframes", DurationMinutes = 12 }
            }
        });

        list.Add(new Course
        {
            Id = 13,
            Title = "English for Work",
            Category = "Languages",
            Level = "Beginner",
            Units = 4,
            Featured = true,
            Instructor = "NextSkill Team",
            Description = "ฝึกภาษาอังกฤษที่ใช้จริงในการทำงาน แนะนำตัว อีเมล และการประชุม",
            Skills = new() { "English", "Communication", "Workplace" },
            Lessons = new()
            {
                new() { Id = 1, Title = "แนะนำตัวในที่ทำงาน", DurationMinutes = 8 },
                new() { Id = 2, Title = "เขียนอีเมลให้ชัดเจน", DurationMinutes = 10 },
                new() { Id = 3, Title = "สื่อสารในการประชุม", DurationMinutes = 10 },
                new() { Id = 4, Title = "ให้ข้อเสนอแนะอย่างสร้างสรรค์", DurationMinutes = 10 }
            }
        });

        return list;
    }

    private static List<AdminQuizQuestion> SeedInitialQuestions()
    {
        return new List<AdminQuizQuestion>
        {
            // English for Work (Course 13)
            new()
            {
                Id = "en-q1",
                CourseId = 13,
                CourseTitle = "English for Work",
                LessonId = 1,
                LessonTitle = "แนะนำตัวในที่ทำงาน",
                Prompt = "ประโยคใดใช้แนะนำบทบาทและตำแหน่งงานได้เหมาะสมที่สุด?",
                Choices = new() { "I am work developer.", "I work as a developer.", "I works a developer.", "I do developer work." },
                CorrectChoice = 1,
                Explanation = "ใช้ I work as a... ตามด้วยชื่ออาชีพ เป็นรูปประโยคสากลที่สุภาพและเป็นมืออาชีพ",
                Hint = "โครงสร้างคือ I work as a / an + [ตำแหน่งงาน]"
            },
            new()
            {
                Id = "en-q2",
                CourseId = 13,
                CourseTitle = "English for Work",
                LessonId = 1,
                LessonTitle = "แนะนำตัวในที่ทำงาน",
                Prompt = "เติมคำในช่องว่าง: \"I’m responsible for ___ customers.\"",
                Choices = new() { "interviewing", "interview", "interviewed", "to interview" },
                CorrectChoice = 0,
                Explanation = "หลังคำบุพบท (preposition) เช่น 'for' กริยาต้องเติม -ing (Gerund)",
                Hint = "คำบุพบท + V-ing เสมอครับ"
            },
            new()
            {
                Id = "en-q3",
                CourseId = 13,
                CourseTitle = "English for Work",
                LessonId = 1,
                LessonTitle = "แนะนำตัวในที่ทำงาน",
                Prompt = "เมื่อแนะนำตัวเสร็จสิ้นในการพบกันครั้งแรก ควรปิดท้ายด้วยประโยคใด?",
                Choices = new() { "Give me your tasks.", "You must know me.", "Nice to meet you.", "See you yesterday." },
                CorrectChoice = 2,
                Explanation = "'Nice to meet you.' เป็นประโยคปิดท้ายที่สุภาพและสร้างความประทับใจเมื่อพบเพื่อนร่วมงานใหม่",
                Hint = "เลือกประโยคที่แปลว่ายินดีที่ได้รู้จัก"
            },
            new()
            {
                Id = "en-q4",
                CourseId = 13,
                CourseTitle = "English for Work",
                LessonId = 2,
                LessonTitle = "เขียนอีเมลให้ชัดเจน",
                Prompt = "หัวเรื่องอีเมล (Subject Line) ในข้อใดชัดเจนและช่วยให้ผู้รับเข้าใจภารกิจได้ทันที?",
                Choices = new() { "Request for feedback on the homepage", "Hello!!!", "Urgent please help", "Something important" },
                CorrectChoice = 0,
                Explanation = "หัวเรื่องควรระบุเป้าหมาย (Request for feedback) และชิ้นงาน (homepage) อย่างเฉพาะเจาะจง",
                Hint = "หัวเรื่องที่ดีต้องบอก 'เรื่องอะไร' และ 'ชิ้นงานไหน'"
            },
            new()
            {
                Id = "en-q5",
                CourseId = 13,
                CourseTitle = "English for Work",
                LessonId = 2,
                LessonTitle = "เขียนอีเมลให้ชัดเจน",
                Prompt = "ในอีเมลธุรกิจ คำว่า 'by Friday' มีความหมายตรงกับข้อใด?",
                Choices = new() { "เริ่มทำหลังวันศุกร์", "ส่งงานให้เสร็จภายในไม่เกินวันศุกร์", "ทำเฉพาะทุกวันศุกร์", "เลื่อนไปวันศุกร์หน้า" },
                CorrectChoice = 1,
                Explanation = "คำว่า 'by' ใช้ระบุกำหนดเวลาส่ง (Deadline) หมายถึงไม่เกินเวลานั้น",
                Hint = "'by' แสดงเส้นตาย (Deadline) ของภารกิจ"
            },

            // UX Research (Course 1)
            new()
            {
                Id = "ux-q1",
                CourseId = 1,
                CourseTitle = "UX Research",
                LessonId = 1,
                LessonTitle = "ตั้งคำถามวิจัย",
                Prompt = "ข้อใดคือคำถามวิจัยที่ไม่ชี้นำ (Unbiased Research Question)?",
                Choices = new() { "ผู้ใช้ชอบปุ่มสีฟ้าของเราใช่ไหม?", "ผู้ใช้ติดขัดตรงไหนในการเลือกคอร์สแรก?", "ทำไมผู้ใช้ไม่เข้าใจดีไซน์ที่ดีของเรา?", "คิดว่าเว็บของเราสวยที่สุดใช่หรือไม่?" },
                CorrectChoice = 1,
                Explanation = "คำถามเรื่องสิ่งที่ติดขัดเปิดกว้างให้ค้นพบปัญหาจริง โดยไม่ด่วนสรุปหรือชี้นำว่าระบบดีหรือไม่ดี",
                Hint = "เลือกคำถามปลายเปิดที่ไม่ได้บังคับให้ผู้ใช้ชมหรือติ"
            },
            new()
            {
                Id = "ux-q2",
                CourseId = 1,
                CourseTitle = "UX Research",
                LessonId = 1,
                LessonTitle = "ตั้งคำถามวิจัย",
                Prompt = "หากต้องการทราบว่าผู้ใช้หาปุ่มเปลี่ยนคอร์สเจอหรือไม่ ควรใช้วิธีวิจัยใด?",
                Choices = new() { "ทดสอบการใช้งานด้วยภารกิจจริง (Usability Test)", "นับจำนวนการคลิกโดยรวมอย่างเดียว", "ส่งแบบสอบถามถามความชอบสีปุ่ม", "ถามความเห็นในทีมดีไซน์กันเอง" },
                CorrectChoice = 0,
                Explanation = "การให้ผู้ใช้ทำภารกิจจริงจะช่วยให้สังเกตเห็นพฤติกรรมและการมองหาปุ่มจริง ๆ โดยไม่คาดเดา",
                Hint = "การทดสอบโดยให้ลองทำจริงให้ข้อมูลพฤติกรรมที่ชัดเจนที่สุด"
            },
            new()
            {
                Id = "ux-q3",
                CourseId = 1,
                CourseTitle = "UX Research",
                LessonId = 2,
                LessonTitle = "สัมภาษณ์โดยไม่ชี้นำ",
                Prompt = "เมื่อผู้ใช้บอกว่า 'ขั้นตอนการใช้งานค่อนข้างยาก' ผู้สัมภาษณ์ควรถามต่ออย่างไร?",
                Choices = new() { "ช่วยเล่าว่าตอนนั้นลองทำอย่างไรบ้าง?", "เป็นเพราะปุ่มเล็กเกินไปใช่ไหม?", "จริง ๆ แล้วระบบใช้งานง่ายมากนะ", "ทำไมไม่กดปุ่มด้านบนล่ะ?" },
                CorrectChoice = 0,
                Explanation = "การขอให้ผู้ใช้เล่าเหตุการณ์ที่เกิดขึ้นช่วยให้เราเข้าใจสิ่งที่เขาเจอ โดยไม่ใส่ความเห็นชี้นำ",
                Hint = "ชวนให้ผู้ใช้เล่าสิ่งที่ทำ แทนการเดาสาเหตุแทนเขา"
            },

            // JavaScript Basics (Course 5)
            new()
            {
                Id = "js-q1",
                CourseId = 5,
                CourseTitle = "JavaScript Basics",
                LessonId = 1,
                LessonTitle = "ตัวแปรและชนิดข้อมูล",
                Prompt = "หากต้องการสร้างตัวแปรคะแนน xp ที่สามารถเพิ่มค่าได้ในภายหลัง ควรประกาศอย่างไร?",
                Choices = new() { "const xp = 0;", "fixed xp = 0;", "let xp = 0;", "val xp = 0;" },
                CorrectChoice = 2,
                Explanation = "'let' อนุญาตให้ทำการ Re-assign กำหนดค่าใหม่ได้ ในขณะที่ 'const' เป็นค่าคงที่ห้ามเปลี่ยน",
                Hint = "ตัวแปรที่ค่าเปลี่ยนได้ใน JS ใช้ 'let'"
            },
            new()
            {
                Id = "js-q2",
                CourseId = 5,
                CourseTitle = "JavaScript Basics",
                LessonId = 1,
                LessonTitle = "ตัวแปรและชนิดข้อมูล",
                Prompt = "ใน JavaScript นิพจน์ '50' + 10 จะได้ผลลัพธ์เป็นค่าอะไร?",
                Choices = new() { "ข้อความ '5010'", "ตัวเลข 60", "ตัวเลข 500", "NaN (Not a Number)" },
                CorrectChoice = 0,
                Explanation = "เมื่อตัวถูกดำเนินการข้างใดข้างหนึ่งเป็น String เครื่องหมาย + จะทำหน้าที่ต่อข้อความ (Concatenation)",
                Hint = "String + Number จะถูกแปลงเป็น String ต่อกัน"
            },
            new()
            {
                Id = "js-q3",
                CourseId = 5,
                CourseTitle = "JavaScript Basics",
                LessonId = 2,
                LessonTitle = "เงื่อนไขและการเปรียบเทียบ",
                Prompt = "ผลลัพธ์ของ 5 === '5' ใน JavaScript คืออะไร และเพราะเหตุใด?",
                Choices = new() { "true เพราะมีค่าเลข 5 เหมือนกัน", "false เพราะ Type ต่างกัน (Number กับ String)", "undefined เพราะเปรียบเทียบไม่ได้", "'5' คืนค่าตัวหลัง" },
                CorrectChoice = 1,
                Explanation = "ตัวดำเนินการ === (Strict Equality) จะตรวจสอบทั้งชนิดข้อมูล (Type) และค่า (Value)",
                Hint = "Strict equality (===) จะไม่แปลง Type ให้อัตโนมัติ"
            },
            new()
            {
                Id = "js-q4",
                CourseId = 5,
                CourseTitle = "JavaScript Basics",
                LessonId = 3,
                LessonTitle = "ฟังก์ชันและอาร์เรย์",
                Prompt = "จากโค้ด: const skills = ['UX', 'JavaScript', 'Design']; ค่า skills[0] คืออะไร?",
                Choices = new() { "'UX'", "'JavaScript'", "'Design'", "undefined" },
                CorrectChoice = 0,
                Explanation = "Index ของ Array ใน JavaScript เริ่มต้นที่ 0 เสมอ ดังนั้นสมาชิกตัวแรกคือ skills[0] = 'UX'",
                Hint = "ตำแหน่งแรกของ Array เริ่มนับที่ 0"
            }
        };
    }
}
