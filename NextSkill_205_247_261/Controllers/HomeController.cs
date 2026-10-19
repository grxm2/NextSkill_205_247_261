using Microsoft.AspNetCore.Mvc;
using NextSkill_205_247_261.Models;
using System.Diagnostics;

namespace NextSkill_205_247_261.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return RedirectToAction("Register", "Account");
        }

        public IActionResult Courses() => View();

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
