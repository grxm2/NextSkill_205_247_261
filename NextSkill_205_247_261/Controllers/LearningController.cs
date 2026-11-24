using System.Security.Claims;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using NextSkill_205_247_261.Models;
using NextSkill_205_247_261.Services;

namespace NextSkill_205_247_261.Controllers;

[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class LearningController(LearningStore store, ILogger<LearningController> logger, IWebHostEnvironment environment, IConfiguration configuration, IDataProtectionProvider protection) : Controller
{
    private Guid? previewId;
    // Preview identities are isolated, signed browser sessions, never authentication claims.
    public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var action = context.ActionDescriptor.RouteValues["action"];
        if (User.Identity?.IsAuthenticated != true && action is not (nameof(Catalog) or nameof(Entry)))
        {
            if (!environment.IsDevelopment() || !configuration.GetValue("Learning:GuestPreview", true))
            {
                context.Result = Challenge();
                return;
            }
            var protector = protection.CreateProtector("NextSkill.LocalLearningPreview.v1");
            if (Request.Cookies.TryGetValue("NextSkill.LearningPreview", out var cookie))
            {
                try { if (Guid.TryParse(protector.Unprotect(cookie), out var id)) previewId = id; }
                catch (System.Security.Cryptography.CryptographicException) { }
            }
            if (previewId is null)
            {
                previewId = Guid.NewGuid();
                Response.Cookies.Append("NextSkill.LearningPreview", protector.Protect(previewId.Value.ToString()),
                    new CookieOptions { HttpOnly = true, Secure = Request.IsHttps, SameSite = SameSiteMode.Lax, IsEssential = true });
            }
        }
        await next();
    }

    [AllowAnonymous, HttpGet]
    public IActionResult Catalog() => Json(new { courses = LearningCatalog.PublicCatalog() });

    // Only the explicit root route uses this dispatcher. Deep links and Home stay put.
    [AllowAnonymous, HttpGet]
    public async Task<IActionResult> Entry(CancellationToken token)
    {
        if (User.Identity?.IsAuthenticated != true) return RedirectToAction("Index", "Home");
        if (User.IsInRole("Admin")) return RedirectToAction("AdminDashboard", "Account");
        try
        {
            var state = await store.StateAsync(AccountId, Role, token);
            return state.ActiveCourseId is int courseId
                ? RedirectToAction(nameof(Island), new { courseId }) : RedirectToAction("Index", "Home");
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Learning entry could not read account-linked progress");
            TempData["LearningError"] = "ยังอ่านความคืบหน้าไม่ได้ กรุณาลองอีกครั้ง ข้อมูลเดิมของคุณยังไม่ถูกเปลี่ยน";
            return RedirectToAction("Index", "Home");
        }
    }

    [HttpGet]
    public Task<IActionResult> Island(int? courseId, int? lessonId, CancellationToken token)
        => JourneyPage(courseId, lessonId, false, token);

    [HttpGet]
    public Task<IActionResult> Practice(int? courseId, int? lessonId, CancellationToken token)
        => JourneyPage(courseId, lessonId, true, token);

    private async Task<IActionResult> JourneyPage(int? courseId, int? lessonId, bool practice, CancellationToken token)
    {
        try
        {
            var state = await store.StateAsync(AccountId, Role, token, includeActivity: !practice);
            courseId ??= state.ActiveCourseId;
            if (courseId is null) return RedirectToAction("Index", "Home", new { chooseCourse = true });
            var course = state.Courses.FirstOrDefault(c => c.CourseId == courseId.Value)
                ?? throw new LearningRuleException("course_unavailable", "คอร์สนี้ยังไม่เปิดให้เรียน", 404);
            LearningStore.RequireUnlockedCourse(course);
            if (practice) lessonId ??= course.LastLessonId ?? course.CurrentIslandId;
            if (lessonId.HasValue)
            {
                LearningStore.RequireLesson(course.CourseId, lessonId.Value);
                if (!course.UnlockedIslands.Contains(lessonId.Value))
                    return StatusCode(403, "เกาะนี้ยังล็อกอยู่ เรียนด่านก่อนหน้าให้ผ่านก่อนครับ");
            }
            if (!practice && lessonId.HasValue)
                return RedirectToAction(nameof(Practice), new { courseId, lessonId });
            return View(practice ? "Practice" : "Island", new LearningIslandViewModel
            {
                State = state, Course = course, LearnerName = User.Identity?.Name ?? "ผู้เรียนทดลอง", InitialLessonId = lessonId
            });
        }
        catch (LearningRuleException ex) { return StatusCode(ex.StatusCode, ex.Message); }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Learning island could not read account-linked progress");
            Response.Headers.RetryAfter = "30";
            return StatusCode(503, "ยังเชื่อมต่อข้อมูลการเรียนไม่ได้ กรุณาลองใหม่ภายหลัง ระบบไม่ได้รีเซ็ตความคืบหน้าของคุณ");
        }
    }

    [HttpGet]
    public Task<IActionResult> State(CancellationToken token, bool includeActivity = false)
        => Api(async () => await store.StateAsync(AccountId, Role, token, includeActivity));

    [HttpPost]
    public Task<IActionResult> SelectCourse([FromBody] SelectLearningCourseRequest? request, CancellationToken token)
        => Body(request, () => store.SelectCourseAsync(AccountId, Role, request!.CourseId, token));

    [HttpPost]
    public Task<IActionResult> Checkpoint([FromBody] LearningCheckpointRequest? request, CancellationToken token)
        => Body(request, () => store.CheckpointAsync(AccountId, Role, request!.CourseId, request.LessonId, token));

    [HttpGet]
    public Task<IActionResult> Lesson(int courseId, int lessonId, CancellationToken token)
        => Api(async () => await store.LessonAsync(AccountId, Role, courseId, lessonId, token));

    [HttpPost]
    public Task<IActionResult> StartVideo([FromBody] LearningVideoRequest? request, CancellationToken token)
        => Body(request, () => store.StartVideoAsync(AccountId, Role, request!, token));

    [HttpPost]
    public Task<IActionResult> RestartVideo([FromBody] LearningVideoRequest? request, CancellationToken token)
        => Body(request, () => store.RestartVideoAsync(AccountId, Role, request!, token));

    [HttpPost]
    public Task<IActionResult> CompleteVideo([FromBody] CompleteLearningVideoRequest? request, CancellationToken token)
        => Body(request, () => store.CompleteVideoAsync(AccountId, Role, request!, token));

    [HttpPost]
    public Task<IActionResult> CompleteLesson([FromBody] CompleteLearningLessonRequest? request, CancellationToken token)
        => Body(request, () => store.CompleteAsync(AccountId, Role, request!, token));

    [HttpGet]
    public Task<IActionResult> FinalQuiz(int courseId, CancellationToken token)
        => RenderFinalQuiz(courseId, null, token);

    [HttpPost]
    public Task<IActionResult> FinalQuiz([FromForm] CourseFinalQuizSubmission submission, CancellationToken token)
        => RenderFinalQuiz(submission.CourseId, submission, token);

    private async Task<IActionResult> RenderFinalQuiz(int courseId, CourseFinalQuizSubmission? submission, CancellationToken token)
    {
        try
        {
            if (submission is null)
                return View("FinalQuiz", await store.FinalQuizAsync(AccountId, Role, courseId, token));

            if (!ModelState.IsValid)
                return await ShowFinalQuizError(courseId, 400, "กรุณาตอบคำถามทุกข้อให้ครบ", token);

            var page = await store.CompleteFinalQuizAsync(AccountId, Role, submission, token);
            if (page.Error is not null) Response.StatusCode = page.ErrorStatus;
            return View("FinalQuiz", page);
        }
        catch (LearningRuleException ex)
        {
            return StatusCode(ex.StatusCode, ex.Message);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Course final quiz could not read or write learning progress");
            return StatusCode(503, "ยังบันทึกผลสอบไม่ได้ กรุณากลับมาเปิดแบบทดสอบอีกครั้ง");
        }
    }

    private async Task<IActionResult> ShowFinalQuizError(int courseId, int status, string message, CancellationToken token)
    {
        var page = await store.FinalQuizAsync(AccountId, Role, courseId, token);
        Response.StatusCode = status;
        return View("FinalQuiz", page with { Error = message });
    }

    private Task<IActionResult> Body<TRequest, TResult>(TRequest? request, Func<Task<TResult>> action) where TRequest : class
    {
        if (request is null || !ModelState.IsValid)
            return Task.FromResult<IActionResult>(BadRequest(new { code = "invalid_request", message = "ข้อมูลไม่ครบหรือไม่ถูกต้อง กรุณาลองใหม่" }));
        return Api(async () => await action());
    }
    private async Task<IActionResult> Api<T>(Func<Task<T>> action)
    {
        try { return Json(await action()); }
        catch (LearningRuleException ex) { return StatusCode(ex.StatusCode, new { code = ex.Code, message = ex.Message }); }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Learning database operation unavailable");
            Response.Headers.RetryAfter = "30";
            return StatusCode(503, new { code = "learning_unavailable", message = "ยังเชื่อมต่อข้อมูลการเรียนไม่ได้ กรุณาลองใหม่ ความคืบหน้าเดิมยังไม่ถูกเปลี่ยน" });
        }
    }
    private Guid AccountId => previewId ?? Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => previewId.HasValue ? "User" : User.FindFirstValue(ClaimTypes.Role)!;
}
