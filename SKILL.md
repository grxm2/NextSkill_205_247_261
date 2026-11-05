---
name: nextskill-project-theme
description: สร้าง แก้ไข หรือรีวิวหน้า ASP.NET Core MVC และ Razor ของ NextSkill ให้คงธีมทะเลและรูปแบบการใช้งานร่วมกัน ใช้เมื่อทำหน้า คอมโพเนนต์ ฟอร์ม คอร์ส หรือบทเรียนของโปรเจกต์นี้
---

# NextSkill project theme

ใช้ skill นี้เมื่อพัฒนา UI ของ NextSkill โดยอ่าน [DESIGN.md](DESIGN.md) ควบคู่กัน ไฟล์นี้เป็นแนวทางสำหรับ coding agent; `DESIGN.md` เป็นข้อตกลงภาพและคอมโพเนนต์ที่ทั้งทีมใช้อ้างอิง เจ้าของงานสามารถกำหนดให้เปลี่ยนธีมหรือขอบเขตได้

## เริ่มงาน

1. อ่านคำสั่งของ repository และตรวจไฟล์ที่แก้ค้างไว้ ค้นหา `.csproj` และหน้าใกล้เคียงก่อนแก้ไข
2. ตาม route → controller → view → layout → CSS/JS ที่โหลดจริง โดยดูทั้งลำดับ stylesheet และ selector ที่ override ภายหลัง หน้าในโปรเจกต์นี้มี CSS หลายชั้น อย่าสรุปจากชื่อไฟล์เพียงอย่างเดียว
3. ใช้ shared tokens, components, partials, assets และ behavior เดิมก่อนสร้างใหม่ ถ้าต้องปรับของกลาง ให้ตรวจหน้าที่ใช้ร่วมกันด้วย
4. ทำงานเฉพาะขอบเขตที่ขอ รักษา Razor, ViewModel, routes, สิทธิ์, validation และข้อมูลจริง รวมทั้ง `id`, `data-*` และ class ที่ JavaScript ใช้ ห้ามแทนความก้าวหน้าจริงด้วยข้อมูลจำลองเพื่อทำ UI
5. ตรวจผลตามส่วนที่เปลี่ยน และรายงานเฉพาะการทดสอบที่ทำจริง

## แผนที่โปรเจกต์

Paths ต่อไปนี้เริ่มจากราก repository; โค้ดแอปอยู่ใน `NextSkill_205_247_261/` ใช้ ASP.NET Core MVC, Razor และ .NET 10 ตาม `.csproj` พร้อม CSS และ JavaScript เดิม

| งาน | จุดเริ่มอ่าน |
|---|---|
| สี ฟอนต์ ระยะ และคอมโพเนนต์กลาง | `NextSkill_205_247_261/wwwroot/css/nextskill-tokens.css`, `nextskill-components.css` และ [DESIGN.md](DESIGN.md) |
| Home และฉากเดินทาง | `Views/Home/Index.cshtml`, `Views/Shared/_SmartJourneyLayout.cshtml`, `wwwroot/css/ocean-world.css` |
| แผนที่และบทเรียน | `Views/Learning/Island.cshtml`, `_SmartJourneyLayout.cshtml`, `wwwroot/css/learning-workspace.css`, `lesson-experience.css` |
| หน้าบทเรียน/แบบทดสอบเต็มหน้า | `Views/Learning/Practice.cshtml`, `Views/Shared/_LessonBody.cshtml`, `wwwroot/css/lesson-page.css`, `wwwroot/js/smart-journey.js`; route `/Learning/Practice?courseId=N&lessonId=N` |
| รายการและรายละเอียดคอร์ส | `Views/Home/Courses.cshtml`, `Views/Home/Details.cshtml`, `Views/Shared/_Layout.cshtml`, `wwwroot/css/course-pages.css` |
| สมัคร เข้าใช้ และบัญชี | `Views/Account/`, `Views/Shared/_AccountLayout.cshtml`, `wwwroot/css/account.css` |
| สมัครเรียน | `Views/Courses/Enrollment.cshtml`, `Views/Shared/_HomeLayout.cshtml`, `wwwroot/css/course-enrollment.css` |
| ผู้ดูแล | `Views/Account/AdminDashboard.cshtml`, `wwwroot/css/admin-dashboard.css` |
| Nimo และ motion | `Views/Shared/_FloatingBuddy.cshtml`, `wwwroot/js/buddy-agent.js`, `wwwroot/js/motion-state.js` |
| กลางวัน/กลางคืน | `wwwroot/css/journey-theme.css`, `wwwroot/js/journey-theme.js`, `Views/Shared/_JourneyCelestial.cshtml`; ใช้ `html[data-theme]` ร่วมกันใน Home และ Island |

