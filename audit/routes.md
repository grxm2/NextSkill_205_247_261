# ภาคผนวกเส้นทาง MVC และแหล่งข้อมูล

**[อ่านโค้ด]** พบ 4 controllers, 40 action/method declarations และ root alias อีก 1 เส้นทาง ตารางแยก GET/POST ที่ใช้ชื่อเดียวกัน ส่วนผลทดสอบ HTTP อยู่ในหลักฐาน runtime แยกต่างหาก พาธในตารางอ้างจาก `NextSkill_205_247_261/`

- `Program.cs:94–97` ลงทะเบียน static assets, route `/` → `Learning.Entry` และ conventional route `/{controller}/{action=Index}/{id?}` ค่า `id` ผูกกับ action ที่รับชื่อพารามิเตอร์นี้ เช่น `Home.Details` พารามิเตอร์ `courseId` และ `lessonId` ใช้ query ตามหน้า GET ที่ระบุ
- “ไม่จำกัด” หมายถึง action ไม่ประกาศ HTTP method constraint ทางเดินปกติของ UI ใช้ GET และ global antiforgery ยังครอบคลุม method ที่ไม่ปลอดภัยตาม `Program.cs:8–12`
- `Course JSON` = `Database/custom_courses.json` และ `Question JSON` = `Database/custom_questions.json` อ่านผ่าน catalog/cache ที่ `Services/AdminContentStore.cs:16–68,186–217`, `Services/CourseCatalog.cs:15–24`, `Services/LearningCatalog.cs:27–39`
- `State SQL` หมายถึง `dbo.LearningProfiles`, `dbo.LearningCourseProgress`, `dbo.LearningLessonCompletions`, `dbo.LearningAchievements` ใน flow ผู้เรียน ระบบอ่านสถานะใน transaction และอาจ INSERT profile ครั้งแรก รวมถึงอ่าน Course JSON และ Question JSON เพื่อคำนวณหลักสูตร อ้างอิง `Services/LearningStore.cs:19–39,54–86,122–137`
- `Video SQL` = `dbo.LearningLessonVideos` และ `Watch SQL` = `dbo.LearningVideoWatchStarts` ตาม `Services/LearningSchema.cs:55–82`
- คอลัมน์ข้อมูลแสดงการเข้าถึงของตัว action และบริการที่ action เรียก การตรวจ cookie ของ request ที่มี principal จะตรวจ `dbo.Users` หรือ `dbo.Admins` เพิ่มตามบทบาท แม้หน้าเป็นสาธารณะ อ้างอิง `Program.cs:26–31,89–93`, `Services/AccountStore.cs:151–162`

## HomeController และ CoursesController

| Action | HTTP | Route | View / response | สิทธิ์ | SQL / JSON | หลักฐาน |
| --- | --- | --- | --- | --- | --- | --- |
| Home.Index | ไม่จำกัด | `/Home`, `/Home/Index` | `Views/Home/Index.cshtml` | สาธารณะ ชื่อจาก principal ถ้ามี | Course JSON สำหรับ featured 4 รายการ หน้าเรียก Learning API แยก | `Controllers/HomeController.cs:13–20,88` |
| Home.Privacy | ไม่จำกัด | `/Home/Privacy` | `Views/Home/Privacy.cshtml` ซึ่งเป็น placeholder | สาธารณะ | — | `Controllers/HomeController.cs:22–25`, `Views/Home/Privacy.cshtml:1–6` |
| Home.Courses | ไม่จำกัด | `/Home/Courses?q=…&tag=…&sort=…&page=…&pageSize=…` | `Views/Home/Courses.cshtml` | สาธารณะ | Course JSON, Question JSON | `Controllers/HomeController.cs:27–71,88` |
| Home.Details | ไม่จำกัด | `/Home/Details/{id?}` หรือ `/Home/Details?id=…` | `Views/Home/Details.cshtml` หรือ 404 ถ้าไม่พบ | สาธารณะ | Course JSON, Question JSON หน้าเรียก Learning API แยกตามสิทธิ์ | `Controllers/HomeController.cs:73–80,88`, `wwwroot/js/catalog.js:64–75,111–114` |
| Home.Error | ไม่จำกัด | `/Home/Error` | `Views/Shared/Error.cshtml` พร้อม Request ID ใช้เป็น Production exception handler ด้วย | สาธารณะ | — | `Controllers/HomeController.cs:82–86`, `Program.cs:68–73` |
| Courses.Index | ไม่จำกัด | `/Courses`, `/Courses/Index` | Redirect → `Home.Courses` | สาธารณะ | — | `Controllers/CoursesController.cs:5–8` |
| Courses.Enrollment | ไม่จำกัด | `/Courses/Enrollment` | Redirect → `Home.Courses` ไม่มีการบันทึกใน action นี้ และไม่เรียก `Views/Courses/Enrollment.cshtml` | สาธารณะ | — | `Controllers/CoursesController.cs:5–9` |

