using Microsoft.AspNetCore.Mvc;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Controllers;

public class CoursesController : Controller
{
    public IActionResult Index() => RedirectToAction(nameof(Enrollment));

    // The former English for Business overview covered workplace English.
    // Its current canonical curriculum is English for Work (catalog ID 13).
    // This GET only opens its description; it never changes the active course.
    public IActionResult Enrollment() => RedirectToAction("Details", "Home", new { id = 13 });
}
