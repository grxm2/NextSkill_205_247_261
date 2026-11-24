using NextSkill_205_247_261.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using NextSkill_205_247_261.Models;
using System.Diagnostics;
using System.Security.Claims;
using System;
using System.Collections.Generic;
using System.Linq;

namespace NextSkill_205_247_261.Controllers
{
    public class HomeController(CourseFavoriteStore favorites, ILogger<HomeController> logger) : Controller
    {
        public IActionResult Index()
        {
            var learnerName = User.Identity?.IsAuthenticated == true ? User.Identity.Name ?? "ผู้เรียน" : "นักผจญภัย";
            return View(new HomeDashboardViewModel(learnerName));
        }

        public IActionResult Privacy()
        {
            return View();
        }

        // Courses list with search, filter, sort and pagination
        [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> Courses(string? q, string? tag, string sort = "Recommended", int page = 1, int pageSize = 9,
            CancellationToken token = default)
        {
            var all = CourseCatalog.GetBrowseItems();
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
                "Recently" => all.OrderByDescending(c => c.Metadata.CreatedAt).ThenByDescending(c => c.Id).ToList(),
                _ => all.OrderByDescending(c => c.CanStart).ThenByDescending(c => c.Metadata.Featured).ThenBy(c => c.Id).ToList()
            };

            var total = all.Count;
            var totalPages = (int)Math.Ceiling(total / (double)pageSize);
            page = Math.Max(1, Math.Min(page, totalPages == 0 ? 1 : totalPages));

            var items = all.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return View(new CourseCatalogPageViewModel
            {
                Courses = items, FavoriteCourseIds = await GetFavoriteCourseIdsAsync(token),
                Categories = categories, Query = q, Tag = tag, Sort = sort,
                Page = page, PageSize = pageSize, TotalCount = total, TotalPages = totalPages
            });
        }

        [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> Details(int id, CancellationToken token)
        {
            var course = CourseCatalog.GetCourses().FirstOrDefault(c => c.Id == id);
            if (course == null) return NotFound();
            var curriculum = LearningCatalog.PublicCatalog().FirstOrDefault(item => item.Id == id);
            if (curriculum is null) return NotFound();
            var favoriteIds = await GetFavoriteCourseIdsAsync(token);
            return View(new CourseDetailsPageViewModel(new CourseBrowseItem(course, curriculum), favoriteIds?.Contains(id)));
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        private async Task<IReadOnlySet<int>?> GetFavoriteCourseIdsAsync(CancellationToken token)
        {
            if (!User.IsInRole("User") || !Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return null;

            try
            {
                return await favorites.GetCourseIdsAsync(userId, token);
            }
            catch (Exception ex) when (ex is SqlException or InvalidOperationException)
            {
                logger.LogError(ex, "Could not load favorite course status");
                return null;
            }
        }
    }
}
