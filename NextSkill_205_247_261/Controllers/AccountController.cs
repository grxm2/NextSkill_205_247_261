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
    [HttpGet] public IActionResult Register() => RegistrationPage("User", new());
    [HttpGet] public IActionResult AdminRegister() => RegistrationPage("Admin", new());
    [HttpPost, EnableRateLimiting("authentication")]
    public Task<IActionResult> Register(RegisterForm form) => RegisterAccount(form, "User");
    [HttpPost, EnableRateLimiting("authentication")]
    public Task<IActionResult> AdminRegister(RegisterForm form) => RegisterAccount(form, "Admin");
    [HttpGet] public IActionResult Login() => LoginPage("User", new());
    [HttpGet] public IActionResult AdminLogin() => LoginPage("Admin", new());
    [HttpPost, EnableRateLimiting("authentication")]
    public Task<IActionResult> Login(LoginForm form) => LoginAccount(form, "User");
    [HttpPost, EnableRateLimiting("authentication")]
    public Task<IActionResult> AdminLogin(LoginForm form) => LoginAccount(form, "Admin");

    private IActionResult RegistrationPage(string role, RegisterForm form)
    { ViewData["Role"] = role; return View("Register", form); }
    private IActionResult LoginPage(string role, LoginForm form)
    { ViewData["Role"] = role; return View("Login", form); }
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
                    return RedirectToAction(role == "Admin" ? nameof(AdminLogin) : nameof(Login));
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
                var account = await store.AuthenticateAsync(role, form.Email, form.Password);
                if (account is not null)
                {
                    var identity = new ClaimsIdentity(new[] {
                        new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
                        new Claim(ClaimTypes.Name, account.FullName),
                        new Claim(ClaimTypes.Email, account.Email), new Claim(ClaimTypes.Role, role)
                    }, CookieAuthenticationDefaults.AuthenticationScheme);
                    await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
                        new ClaimsPrincipal(identity), new AuthenticationProperties { IsPersistent = form.RememberMe });
                    return RedirectToAction(role == "Admin" ? nameof(AdminDashboard) : nameof(Dashboard));
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
    [Authorize(Roles = "User")]
    public IActionResult Dashboard() => View("Dashboard", new DashboardModel(User.Identity!.Name!,
        User.FindFirstValue(ClaimTypes.Email)!, "User", 0, 0));
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminDashboard()
    {
        var model = await store.AdminOverviewAsync();
        model.FullName = User.Identity!.Name!;
        model.Email = User.FindFirstValue(ClaimTypes.Email)!;
        return View("AdminDashboard", model);
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
