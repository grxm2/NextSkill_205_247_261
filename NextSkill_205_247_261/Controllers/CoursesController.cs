using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Controllers;

[Authorize]
public class CoursesController : Controller
{
    public IActionResult Index() => RedirectToAction(nameof(Enrollment));

    public IActionResult Enrollment() => View(new CourseEnrollmentViewModel());
}
