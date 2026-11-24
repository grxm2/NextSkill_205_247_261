using System.Diagnostics;
using System.Text.Json;
using NextSkill_205_247_261.Models;
using NextSkill_205_247_261.Services;

static void Check(bool condition, string name)
{
    if (!condition) throw new InvalidOperationException(name);
    Console.WriteLine($"PASS {name}");
}

static Course NewCourse(string title) => new()
{
    Title = title, Category = "Design", Instructor = "Test source", Units = 1
};

static void ExpectInvalid(Action action)
{
    try { action(); }
    catch (Exception error) when (error is ContentValidationException or JsonException) { return; }
    throw new InvalidOperationException("Expected validation failure");
}

AdminContentStore.Configure(Directory.GetCurrentDirectory());
if (args.Length == 2 && args[0] == "child")
{
    AdminContentStore.SaveCourse(NewCourse(args[1]));
    return;
}

Check(AdminContentStore.GetAllCourses().Count == 21 && AdminContentStore.GetAllQuestions().Count == 176,
    "repository root does not override bundled content");
var course = AdminContentStore.SaveCourse(NewCourse("Course before archive"), 540);
Check(course.Id == 541 && course.Lessons.Count == 1, "SQL historical ID floor applied to persisted course");
var question = AdminContentStore.SaveQuestion(new AdminQuizQuestion
{
    CourseId = course.Id, LessonId = 1, Prompt = "Which option fits?",
    Choices = ["First", "Second"], CorrectChoice = 1, Explanation = "The second fits this question."
});
Check(AdminContentStore.GetQuestion(question.Id)?.CorrectChoice == 1, "question choice and server identity stored");
Check(AdminContentStore.DeleteCourse(course.Id), "archive course");
Check(AdminContentStore.GetCourse(course.Id) is null && AdminContentStore.GetHistoricalCourse(course.Id)?.Title == course.Title,
    "archived title retained and excluded from active");
Check(AdminContentStore.GetAllQuestions(course.Id).Count == 0 &&
    File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Database", "custom_questions.json")).Contains(question.Id),
    "archived question stays stored and inaccessible in active list");
var next = AdminContentStore.SaveCourse(NewCourse("Course after archive"));
Check(next.Id == 542, "archive identity is never reused");
var before = AdminContentStore.GetAllCourses().Count;
ExpectInvalid(() => AdminContentStore.ImportCourses("""[{"Title":"Valid","Category":"Design","Instructor":"Source"},{"Title":"Incomplete"}]"""));
ExpectInvalid(() => AdminContentStore.ImportCourses("""[{"Title":"Unexpected","Category":"Design","Instructor":"Source","Unsupported":true}]"""));
Check(AdminContentStore.GetAllCourses().Count == before, "invalid import leaves no partial writes");
Check(AdminContentStore.ImportCourses("""[{"Id":1,"Title":"Additional","Category":"Design","Instructor":"Source"}]""") == 1 &&
    AdminContentStore.GetCourse(1)?.Title == "UX Research", "import assigns fresh ID and preserves existing course");
ExpectInvalid(() => AdminContentStore.SaveQuestion(new AdminQuizQuestion
{
    CourseId = next.Id, LessonId = 1, Prompt = "Select a distinct answer",
    Choices = ["Same", "Same"], CorrectChoice = 0, Explanation = "Example explanation"
}));
Check(AdminContentStore.GetAllQuestions().Count == 176, "invalid quiz choices are not persisted");

var children = new[] { "Concurrent first", "Concurrent second" }.Select(title =>
{
    var info = new ProcessStartInfo("dotnet") { UseShellExecute = false, CreateNoWindow = true };
    info.ArgumentList.Add(typeof(Program).Assembly.Location);
    info.ArgumentList.Add("child");
    info.ArgumentList.Add(title);
    return Process.Start(info) ?? throw new InvalidOperationException("Cannot start child test process");
}).ToArray();
await Task.WhenAll(children.Select(child => child.WaitForExitAsync()));
var concurrentlyCreated = AdminContentStore.GetAllCourses().Where(item => item.Title.StartsWith("Concurrent", StringComparison.Ordinal)).ToArray();
Check(children.All(child => child.ExitCode == 0) && concurrentlyCreated.Length == 2 &&
    concurrentlyCreated.Select(item => item.Id).Distinct().Count() == 2, "parallel writers retained and reader sees both");
Check(CourseBrowseItem.ToEmbedUrl("https://youtu.be/VKl8X16GoiY")?.Contains("youtube-nocookie.com/embed/VKl8X16GoiY") == true &&
    CourseBrowseItem.ToEmbedUrl("https://vimeo.com/123456") == "https://player.vimeo.com/video/123456" &&
    CourseBrowseItem.IsDirectVideo("https://example.test/video.mp4") &&
    CourseBrowseItem.ToEmbedUrl("https://example.test/article") is null, "supported media works and unknown embed is hidden");
