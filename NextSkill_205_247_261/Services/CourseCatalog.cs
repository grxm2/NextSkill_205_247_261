using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public static class CourseCatalog
{
    // The shared catalog preserves existing course IDs and detail routes.
        public static List<Course> GetCourses()
        {
            var list = new List<Course>();
            int id = 1;

            // Course 1
            list.Add(new Course
            {
                Id = id++,
                Title = "UX Research",
                Category = "Design",
                Level = "Beginner",
                Units = 6,
                Featured = true,
                Instructor = "Alex Kim",
                Description = "Learn fundamentals of UX research.",
                Skills = new List<string> { "Research", "UX" },
                Lessons = new List<Lesson> { new Lesson { Id = 1, Title = "Intro to UX" }, new Lesson { Id = 2, Title = "User Interviews" }, new Lesson { Id = 3, Title = "Surveys" } }
            });

            // Course 2
            list.Add(new Course
            {
                Id = id++,
                Title = "Design Systems",
                Category = "Design",
                Level = "Intermediate",
                Units = 8,
                Featured = false,
                Instructor = "Maya Li",
                Description = "Build and maintain design systems.",
                Skills = new List<string> { "Design", "System" },
                Lessons = new List<Lesson> { new Lesson { Id = 1, Title = "Tokenization" }, new Lesson { Id = 2, Title = "Components" }, new Lesson { Id = 3, Title = "Documentation" }, new Lesson { Id = 4, Title = "Governance" } }
            });

            // Course 3
            list.Add(new Course
            {
                Id = id++,
                Title = "Product Strategy",
                Category = "Business",
                Level = "Beginner",
                Units = 5,
                Featured = true,
                Instructor = "John Doe",
                Description = "Understand how to define product strategy.",
                Skills = new List<string> { "Product", "Strategy" },
                Lessons = new List<Lesson> { new Lesson { Id = 1, Title = "Vision" }, new Lesson { Id = 2, Title = "Roadmaps" } }
            });

            // Course 4
            list.Add(new Course
            {
                Id = id++,
                Title = "No-code Prototyping",
                Category = "Technology",
                Level = "Intermediate",
                Units = 7,
                Featured = false,
                Instructor = "Sara Park",
                Description = "Prototype without writing code.",
                Skills = new List<string> { "Prototyping", "No-code" },
                Lessons = new List<Lesson> { new Lesson { Id = 1, Title = "Tools" }, new Lesson { Id = 2, Title = "Flows" }, new Lesson { Id = 3, Title = "Testing" } }
            });

            // JavaScript Basics
            var jsLessons = new List<Lesson>();
            for (int i = 1; i <= 10; i++) jsLessons.Add(new Lesson { Id = i, Title = "Lesson " + i });
            list.Add(new Course { Id = id++, Title = "JavaScript Basics", Category = "Technology", Level = "Beginner", Units = 10, Featured = false, Instructor = "Lee Chan", Description = "Core JavaScript concepts.", Skills = new List<string> { "JavaScript", "Programming" }, Lessons = jsLessons });

            // Advanced CSS
            var cssLessons = new List<Lesson>();
            for (int i = 1; i <= 8; i++) cssLessons.Add(new Lesson { Id = i, Title = "Module " + i });
            list.Add(new Course { Id = id++, Title = "Advanced CSS", Category = "Design", Level = "Intermediate", Units = 8, Featured = false, Instructor = "Nina Rossi", Description = "Modern CSS techniques.", Skills = new List<string> { "CSS", "Design" }, Lessons = cssLessons });

            // Marketing 101
            var mLessons = new List<Lesson>();
            for (int i = 1; i <= 6; i++) mLessons.Add(new Lesson { Id = i, Title = "Topic " + i });
            list.Add(new Course { Id = id++, Title = "Marketing 101", Category = "Business", Level = "Beginner", Units = 6, Featured = false, Instructor = "Paul Green", Description = "Basics of marketing.", Skills = new List<string> { "Marketing" }, Lessons = mLessons });

            // Data for Product
            var dLessons = new List<Lesson>();
            for (int i = 1; i <= 7; i++) dLessons.Add(new Lesson { Id = i, Title = "Unit " + i });
            list.Add(new Course { Id = id++, Title = "Data for Product", Category = "Business", Level = "Intermediate", Units = 7, Featured = false, Instructor = "Anita Shah", Description = "Use data to inform product decisions.", Skills = new List<string> { "Data", "Analytics" }, Lessons = dLessons });

            // React Fundamentals
            var rLessons = new List<Lesson>();
            for (int i = 1; i <= 9; i++) rLessons.Add(new Lesson { Id = i, Title = "Chapter " + i });
            list.Add(new Course { Id = id++, Title = "React Fundamentals", Category = "Technology", Level = "Intermediate", Units = 9, Featured = false, Instructor = "Chris Wu", Description = "Component-driven UI with React.", Skills = new List<string> { "React", "JavaScript" }, Lessons = rLessons });

            // Product Analytics
            var paLessons = new List<Lesson>();
            for (int i = 1; i <= 5; i++) paLessons.Add(new Lesson { Id = i, Title = "Lesson " + i });
            list.Add(new Course { Id = id++, Title = "Product Analytics", Category = "Business", Level = "Intermediate", Units = 5, Featured = false, Instructor = "Omar Ali", Description = "Key metrics and analysis.", Skills = new List<string> { "Analytics", "Metrics" }, Lessons = paLessons });

            // Interaction Design
            var intLessons = new List<Lesson>();
            for (int i = 1; i <= 6; i++) intLessons.Add(new Lesson { Id = i, Title = "Section " + i });
            list.Add(new Course { Id = id++, Title = "Interaction Design", Category = "Design", Level = "Beginner", Units = 6, Featured = false, Instructor = "Priya Singh", Description = "Designing interactive experiences.", Skills = new List<string> { "Interaction", "UX" }, Lessons = intLessons });

            // Backend Basics
            var beLessons = new List<Lesson>();
            for (int i = 1; i <= 8; i++) beLessons.Add(new Lesson { Id = i, Title = "Part " + i });
            list.Add(new Course { Id = id++, Title = "Backend Basics", Category = "Technology", Level = "Beginner", Units = 8, Featured = false, Instructor = "Mark Zhao", Description = "Servers and APIs.", Skills = new List<string> { "Backend", "APIs" }, Lessons = beLessons });

            list.Add(new Course { Id = 13, Title = "English for Work", Category = "Languages", Level = "Beginner", Units = 4, Featured = true, Instructor = "NextSkill", Description = "ฝึกแนะนำตัว เขียนอีเมล และสื่อสารในการประชุมภาษาอังกฤษ", Skills = new List<string> { "English", "Communication" }, Lessons = new List<Lesson> { new() { Id = 1, Title = "แนะนำตัวในที่ทำงาน", DurationMinutes = 8 }, new() { Id = 2, Title = "เขียนอีเมลให้ชัดเจน", DurationMinutes = 10 }, new() { Id = 3, Title = "สื่อสารในการประชุม", DurationMinutes = 10 }, new() { Id = 4, Title = "ให้ข้อเสนอแนะอย่างสร้างสรรค์", DurationMinutes = 10 } } });
            // The same authored curriculum drives legacy detail counts and the new islands.
            foreach (var course in list)
            {
                var path = LearningCatalog.Find(course.Id);
                if (path is null) continue;
                course.Units = path.Lessons.Length;
                course.Description = path.Description;
                course.Lessons = path.Lessons.Select(lesson => new Lesson
                {
                    Id = lesson.Id, Title = lesson.Title, DurationMinutes = lesson.Minutes
                }).ToList();
            }
            return list;
        }
}
