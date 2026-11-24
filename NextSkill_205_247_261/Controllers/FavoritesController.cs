using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using NextSkill_205_247_261.Models;
using NextSkill_205_247_261.Services;

namespace NextSkill_205_247_261.Controllers;

[Authorize(Roles = "User")]
[ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
public sealed class FavoritesController(CourseFavoriteStore favorites, ILogger<FavoritesController> logger) : Controller
{
    private const string UnavailableMessage = "ระบบรายการโปรดยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง";
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> Index(CancellationToken token)
    {
        try
        {
            var entries = await favorites.GetAllAsync(UserId, token);
            var courses = CourseCatalog.GetBrowseItems().ToDictionary(course => course.Id);
            return View(new CourseFavoritesPageViewModel(entries.Select(entry =>
                new FavoriteCourseItem(entry, courses.GetValueOrDefault(entry.CourseId))).ToList()));
        }
        catch (Exception ex) when (ex is SqlException or InvalidOperationException)
        {
            logger.LogError(ex, "Could not load the favorites playlist");
            Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            return View(new CourseFavoritesPageViewModel([], Unavailable: true));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Set([FromForm] int courseId, [FromForm] bool? save,
        [FromForm] string? returnUrl, CancellationToken token)
    {
        if (!ModelState.IsValid || courseId <= 0 || save is null) return BadRequest();

        var message = save.Value ? "เพิ่มคอร์สในรายการโปรดแล้ว" : "นำคอร์สออกจากรายการโปรดแล้ว";
        var status = StatusCodes.Status200OK;
        try
        {
            if (save.Value && !CourseCatalog.GetCourses().Any(course => course.Id == courseId))
            {
                status = StatusCodes.Status404NotFound;
                message = "คอร์สนี้ยังไม่เปิดให้เข้าดู";
            }
            else
            {
                await favorites.SetAsync(UserId, courseId, save.Value, token);
            }
        }
        catch (Exception ex) when (ex is SqlException or InvalidOperationException)
        {
            logger.LogError(ex, "Could not change favorite course {CourseId}", courseId);
            status = StatusCodes.Status503ServiceUnavailable;
            message = UnavailableMessage;
        }

        if (Request.Headers.Accept == "application/json")
            return status == StatusCodes.Status200OK ? Ok(new { isSaved = save.Value, message }) : StatusCode(status, new { message });

        TempData[status == StatusCodes.Status200OK ? "FavoritesNotice" : "FavoritesError"] = message;
        return returnUrl is { Length: <= 2048 } && Url.IsLocalUrl(returnUrl)
            ? LocalRedirect(returnUrl) : RedirectToAction(nameof(Index));
    }

    [HttpGet]
    public async Task<IActionResult> Edit([FromRoute] int id, CancellationToken token)
    {
        try
        {
            var favorite = await favorites.FindAsync(UserId, id, token);
            if (favorite is null) return NotFound();

            return View(EditPage(id, new FavoriteEditForm { Note = favorite.Note, IsPinned = favorite.IsPinned }));
        }
        catch (Exception ex) when (ex is SqlException or InvalidOperationException)
        {
            logger.LogError(ex, "Could not load favorite course {CourseId}", id);
            TempData["FavoritesError"] = UnavailableMessage;
            return RedirectToAction(nameof(Index));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Edit([FromRoute] int id, [FromForm(Name = "Form")] FavoriteEditForm form, CancellationToken token)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                if (await favorites.FindAsync(UserId, id, token) is null) return NotFound();
                return View(EditPage(id, form));
            }

            if (!await favorites.UpdateAsync(UserId, id, form, token)) return NotFound();

            TempData["FavoritesNotice"] = "บันทึกการแก้ไขแล้ว";
            return RedirectToAction(nameof(Index));
        }
        catch (Exception ex) when (ex is SqlException or InvalidOperationException)
        {
            logger.LogError(ex, "Could not update favorite course {CourseId}", id);
            ModelState.AddModelError("", UnavailableMessage);
            Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            return View(EditPage(id, form));
        }
    }

    private static FavoriteEditPageViewModel EditPage(int courseId, FavoriteEditForm form)
    {
        var course = CourseCatalog.GetCourses().FirstOrDefault(item => item.Id == courseId);
        return new FavoriteEditPageViewModel(courseId, course?.Title ?? "คอร์สนี้ไม่เปิดให้เข้าดูแล้ว", form);
    }
}
