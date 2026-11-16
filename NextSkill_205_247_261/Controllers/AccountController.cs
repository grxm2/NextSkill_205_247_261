using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using NextSkill_205_247_261.Models;
using NextSkill_205_247_261.Services;

namespace NextSkill_205_247_261.Controllers;

[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AccountController(AccountStore store, ILogger<AccountController> logger) : Controller
{
    [HttpGet] public IActionResult Register(string? returnUrl) => RegistrationPage("User", new() { ReturnUrl = SafeReturnUrl(returnUrl) });
    [HttpGet] public IActionResult AdminRegister(string? returnUrl) => RegistrationPage("Admin", new() { ReturnUrl = SafeReturnUrl(returnUrl) });
    [HttpPost, EnableRateLimiting("authentication")]
    public Task<IActionResult> Register(RegisterForm form) => RegisterAccount(form, "User");
    [HttpPost, EnableRateLimiting("authentication")]
    public Task<IActionResult> AdminRegister(RegisterForm form) => RegisterAccount(form, "Admin");
    [HttpGet] public IActionResult Login(string? returnUrl) => LoginPage("User", new() { ReturnUrl = SafeReturnUrl(returnUrl) });
    [HttpGet] public IActionResult AdminLogin(string? returnUrl) => LoginPage("Admin", new() { ReturnUrl = SafeReturnUrl(returnUrl) });
    [HttpPost, EnableRateLimiting("authentication")]
    public Task<IActionResult> Login(LoginForm form) => LoginAccount(form, "User");
    [HttpPost, EnableRateLimiting("authentication")]
    public Task<IActionResult> AdminLogin(LoginForm form) => LoginAccount(form, "Admin");

    private IActionResult RegistrationPage(string role, RegisterForm form)
    { form.ReturnUrl = SafeReturnUrl(form.ReturnUrl); ViewData["Role"] = role; return View("Register", form); }
    private IActionResult LoginPage(string role, LoginForm form)
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            if (User.IsInRole("Admin") || role == "Admin")
                return RedirectToAction(nameof(AdminDashboard));
            return ContinueLearning(form.ReturnUrl);
        }
        form.ReturnUrl = SafeReturnUrl(form.ReturnUrl);
        ViewData["Role"] = role;
        return View("Login", form);
    }
    private async Task<IActionResult> RegisterAccount(RegisterForm form, string role)
    {
        if (role == "Admin" && string.IsNullOrWhiteSpace(form.InvitationCode))
            ModelState.AddModelError(nameof(form.InvitationCode), "An admin invitation code is required.");
        if ((form.FullName ?? "").Trim().Length < 2)
            ModelState.AddModelError(nameof(form.FullName), "Please enter at least 2 characters.");
        if (ModelState.IsValid)
        {
            try
            {
                var error = await store.RegisterAsync(role, form.FullName!, form.Email, form.Password, form.InvitationCode);
                if (error is null)
                {
                    TempData["Success"] = "Account created successfully. Please log in.";
                    return RedirectToAction(role == "Admin" ? nameof(AdminLogin) : nameof(Login), new { returnUrl = SafeReturnUrl(form.ReturnUrl) });
                }
                ModelState.AddModelError("", error);
            }
            catch (SqlException ex)
            {
                logger.LogError(ex, "Account registration database failure");
                ModelState.AddModelError("", "Cannot connect to the account database. Please try again later.");
            }
        }
        return RegistrationPage(role, form);
    }
    private async Task<IActionResult> LoginAccount(LoginForm form, string role)
    {
        if (ModelState.IsValid)
        {
            try
            {
                var actualRole = role;
                var account = await store.AuthenticateAsync(role, form.Email, form.Password);
                if (account is null && role == "User")
                {
                    account = await store.AuthenticateAsync("Admin", form.Email, form.Password);
                    if (account is not null) actualRole = "Admin";
                }

                if (account is not null)
                {
                    var identity = new ClaimsIdentity(new[] {
                        new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
                        new Claim(ClaimTypes.Name, account.FullName),
                        new Claim(ClaimTypes.Email, account.Email),
                        new Claim(ClaimTypes.Role, actualRole)
                    }, CookieAuthenticationDefaults.AuthenticationScheme);
                    await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
                        new ClaimsPrincipal(identity), new AuthenticationProperties { IsPersistent = form.RememberMe });

                    if (actualRole == "Admin")
                    {
                        var local = SafeReturnUrl(form.ReturnUrl);
                        if (local is not null &&
                            !string.Equals(local, "/", StringComparison.OrdinalIgnoreCase) &&
                            !string.Equals(local, "/Home", StringComparison.OrdinalIgnoreCase) &&
                            !string.Equals(local, "/Home/Index", StringComparison.OrdinalIgnoreCase) &&
                            !string.Equals(local, "/Account/Dashboard", StringComparison.OrdinalIgnoreCase) &&
                            !local.StartsWith("/Learning", StringComparison.OrdinalIgnoreCase))
                        {
                            return LocalRedirect(local);
                        }
                        return RedirectToAction(nameof(AdminDashboard));
                    }

                    return ContinueLearning(form.ReturnUrl);
                }
                ModelState.AddModelError("", "Email or password is incorrect, or the account is temporarily locked. After 5 failed attempts, wait 15 minutes.");
            }
            catch (SqlException ex)
            {
                logger.LogError(ex, "Account login database failure");
                ModelState.AddModelError("", "Cannot connect to the account database. Please try again later.");
            }
        }
        return LoginPage(role, form);
    }
    private string? SafeReturnUrl(string? returnUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl) || returnUrl.Length > 2048 || !Url.IsLocalUrl(returnUrl)) return null;
        var path = returnUrl.Split('?', '#')[0];
        if (new[] { "/Account/Login", "/Account/AdminLogin", "/Account/Register", "/Account/AdminRegister" }
            .Any(authPath => string.Equals(path.TrimEnd('/'), authPath, StringComparison.OrdinalIgnoreCase))) return null;
        return returnUrl;
    }
    private IActionResult ContinueLearning(string? returnUrl)
        => SafeReturnUrl(returnUrl) is string local ? LocalRedirect(local) : RedirectToAction("Entry", "Learning");

    [Authorize]
    public IActionResult Dashboard()
    {
        if (User.IsInRole("Admin"))
            return RedirectToAction(nameof(AdminDashboard));

        return View("Dashboard", new DashboardModel(User.Identity!.Name!,
            User.FindFirstValue(ClaimTypes.Email)!, "User", 0, 0));
    }
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminDashboard()
    {
        var model = await store.AdminOverviewAsync();
        model.FullName = User.Identity!.Name!;
        model.Email = User.FindFirstValue(ClaimTypes.Email)!;
        model.Courses = AdminContentStore.GetAllCourses();
        model.Questions = AdminContentStore.GetAllQuestions();
        return View("AdminDashboard", model);
    }

    [HttpPost, Authorize(Roles = "Admin"), IgnoreAntiforgeryToken]
    public IActionResult AdminSaveCourse([FromBody] Course form)
    {
        if (form is null || string.IsNullOrWhiteSpace(form.Title))
            return BadRequest(new { success = false, message = "กรุณาระบุชื่อคอร์สเรียน" });

        var saved = AdminContentStore.SaveCourse(form);
        return Json(new { success = true, course = saved });
    }

    [HttpPost, Authorize(Roles = "Admin"), IgnoreAntiforgeryToken]
    public IActionResult AdminDeleteCourse([FromBody] CourseDeleteRequest req)
    {
        if (req is null || req.Id <= 0)
            return BadRequest(new { success = false, message = "รหัสคอร์สไม่ถูกต้อง" });

        var success = AdminContentStore.DeleteCourse(req.Id);
        return Json(new { success, id = req.Id });
    }

    [HttpPost, Authorize(Roles = "Admin"), IgnoreAntiforgeryToken]
    public async Task<IActionResult> AdminUploadCourses([FromForm] IFormFile? file, [FromForm] string? jsonText)
    {
        string? json = jsonText;
        if (file is not null && file.Length > 0)
        {
            using var reader = new StreamReader(file.OpenReadStream());
            json = await reader.ReadToEndAsync();
        }

        if (string.IsNullOrWhiteSpace(json))
            return BadRequest(new { success = false, message = "ไม่พบข้อมูลไฟล์คอร์สที่ต้องการอัปโหลด" });

        try
        {
            int imported = AdminContentStore.ImportCourses(json);
            return Json(new { success = true, count = imported, message = $"นำเข้าคอร์สสำเร็จ {imported} รายการ" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = "รูปแบบไฟล์ JSON ไม่ถูกต้อง: " + ex.Message });
        }
    }

    [HttpPost, Authorize(Roles = "Admin"), IgnoreAntiforgeryToken]
    public IActionResult AdminSaveQuestion([FromBody] AdminQuizQuestion form)
    {
        if (form is null || string.IsNullOrWhiteSpace(form.Prompt))
            return BadRequest(new { success = false, message = "กรุณาระบุเนื้อหาคำถาม" });

        var saved = AdminContentStore.SaveQuestion(form);
        return Json(new { success = true, question = saved });
    }

    [HttpPost, Authorize(Roles = "Admin"), IgnoreAntiforgeryToken]
    public IActionResult AdminDeleteQuestion([FromBody] QuestionDeleteRequest req)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Id))
            return BadRequest(new { success = false, message = "รหัสคำถามไม่ถูกต้อง" });

        var success = AdminContentStore.DeleteQuestion(req.Id);
        return Json(new { success, id = req.Id });
    }

    [HttpGet, Authorize(Roles = "Admin"), IgnoreAntiforgeryToken]
    public IActionResult AdminGetQuestions(int? courseId)
    {
        var questions = AdminContentStore.GetAllQuestions(courseId);
        return Json(questions);
    }

    [HttpPost, Authorize]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction(nameof(Login));
    }
    [HttpGet] public IActionResult AccessDenied() { Response.StatusCode = 403; return View(); }
    [HttpGet] public IActionResult Terms() => View();
}

public record CourseDeleteRequest(int Id);
public record QuestionDeleteRequest(string Id);

