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
                    if (loaded is not null)
                    {
                        cachedCourses = loaded.Where(course => !CourseCatalog.IsRetired(course.Id)).ToList();
                        return cachedCourses.Select(CloneCourse).ToList();
                    }
                }
                catch
                {
                    // Leave invalid content on disk for the administrator to repair.
                }
            }

            cachedCourses = [];
            return [];
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
                course.Id = NextCourseId(list);
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
                if (item.Id <= 120 || list.Any(c => c.Id == item.Id))
                {
                    item.Id = NextCourseId(list);
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

    private static int NextCourseId(List<Course> courses)
        => Math.Max(120, courses.Select(course => course.Id).DefaultIfEmpty().Max()) + 1;

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
                        if (loaded is not null)
                        {
                            cachedQuestions = loaded.Where(question => !CourseCatalog.IsRetired(question.CourseId)).ToList();
                        }
                    }
                    catch
                    {
                        // Leave invalid content on disk for the administrator to repair.
                    }
                }

                cachedQuestions ??= [];
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
    // Helpers
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
        Lessons = c.Lessons?.Select(l => new Lesson
        {
            Id = l.Id,
            Title = l.Title,
            DurationMinutes = l.DurationMinutes,
            Summary = l.Summary,
            Reading = [.. l.Reading ?? []],
            VideoId = l.VideoId,
            VideoDurationSeconds = l.VideoDurationSeconds,
            VideoCreator = l.VideoCreator,
            VideoTitle = l.VideoTitle
        }).ToList() ?? new()
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
        Coaching = q.Coaching,
        UpdatedAt = q.UpdatedAt
    };
}
