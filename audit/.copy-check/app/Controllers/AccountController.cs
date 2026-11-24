using System.Security.Claims;
using System.Text;
using System.Text.Json;
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
public class AccountController(AccountStore store, LearningStore learning, ILogger<AccountController> logger) : Controller
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
        if (User.Identity?.IsAuthenticated == true && User.IsInRole(role))
        {
            if (role == "Admin")
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
            ModelState.AddModelError(nameof(form.InvitationCode), "กรุณากรอกรหัสเชิญจากผู้ดูแลระบบ");
        if (ModelState.IsValid && (form.FullName ?? "").Trim().Length < RegisterForm.NameMinimumLength)
            ModelState.AddModelError(nameof(form.FullName), $"ชื่อที่แสดงต้องมีอย่างน้อย {RegisterForm.NameMinimumLength} ตัวอักษร");
        if (ModelState.IsValid)
        {
            try
            {
                var error = await store.RegisterAsync(role, form.FullName!, form.Email, form.Password, form.InvitationCode);
                if (error is null)
                {
                    TempData["Success"] = "สมัครบัญชีสำเร็จ กรุณาเข้าสู่ระบบ";
                    return RedirectToAction(role == "Admin" ? nameof(AdminLogin) : nameof(Login), new { returnUrl = SafeReturnUrl(form.ReturnUrl) });
                }
                ModelState.AddModelError("", error);
            }
            catch (SqlException ex)
            {
                logger.LogError(ex, "Account registration database failure");
                ModelState.AddModelError("", "ยังไม่สามารถสมัครบัญชีได้ในขณะนี้ กรุณาลองใหม่ภายหลัง");
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
                var account = await store.AuthenticateAsync(role, form.Email, form.Password);

                if (account is not null)
                {
                    var identity = new ClaimsIdentity(new[] {
                        new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
                        new Claim(ClaimTypes.Name, account.FullName),
                        new Claim(ClaimTypes.Email, account.Email),
                        new Claim(ClaimTypes.Role, role)
                    }, CookieAuthenticationDefaults.AuthenticationScheme);
                    if (role == "Admin")
                        identity.AddClaim(new Claim(AccountStore.AdminSessionVersionClaim, store.AdminSessionVersion));
                    await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
                        new ClaimsPrincipal(identity), new AuthenticationProperties { IsPersistent = form.RememberMe });

                    if (role == "Admin")
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
                ModelState.AddModelError("", "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับชั่วคราว");
            }
            catch (SqlException ex)
            {
                logger.LogError(ex, "Account login database failure");
                ModelState.AddModelError("", "ยังไม่สามารถเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง");
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

    [HttpGet, Authorize]
    public async Task<IActionResult> Dashboard(CancellationToken token)
    {
        if (User.IsInRole("Admin"))
            return RedirectToAction(nameof(AdminDashboard));

        return Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? await RenderProfile(id, null, token)
            : Challenge();
    }

    [HttpGet, Authorize(Roles = "User")]
    public async Task<IActionResult> Certificate(int courseId, CancellationToken token)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Challenge();
        if (courseId <= 0) return NotFound();

        try
        {
            var certificate = await learning.CertificateAsync(id, courseId, token);
            return certificate is null ? NotFound() : View(certificate);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Could not read learner certificate for course {CourseId}", courseId);
            return StatusCode(503, "เปิดใบประกาศไม่ได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    [HttpPost, Authorize(Roles = "User")]
    public async Task<IActionResult> IssueCertificate(int courseId, CancellationToken token)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Challenge();
        if (courseId <= 0) return NotFound();

        try
        {
            return await learning.IssueLegacyCertificateAsync(id, courseId, token)
                ? RedirectToAction(nameof(Certificate), new { courseId }) : NotFound();
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Could not issue reference for course {CourseId}", courseId);
            return StatusCode(503, "ออกเลขอ้างอิงไม่ได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    [HttpGet, AllowAnonymous]
    public async Task<IActionResult> VerifyCertificate(string? code, CancellationToken token)
    {
        Response.Headers["X-Robots-Tag"] = "noindex, nofollow";
        if (string.IsNullOrWhiteSpace(code)) return View();
        code = code.Trim();
        if (Guid.TryParseExact(code, "D", out var reference) || Guid.TryParseExact(code, "N", out reference))
        {
            try
            {
                var certificate = await learning.VerifyCertificateAsync(reference, token);
                if (certificate is not null) return View(certificate);
            }
            catch (SqlException ex)
            {
                logger.LogError(ex, "Could not verify course certificate");
                return StatusCode(503, "ตรวจสอบใบประกาศไม่ได้ กรุณาลองใหม่อีกครั้ง");
            }
        }

        Response.StatusCode = StatusCodes.Status404NotFound;
        return View();
    }

    [HttpPost, Authorize(Roles = "User"), EnableRateLimiting("authentication")]
    public async Task<IActionResult> UpdateProfile([Bind(Prefix = "Edit")] ProfileEditForm form, CancellationToken token)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Challenge();
        var fullName = form.FullName?.Trim() ?? "";
        var email = form.Email?.Trim() ?? "";
        if (ModelState.IsValid && fullName.Length < RegisterForm.NameMinimumLength)
            ModelState.AddModelError("Edit.FullName", $"ชื่อที่แสดงต้องมีอย่างน้อย {RegisterForm.NameMinimumLength} ตัวอักษร");

        if (ModelState.IsValid)
        {
            try
            {
                var result = await store.UpdateLearnerProfileAsync(id, fullName, email, form.CurrentPassword, token);
                switch (result)
                {
                    case ProfileUpdateStatus.Updated:
                        var session = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                        var identity = new ClaimsIdentity(User.Identity);
                        identity.TryRemoveClaim(identity.FindFirst(ClaimTypes.Name));
                        identity.TryRemoveClaim(identity.FindFirst(ClaimTypes.Email));
                        identity.AddClaim(new Claim(ClaimTypes.Name, fullName));
                        identity.AddClaim(new Claim(ClaimTypes.Email, email));
                        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
                            new ClaimsPrincipal(identity), session.Properties);
                        TempData["ProfileSuccess"] = "บันทึกโปรไฟล์เรียบร้อยแล้ว";
                        return RedirectToAction(nameof(Dashboard), null, null, "profile-edit");
                    case ProfileUpdateStatus.PasswordRequired:
                        ModelState.AddModelError("Edit.CurrentPassword", "กรุณากรอกรหัสผ่านปัจจุบันให้ถูกต้องเพื่อเปลี่ยนอีเมล");
                        break;
                    case ProfileUpdateStatus.EmailTaken:
                        ModelState.AddModelError("Edit.Email", "อีเมลนี้ถูกใช้กับบัญชีผู้เรียนอื่นแล้ว");
                        break;
                    case ProfileUpdateStatus.Unavailable:
                        return Challenge();
                }
            }
            catch (SqlException ex)
            {
                logger.LogError(ex, "Could not update learner profile");
                ModelState.AddModelError("", "บันทึกข้อมูลโปรไฟล์ไม่ได้ กรุณาลองใหม่อีกครั้ง");
            }
        }

        return await RenderProfile(id, form, token);
    }

    private async Task<IActionResult> RenderProfile(Guid id, ProfileEditForm? edit, CancellationToken token)
    {
        LearnerProfile? profile;
        try { profile = await store.GetLearnerProfileAsync(id, token); }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Could not read learner profile");
            return StatusCode(503, "เปิดโปรไฟล์ไม่ได้ กรุณาลองใหม่อีกครั้ง");
        }
        if (profile is null) return Challenge();

        LearningState? state = null;
        IReadOnlyList<LearningCertificate> certificates = [];
        try
        {
            state = await learning.StateAsync(id, "User", token, includeActivity: true);
            certificates = await learning.CertificatesAsync(id, token);
        }
        catch (SqlException ex) { logger.LogError(ex, "Could not read learner profile progress"); }
        return View("Dashboard", new LearnerProfileViewModel(profile,
            edit ?? new ProfileEditForm { FullName = profile.FullName, Email = profile.Email }, state,
            certificates));
    }
    [HttpGet, Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminDashboard()
    {
        var model = await store.AdminOverviewAsync(learning, HttpContext.RequestAborted);
        model.FullName = User.Identity!.Name!;
        model.Email = User.FindFirstValue(ClaimTypes.Email)!;
        model.Courses = AdminContentStore.GetAllCourses();
        model.Questions = AdminContentStore.GetAllQuestions();
        return View("AdminDashboard", model);
    }

    [HttpPost, Authorize(Roles = "Admin")]
    [RequestSizeLimit(MaxImportBytes)]
    public async Task<IActionResult> AdminSaveCourse([FromBody] Course? form, CancellationToken token)
    {
        if (!ModelState.IsValid || form is null)
            return BadRequest(new { success = false, message = "กรุณาตรวจสอบข้อมูลคอร์สเรียน" });

        return await RunAdminContentWrite(async () =>
        {
            int highestRecordedId = form.Id <= 0 ? await learning.HighestRecordedCourseIdAsync(token) : 0;
            return Json(new { success = true, course = AdminContentStore.SaveCourse(form, highestRecordedId) });
        });
    }

    [HttpPost, Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminPublishCourse([FromBody] CourseIdRequest? req)
    {
        if (!ModelState.IsValid || req is null || req.Id <= 0)
            return BadRequest(new { success = false, message = "รหัสคอร์สไม่ถูกต้อง" });

        return await RunAdminContentWrite(() => Task.FromResult<IActionResult>(
            Json(new { success = true, course = AdminContentStore.PublishCourse(req.Id) })));
    }

    [HttpPost, Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminDeleteCourse([FromBody] CourseIdRequest? req)
    {
        if (!ModelState.IsValid || req is null || req.Id <= 0)
            return BadRequest(new { success = false, message = "รหัสคอร์สไม่ถูกต้อง" });

        return await RunAdminContentWrite(() => Task.FromResult<IActionResult>(AdminContentStore.DeleteCourse(req.Id)
            ? Json(new { success = true, id = req.Id })
            : NotFound(new { success = false, message = "ไม่พบคอร์สที่ต้องการนำออก" })));
    }

    private const int MaxImportBytes = 1024 * 1024;

    [HttpPost, Authorize(Roles = "Admin")]
    [RequestSizeLimit(MaxImportBytes + 64 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxImportBytes, ValueLengthLimit = MaxImportBytes)]
    public async Task<IActionResult> AdminUploadCourses([FromForm] IFormFile? file, [FromForm] string? jsonText, CancellationToken token)
    {
        if (!ModelState.IsValid || (file is not null && !string.IsNullOrWhiteSpace(jsonText)))
            return BadRequest(new { success = false, message = "เลือกไฟล์ JSON หรือวางข้อความ JSON อย่างใดอย่างหนึ่ง" });

        string? json = jsonText;
        if (file is not null)
        {
            if (!string.Equals(Path.GetExtension(file.FileName), ".json", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { success = false, message = "กรุณาเลือกไฟล์นามสกุล .json" });
            if (file.Length > MaxImportBytes)
                return BadRequest(new { success = false, message = "ไฟล์ JSON มีขนาดเกินที่กำหนด" });

            try
            {
                using var reader = new StreamReader(file.OpenReadStream(), new UTF8Encoding(false, true));
                json = await reader.ReadToEndAsync(token);
            }
            catch (Exception ex) when (ex is IOException or DecoderFallbackException)
            {
                return BadRequest(new { success = false, message = "อ่านไฟล์ JSON ไม่สำเร็จ กรุณาบันทึกเป็น UTF-8 แล้วลองอีกครั้ง" });
            }
        }

        if (string.IsNullOrWhiteSpace(json))
            return BadRequest(new { success = false, message = "ไม่พบข้อมูลไฟล์คอร์สที่ต้องการอัปโหลด" });
        if (Encoding.UTF8.GetByteCount(json) > MaxImportBytes)
            return BadRequest(new { success = false, message = "ข้อมูล JSON มีขนาดเกินที่กำหนด" });

        return await RunAdminContentWrite(async () =>
        {
            int highestRecordedId = await learning.HighestRecordedCourseIdAsync(token);
            int imported = AdminContentStore.ImportCourses(json, highestRecordedId);
            return Json(new { success = true, count = imported, message = $"นำเข้าฉบับร่าง {imported} คอร์สแล้ว" });
        });
    }

    [HttpPost, Authorize(Roles = "Admin")]
    [RequestSizeLimit(MaxImportBytes)]
    public async Task<IActionResult> AdminSaveQuestion([FromBody] AdminQuizQuestion? form)
    {
        if (!ModelState.IsValid || form is null)
            return BadRequest(new { success = false, message = "กรุณาตรวจสอบข้อมูลคำถาม" });

        return await RunAdminContentWrite(() => Task.FromResult<IActionResult>(
            Json(new { success = true, question = AdminContentStore.SaveQuestion(form) })));
    }

    [HttpPost, Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminDeleteQuestion([FromBody] QuestionDeleteRequest? req)
    {
        if (!ModelState.IsValid || req is null || string.IsNullOrWhiteSpace(req.Id))
            return BadRequest(new { success = false, message = "รหัสคำถามไม่ถูกต้อง" });

        return await RunAdminContentWrite(() => Task.FromResult<IActionResult>(AdminContentStore.DeleteQuestion(req.Id)
            ? Json(new { success = true, id = req.Id })
            : NotFound(new { success = false, message = "ไม่พบคำถามที่ต้องการลบ" })));
    }

    [HttpGet, Authorize(Roles = "Admin")]
    public IActionResult AdminGetQuestions(int? courseId)
    {
        var questions = AdminContentStore.GetAllQuestions(courseId);
        return Json(questions);
    }

    private async Task<IActionResult> RunAdminContentWrite(Func<Task<IActionResult>> action)
    {
        try
        {
            return await action();
        }
        catch (ContentValidationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (JsonException)
        {
            return BadRequest(new { success = false, message = "ไฟล์ JSON ไม่ตรงกับรูปแบบคอร์สที่กำหนด" });
        }
        catch (Exception ex) when (ex is IOException or InvalidDataException or UnauthorizedAccessException or SqlException)
        {
            logger.LogError(ex, "An admin content write did not complete");
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { success = false, message = "บันทึกข้อมูลไม่ได้ กรุณาลองอีกครั้ง" });
        }
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

public record CourseIdRequest(int Id);
public record QuestionDeleteRequest(string Id);