## AccountController

| Action | HTTP | Route | View / response | สิทธิ์ | SQL / JSON | หลักฐาน |
| --- | --- | --- | --- | --- | --- | --- |
| Account.Register | GET | `/Account/Register?returnUrl=…` | `Views/Account/Register.cshtml` แบบผู้เรียน | สาธารณะ | — | `Controllers/AccountController.cs:16,29–30` |
| Account.Register | POST form | `/Account/Register` | Register พร้อม error หรือ redirect → Login | สาธารณะ + rate limiter + antiforgery | INSERT `dbo.Users` | `Controllers/AccountController.cs:18–19,43–67`, `Services/AccountStore.cs:115–148` |
| Account.AdminRegister | GET | `/Account/AdminRegister?returnUrl=…` | `Views/Account/Register.cshtml` แบบ Admin | สาธารณะ | — | `Controllers/AccountController.cs:17,29–30` |
| Account.AdminRegister | POST form | `/Account/AdminRegister` | Register พร้อม error หรือ redirect → AdminLogin | สาธารณะ + rate limiter + antiforgery เงื่อนไขเชิญมีข้อบกพร่อง SEC-01 | UPDATE `dbo.AdminInvitations` ตามเงื่อนไขเชิญ, INSERT `dbo.Admins` | `Controllers/AccountController.cs:20–21,43–67`, `Services/AccountStore.cs:115–148` |
| Account.Login | GET | `/Account/Login?returnUrl=…` | `Views/Account/Login.cshtml` แบบผู้เรียน หรือ redirect ถ้าเข้าระบบแล้ว | สาธารณะ | — | `Controllers/AccountController.cs:22,31–42` |
| Account.Login | POST form | `/Account/Login` | Login พร้อม error หรือ cookie + local redirect, Learning.Entry หรือ AdminDashboard | สาธารณะ + rate limiter + antiforgery | อ่าน/อัปเดต `dbo.Users` และอาจลอง `dbo.Admins` | `Controllers/AccountController.cs:24–25,69–119,121–130`, `Services/AccountStore.cs:82–112` |
| Account.AdminLogin | GET | `/Account/AdminLogin?returnUrl=…` | `Views/Account/Login.cshtml` แบบ Admin หรือ redirect → AdminDashboard ถ้าเข้าระบบแล้ว | สาธารณะ | — | `Controllers/AccountController.cs:23,31–42` |
| Account.AdminLogin | POST form | `/Account/AdminLogin` | Login พร้อม error หรือ cookie + redirect | สาธารณะ + rate limiter + antiforgery | อ่าน/อัปเดต `dbo.Admins` | `Controllers/AccountController.cs:26–27,69–119`, `Services/AccountStore.cs:82–112` |
| Account.Dashboard | GET | `/Account/Dashboard` | `Views/Account/Dashboard.cshtml` หรือ AdminDashboard สำหรับ Admin | `[Authorize]` | `dbo.Users`, State SQL สำหรับผู้เรียน | `Controllers/AccountController.cs:132–141,212–228`, `Services/AccountStore.cs:35–46` |
| Account.Certificate | GET | `/Account/Certificate?courseId=…` | `Views/Account/Certificate.cshtml`, 404 ถ้าไม่มีรางวัล หรือ 503 ถ้า SQL ล้ม | Role `User` | `dbo.Users`, State SQL, Course JSON สำหรับชื่อย้อนหลัง | `Controllers/AccountController.cs:143–162`, `Services/LearningCertificates.cs:8–26` |
| Account.UpdateProfile | POST form | `/Account/UpdateProfile` | Dashboard พร้อม error หรือแก้ claims + redirect → Dashboard#profile-edit | Role `User` + rate limiter + antiforgery | อ่าน/อัปเดต `dbo.Users` และ State SQL เมื่อ render หน้าเดิม | `Controllers/AccountController.cs:165–228`, `Services/AccountStore.cs:49–79` |
| Account.AdminDashboard | ไม่จำกัด | `/Account/AdminDashboard` | `Views/Account/AdminDashboard.cshtml` | Role `Admin` | `dbo.Users`, `dbo.Admins`, State SQL ทั้ง 4 ตารางสำหรับ aggregate, Course JSON, Question JSON | `Controllers/AccountController.cs:230–238`, `Services/AccountStore.cs:165–235` |
| Account.AdminSaveCourse | POST JSON | `/Account/AdminSaveCourse` | JSON คอร์สที่เซิร์ฟเวอร์คืน หรือ 400 | Role `Admin` และข้าม antiforgery | อ่าน/เขียน Course JSON | `Controllers/AccountController.cs:241–249`, `Services/AdminContentStore.cs:76–120,165–176` |
| Account.AdminDeleteCourse | POST JSON | `/Account/AdminDeleteCourse` | JSON `success/id` หรือ 400 | Role `Admin` และข้าม antiforgery | อ่าน/เขียน Course JSON | `Controllers/AccountController.cs:251–259`, `Services/AdminContentStore.cs:123–137,165–176` |
| Account.AdminUploadCourses | POST form | `/Account/AdminUploadCourses` | JSON `success/count/message` หรือ 400 | Role `Admin` และข้าม antiforgery | อ่านไฟล์/ข้อความชั่วคราวและอ่าน/เขียน Course JSON | `Controllers/AccountController.cs:261–283`, `Services/AdminContentStore.cs:139–176` |
| Account.AdminSaveQuestion | POST JSON | `/Account/AdminSaveQuestion` | JSON ข้อสอบ หรือ 400 | Role `Admin` และข้าม antiforgery | อ่าน/เขียน Question JSON | `Controllers/AccountController.cs:285–293`, `Services/AdminContentStore.cs:226–251,295–306` |
| Account.AdminDeleteQuestion | POST JSON | `/Account/AdminDeleteQuestion` | JSON `success/id` หรือ 400 | Role `Admin` และข้าม antiforgery | อ่าน/เขียน Question JSON | `Controllers/AccountController.cs:295–303`, `Services/AdminContentStore.cs:253–267,295–306` |
| Account.AdminGetQuestions | GET | `/Account/AdminGetQuestions?courseId=…` | JSON รายการข้อสอบ | Role `Admin` | อ่าน Question JSON | `Controllers/AccountController.cs:305–310`, `Services/AdminContentStore.cs:186–217` |
| Account.Logout | POST | `/Account/Logout` | Sign out cookie + redirect → Login | `[Authorize]` + antiforgery | — | `Controllers/AccountController.cs:312–317` |
| Account.AccessDenied | GET | `/Account/AccessDenied` | `Views/Account/AccessDenied.cshtml` และ status 403 | สาธารณะ | — | `Controllers/AccountController.cs:318`, `Program.cs:22–23` |
| Account.Terms | GET | `/Account/Terms` | `Views/Account/Terms.cshtml` | สาธารณะ | — | `Controllers/AccountController.cs:319` |

