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
        public IActionResult Courses(string? q, string? tag, string sort = "Recommended", int page = 1, int pageSize = 9)
        {
            var curricula = LearningCatalog.PublicCatalog().ToDictionary(course => course.Id);
            var all = GetCourses().Where(course => curricula.ContainsKey(course.Id))
                .Select(course => new CourseBrowseItem(course, curricula[course.Id])).ToList();
            var categories = all.Select(course => course.Category).Distinct().Order().ToArray();
            pageSize = Math.Clamp(pageSize, 3, 24);
            q = q?.Trim() ?? "";
            tag = string.IsNullOrWhiteSpace(tag) ? "All" : tag;
            if (!string.IsNullOrWhiteSpace(q))
            {
                all = all.Where(c => c.Title.Contains(q, StringComparison.OrdinalIgnoreCase)
                                    || c.Category.Contains(q, StringComparison.OrdinalIgnoreCase)
                                    || c.CategoryLabel.Contains(q, StringComparison.OrdinalIgnoreCase)
                                    || (c.Metadata.Instructor?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false)
                                    || (c.Metadata.Skills?.Any(s => s.Contains(q, StringComparison.OrdinalIgnoreCase)) ?? false))
                         .ToList();
            }
            if (tag == "Short")
                all = all.Where(c => c.CanStart && c.Curriculum.Lessons.Sum(lesson => lesson.Minutes) <= 45).ToList();
            else if (tag != "All")
            {
                all = all.Where(c => string.Equals(c.Category, tag, StringComparison.OrdinalIgnoreCase)).ToList();
            }
            sort = sort is "A-Z" or "Recently" ? sort : "Recommended";
            all = sort switch
            {
                "A-Z" => all.OrderBy(c => c.Title).ToList(),
                "Recently" => all.OrderByDescending(c => c.Id).ToList(),
                _ => all.OrderByDescending(c => c.CanStart).ThenByDescending(c => c.Metadata.Featured).ThenBy(c => c.Id).ToList()
            };

            var total = all.Count;
            var totalPages = (int)Math.Ceiling(total / (double)pageSize);
            page = Math.Max(1, Math.Min(page, totalPages == 0 ? 1 : totalPages));

            var items = all.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return View(new CourseCatalogPageViewModel
            {
                Courses = items, Categories = categories, Query = q, Tag = tag, Sort = sort,
                Page = page, PageSize = pageSize, TotalCount = total, TotalPages = totalPages
            });
        }

        public IActionResult Details(int id)
        {
            var course = GetCourses().FirstOrDefault(c => c.Id == id);
            if (course == null) return NotFound();
            var curriculum = LearningCatalog.PublicCatalog().FirstOrDefault(item => item.Id == id);
            if (curriculum is null) return NotFound();
            return View(new CourseDetailsPageViewModel(new CourseBrowseItem(course, curriculum)));
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        private static List<Course> GetCourses() => CourseCatalog.GetCourses();
    }
}
