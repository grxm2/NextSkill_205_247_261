using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using NextSkill_205_247_261.Services;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews(options =>
    options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()));
builder.Services.AddScoped<AccountStore>();
builder.Services.AddScoped<LearningStore>();
builder.Services.AddAntiforgery(options => options.HeaderName = "X-CSRF-TOKEN");
builder.Services.AddScoped<IPasswordHasher<Account>, PasswordHasher<Account>>();
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "NextSkill.Session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        options.LoginPath = "/Account/Login";
        options.AccessDeniedPath = "/Account/AccessDenied";
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
        options.Events.OnValidatePrincipal = async context =>
        {
            var store = context.HttpContext.RequestServices.GetRequiredService<AccountStore>();
            if (!await store.IsValidPrincipalAsync(context.Principal!))
                context.RejectPrincipal();
        };
        options.Events.OnRedirectToLogin = context =>
        {
            var request = context.Request;
            var isApi = request.Path.StartsWithSegments("/Learning")
                && !request.Path.StartsWithSegments("/Learning/Island")
                && !request.Path.StartsWithSegments("/Learning/Practice")
                && !request.Path.StartsWithSegments("/Learning/Entry");
            if (!isApi)
            {
                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            }
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return context.Response.WriteAsJsonAsync(new
            {
                code = "authentication_required", message = "เข้าสู่ระบบเพื่อบันทึกและเรียนต่อได้ทุกอุปกรณ์",
                loginUrl = "/Account/Login?returnUrl=%2FLearning%2FEntry"
            });
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("authentication", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "local",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 08
        }));
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.Headers.RetryAfter = "60";
        await context.HttpContext.Response.WriteAsync("Too many attempts. Please try again in one minute.", token);
    };
});
var app = builder.Build();
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.Use(async (context, next) =>
{
    try
    {
        await next(context);
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
    {
        // A disconnected client can cancel an in-flight SQL operation.
        if (!context.Response.HasStarted)
            context.Response.StatusCode = StatusCodes.Status499ClientClosedRequest;
    }
});

app.UseHttpsRedirection();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapStaticAssets();
app.MapControllerRoute(name: "entry", pattern: "", defaults: new { controller = "Learning", action = "Entry" });
app.MapControllerRoute(name: "default", pattern: "{controller}/{action=Index}/{id?}")
    .WithStaticAssets();
app.Run();
