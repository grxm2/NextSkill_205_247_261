using NextSkill_205_247_261.Services;
using Microsoft.AspNetCore.Mvc;
using NextSkill_205_247_261.Models;
using System.Diagnostics;
using System;
using System.Collections.Generic;
using System.Linq;

namespace NextSkill_205_247_261.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View(new HomeDashboardViewModel
            {
                LearnerName = User.Identity?.IsAuthenticated == true ? User.Identity.Name ?? "ผู้เรียน" : "นักผจญภัย",
                PopularCourses = GetCourses().Where(c => new[] { 1, 5, 6, 9 }.Contains(c.Id)).ToArray()
            });
        }

        public IActionResult Privacy()
        {
            return View();
        }

        // Courses list with search, filter, sort and pagination
        public IActionResult Courses(string q, string tag, string sort = "Recommended", int page = 1, int pageSize = 9)
        {
            var all = GetCourses();

            // search across title, category, instructor, skills
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                all = all.Where(c => c.Title.Contains(term, StringComparison.OrdinalIgnoreCase)
                                    || c.Category.Contains(term, StringComparison.OrdinalIgnoreCase)
                                    || (!string.IsNullOrEmpty(c.Instructor) && c.Instructor.Contains(term, StringComparison.OrdinalIgnoreCase))
                                    || (c.Skills != null && c.Skills.Any(s => s.Contains(term, StringComparison.OrdinalIgnoreCase))))
                         .ToList();
            }

            if (!string.IsNullOrWhiteSpace(tag) && tag != "All")
            {
                all = all.Where(c => string.Equals(c.Category, tag, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            // sorting: Recommended (default), A-Z
            if (string.Equals(sort, "A-Z", StringComparison.OrdinalIgnoreCase))
            {
                all = all.OrderBy(c => c.Title).ToList();
            }

            var total = all.Count;
            var totalPages = (int)Math.Ceiling(total / (double)pageSize);
            page = Math.Max(1, Math.Min(page, totalPages == 0 ? 1 : totalPages));

            var items = all.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            ViewBag.TotalCount = total;
            ViewBag.Page = page;
            ViewBag.TotalPages = totalPages;
            ViewBag.PageSize = pageSize;
            ViewBag.Query = q;
            ViewBag.Tag = tag;
            ViewBag.Sort = sort;

            return View(items);
        }

        public IActionResult Details(int id)
        {
            var course = GetCourses().FirstOrDefault(c => c.Id == id);
            if (course == null) return NotFound();
            return View(course);
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        private static List<Course> GetCourses() => CourseCatalog.GetCourses();
    }
}
