using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using NextSkill_205_247_261.Services;
using System.Globalization;
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
                && !request.Path.StartsWithSegments("/Learning/FinalQuiz")
                && !request.Path.StartsWithSegments("/Learning/Entry");
            if (!isApi)
            {
                var adminOnly = context.HttpContext.GetEndpoint()?.Metadata.GetOrderedMetadata<IAuthorizeData>()
                    .Any(data => data.Roles == "Admin") == true;
                var url = adminOnly
                    ? QueryHelpers.AddQueryString($"{request.PathBase}/Account/AdminLogin", "returnUrl",
                        $"{request.PathBase}{request.Path}{request.QueryString}")
                    : context.RedirectUri;
                context.Response.Redirect(url);
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
var authenticationWindow = TimeSpan.FromMinutes(1);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("authentication", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "local",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20, Window = authenticationWindow, QueueLimit = 8
        }));
    options.OnRejected = async (context, token) =>
    {
        var wait = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
            ? retryAfter : authenticationWindow;
        var response = context.HttpContext.Response;
        response.Headers.RetryAfter = Math.Ceiling(wait.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        response.ContentType = "text/plain; charset=utf-8";
        await response.WriteAsync("มีการส่งคำขอตรวจสอบบัญชีมากเกินไป กรุณารอสักครู่แล้วลองใหม่", token);
    };
});
var app = builder.Build();
AdminContentStore.Configure(app.Environment.ContentRootPath);
app.Use((context, next) =>
{
    context.Response.OnStarting(() =>
    {
        var headers = context.Response.Headers;
        headers.ContentSecurityPolicy =
            "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; " +
            "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com";
        headers.XContentTypeOptions = "nosniff";
        headers.XFrameOptions = "DENY";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        return Task.CompletedTask;
    });
    return next(context);
});

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
else
{
    app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
    {
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("UnhandledRequests");
        logger.LogError(exception, "Unhandled exception while processing request {TraceIdentifier}", context.TraceIdentifier);

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "text/plain; charset=utf-8";
        await context.Response.WriteAsync("An unexpected error occurred. Please try again later.");
    }));
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