ในแถวที่ขึ้นต้นด้วย `Views/` หรือ `wwwroot/` ให้เติม `NextSkill_205_247_261/` ข้างหน้า หากย้าย skill ไปใช้ใน repository อื่น ให้ค้นหาไฟล์เทียบเท่าและใช้โครงสร้างของโปรเจกต์นั้น

Home ใช้ `_SmartJourneyLayout` กับ `JourneyMode=home`; Island ใช้ layout เดียวกันกับ `JourneyMode=learn`; หน้า Login/Register ใช้ `_AccountLayout`; Admin เป็นหน้า standalone ตรวจ layout ของหน้าจริงก่อนเพิ่มไฟล์หรือ section: `_Layout` และ `_AccountLayout` รองรับ `Scripts` แต่ `_SmartJourneyLayout` ใน snapshot นี้ไม่ได้ render section เพิ่ม

## หลักการลงมือ

- สื่อสารภาษาไทยด้วยน้ำเสียงเป็นมิตร กระชับ และสนับสนุนการเรียน ชื่อแบรนด์คือ NextSkill และมาสคอตคือ Nimo
- ใช้ `--ns-*` และ `.ns-*` จากไฟล์กลาง เลือก layout ให้เหมาะกับงาน หน้าอ่านบทเรียน ฟอร์ม และ Admin ควรสงบและชัดเจนกว่าฉาก Home
- ใช้ `<a>` สำหรับนำทาง `<button>` สำหรับ action, label และ validation สำหรับฟอร์ม รวม focus, disabled, loading, error และ empty state ตาม flow จริง
- รักษา typed ViewModel, Tag Helpers, ModelState, antiforgery, authorization และ return URL ตามโค้ดเดิม ใช้ `asp-append-version="true"` กับ local assets เมื่อเหมาะสม
- Nimo ใช้ singleton และ anchor เดิม ไม่ clone ตัวละครหรือสร้าง ID ซ้ำ ใช้ motion เป็น feedback หรือการเล่าเรื่องที่ไม่ขวางการเรียน รองรับ pause และ `prefers-reduced-motion` ผ่านระบบที่มีอยู่
- เขียน CSS แบบ scoped ตาม component หรือหน้า หลีกเลี่ยง selector กว้างและ `!important` ที่ทำให้หน้าร่วมเปลี่ยนโดยไม่ตั้งใจ

## ตรวจงานก่อนส่ง

- เมื่อแก้ Razor/C#/layout ให้ build โปรเจกต์ด้วย `dotnet build NextSkill_205_247_261/NextSkill_205_247_261.csproj` เมื่อ environment พร้อม
- เมื่อแก้ UI ให้ตรวจ desktop และ mobile รวมจอ 360/390/768/1024/1440px ตามความเสี่ยงของงาน; ตรวจข้อความไทยยาว การล้น การใช้ keyboard/focus, contrast และ zoom
- เมื่องานเกี่ยวกับ motion ให้ตรวจ reduced motion และ pause; เมื่อแก้ interaction ให้ตรวจสถานะสำเร็จ ผิดพลาด และการย้อนกลับตาม flow ที่เกี่ยวข้อง
- อ่าน scripts ทดสอบก่อนรัน เพราะบาง flow อาจพึ่งฐานข้อมูลหรือเปลี่ยนข้อมูลการเรียน ไม่ส่งคำตอบหรือแก้ข้อมูลจริงเพียงเพื่อตรวจธีม หากรันแอปหรือทดสอบไม่ได้ ให้แจ้งข้อจำกัดตรง ๆ

รายละเอียดเพิ่มเติมใน repository: `skills/nextskill-mvc-theme/references/design-system.md`, `mvc-integration.md`, `visual-references.md` และ `contrast-report.md` เป็นเอกสารและภาพ snapshot; หากไม่ตรงกับ branch ปัจจุบันให้ตรวจ source และพฤติกรรมจริงก่อน
