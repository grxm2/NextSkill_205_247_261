using Microsoft.AspNetCore.Mvc;

namespace NextSkill_205_247_261.Controllers;

public class CoursesController : Controller
{
    public IActionResult Index() => RedirectToAction("Courses", "Home");
    public IActionResult Enrollment() => RedirectToAction("Courses", "Home");
}