## LearningController

`OnActionExecutionAsync` เป็น filter override ที่ `Controllers/LearningController.cs:17–41` บังคับ session สำหรับทุก action ยกเว้น `Entry` และ `Catalog` รับ principal ทั้ง User/Admin หรือ cookie preview ที่ปกป้องไว้เมื่ออยู่ใน Development และเปิด `Learning:GuestPreview` เมื่อจำเป็นต้อง challenge ฝั่ง page redirect ไป Login ส่วน JSON API คืน 401 ตาม URL ที่ตรวจใน `Program.cs:32–49` ทุก POST ใน controller ใช้ global antiforgery `Program.cs:8–12` ตารางแสดง HTTP response ของแต่ละ action

| Action | HTTP | Route | View / response | สิทธิ์ | SQL / JSON | หลักฐาน |
| --- | --- | --- | --- | --- | --- | --- |
| Learning.Entry (root alias) | GET | `/` | Redirect ตามสถานะเดียวกับ `/Learning/Entry` | `[AllowAnonymous]` | State SQL สำหรับผู้เรียนที่เข้าระบบ | `Program.cs:95–97`, `Controllers/LearningController.cs:47–64` |
| Learning.Entry | GET | `/Learning/Entry` | Guest → Home, Admin → AdminDashboard, ผู้เรียนที่มีคอร์ส active → Island, ผู้เรียนอื่น → Home | `[AllowAnonymous]` | State SQL สำหรับผู้เรียนที่เข้าระบบ | `Controllers/LearningController.cs:47–64` |
| Learning.Catalog | GET | `/Learning/Catalog` | JSON `courses` แบบ public summary | `[AllowAnonymous]` | Course JSON, Question JSON | `Controllers/LearningController.cs:43–44`, `Services/LearningCatalog.cs:79–86` |
| Learning.Island | GET | `/Learning/Island?courseId=…&lessonId=…` | `Views/Learning/Island.cshtml`, redirect Home/Practice หรือ 403/404/503 ตามสถานะ | Session หรือ Preview | State SQL | `Controllers/LearningController.cs:66–68,74–103`, `Services/LearningStore.cs:397–409` |
| Learning.Practice | GET | `/Learning/Practice?courseId=…&lessonId=…` | `Views/Learning/Practice.cshtml`, redirect Home หรือ 403/404/503 ตามสถานะ | Session หรือ Preview | State SQL บทเรียนและวิดีโอโหลดผ่าน API แยก | `Controllers/LearningController.cs:70–103`, `Services/LearningStore.cs:397–409` |
| Learning.State | GET | `/Learning/State?includeActivity=…` | JSON state หรือ 503 ถ้า SQL ใช้ไม่ได้ | Session หรือ Preview | State SQL | `Controllers/LearningController.cs:106–108,144–153`, `Services/LearningStore.cs:162–163` |
| Learning.SelectCourse | POST JSON | `/Learning/SelectCourse` | JSON state หลังบันทึกคอร์ส | Session หรือ Preview + antiforgery | State SQL + INSERT `dbo.LearningCourseProgress` และ UPDATE `dbo.LearningProfiles` | `Controllers/LearningController.cs:110–112,138–153`, `Services/LearningStore.cs:165–182` |
| Learning.Checkpoint | POST JSON | `/Learning/Checkpoint` | JSON state หลังบันทึกบทเรียนล่าสุดเมื่อยังไม่จบ | Session หรือ Preview + antiforgery | State SQL + UPDATE `dbo.LearningCourseProgress` | `Controllers/LearningController.cs:114–116,138–153`, `Services/LearningStore.cs:185–203` |
| Learning.Lesson | GET | `/Learning/Lesson?courseId=…&lessonId=…` | JSON เนื้อหาและสถานะสิทธิ์ทำ quiz | Session หรือ Preview | State SQL + อ่าน Video SQL หากมีวิดีโอ | `Controllers/LearningController.cs:118–120,144–153`, `Services/LearningStore.cs:216–237` |
| Learning.StartVideo | POST JSON | `/Learning/StartVideo` | JSON boolean | Session หรือ Preview + antiforgery | State SQL + INSERT/UPDATE Watch SQL | `Controllers/LearningController.cs:122–124,138–153`, `Services/LearningStore.cs:248–267` |
| Learning.RestartVideo | POST JSON | `/Learning/RestartVideo` | JSON เนื้อหาที่คืนสถานะ quiz เป็นล็อก | Session หรือ Preview + antiforgery | State SQL + DELETE Video SQL และ Watch SQL | `Controllers/LearningController.cs:126–128,138–153`, `Services/LearningStore.cs:306–323` |
| Learning.CompleteVideo | POST JSON | `/Learning/CompleteVideo` | JSON เนื้อหาหลังเปิด quiz | Session หรือ Preview + antiforgery | State SQL + อ่าน Watch SQL ตามเงื่อนไข และอ่าน/เขียน Video SQL | `Controllers/LearningController.cs:130–132,138–153`, `Services/LearningStore.cs:270–303` |
| Learning.CompleteLesson | POST JSON | `/Learning/CompleteLesson` | JSON ผลรายข้อ คะแนน XP และ state | Session หรือ Preview + antiforgery | State SQL + อ่าน Video SQL หากมีวิดีโอ + เขียนทั้ง 4 ตาราง State SQL เมื่อผ่านครั้งแรก | `Controllers/LearningController.cs:134–153`, `Services/LearningStore.cs:326–394` |

**[อ่านโค้ด]** Learning API มีการคืน 400 เมื่อ JSON body หรือ model validation ไม่ผ่าน, 403 เมื่อบทเรียนยังล็อก, 404 เมื่อไม่มีคอร์ส/ด่าน, 409 เมื่อยังไม่ได้เลือกคอร์สหรือวิดีโอเปลี่ยน และ 503 เมื่อ SQL ล้ม ตามเงื่อนไขแต่ละ action อ้างอิง `Controllers/LearningController.cs:138–153`, `Services/LearningStore.cs:240–245,285–292,326–337,397–409`
