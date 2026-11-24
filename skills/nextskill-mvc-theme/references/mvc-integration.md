# MVC integration และแผนผัง NextSkill

อ่านเมื่อเพิ่มหน้าใหม่ เลือก layout, ประกอบ CSS/JS, แตะ form/routing หรือเชื่อมข้อมูลการเรียน

## วิธีอ่านแผนผังนี้

เป็น snapshot ของ working tree ที่ตรวจวันที่ 31 ตุลาคม 2026 โฟลเดอร์แอปต้นทางชื่อ `NextSkill_205_247_261/` อยู่ข้างไฟล์ solution; paths ในเอกสารนี้เริ่มจากโฟลเดอร์แอป ห้ามสมมติว่าเครื่องอื่นมี parent directory ชื่อเดียวกัน

ต้นทางใช้ ASP.NET Core MVC `.NET 10` (`net10.0`), Razor, CSS, vanilla JavaScript และ `Microsoft.Data.SqlClient` ไม่ได้ใช้ EF Core เป็น data access ปัจจุบัน โปรเจกต์เพื่อนให้รักษา target framework และ data layer ของเขา ไม่ย้ายเทคโนโลยีเพื่อใช้ธีม

## Layout และหน้าใช้งานจริง

| ประเภทหน้า | View / Layout | ข้อสังเกต |
|---|---|---|
| Home | `Views/Home/Index.cshtml` → `_SmartJourneyLayout` | `JourneyMode=home`, body `.smart-journey`, ฉาก `.ocean-home/.ow-scene` |
| เกาะบทเรียน | `Views/Learning/Island.cshtml` → `_SmartJourneyLayout` | `JourneyMode=learn`, เนื้อหา `.sj-learn` |
| คอร์ส/รายละเอียด | `Views/Home/Courses.cshtml`, `Details.cshtml` → `_Layout` | body `.ocean-theme.ns-site-shell`, nav `_Navbar` |
| บัญชี | `Views/Account/*` ที่ระบุ `_AccountLayout` | body `.nimo-account-theme.ns-site-shell`, nav `_Navbar` |
| Admin dashboard | `Views/Account/AdminDashboard.cshtml` | `Layout=null`; import tokens/components ของตัวเอง |

`Views/_ViewStart.cshtml` ตั้ง default `_Layout`; แต่ View สามารถเลือกต่างออกไปได้ ตรวจหน้าเป้าหมายทุกครั้ง

หน้าแรกปัจจุบันใช้ `Views/Home/Index.cshtml` กับ `_SmartJourneyLayout` และคู่มือติดตั้งอยู่ใน `README.md` ที่รากรีโป เส้นทางเดิม `/Courses/Enrollment` ส่งต่อไป `Home.Courses` การลงทะเบียนเกิดจากหน้ารายละเอียดคอร์ส

Route `/` ปัจจุบันไป `Learning.Entry`: guest ไป Home; Admin ไป AdminDashboard; learner ไปเกาะที่เรียนค้างหรือ Home ไม่ใช่ login เสมอไป

## การประกอบ CSS/JS

อย่าเปลี่ยนลำดับ include ทั้งเว็บเพื่อแก้ component เดียว ตรวจส่วนท้ายไฟล์และ selector ของหน้าจริงก่อนเพิ่ม override

| Layout | ลำดับ CSS สำคัญใน snapshot |
|---|---|
| `_SmartJourneyLayout` | tokens → home → buddy/companion → smart-journey → ocean-world (home) → journey-clouds → archipelago → learning-workspace → niko-voyage → components → lesson-experience → ocean-life (home) |
| `_Layout` | Bootstrap → tokens → site/generated styles → buddy/companion → adventure/ocean/dashboard → course-pages → site-shell → components |
| `_AccountLayout` | account → tokens → account-game → site-shell → components |

`_SmartJourneyLayout` ปัจจุบัน **ไม่ได้ render `@section Styles` หรือ `Scripts`** จึงห้ามใส่ section ตามตัวอย่าง layout อื่นแล้วคาดว่าจะทำงาน ถ้าจำเป็นต้องรองรับ ให้เพิ่ม `RenderSectionAsync` อย่างตั้งใจและตรวจหน้าที่ใช้ร่วมกัน หรือเพิ่ม asset ในเงื่อนไขของ layout ตามรูปแบบเดิม

Journey scripts เริ่มด้วย `motion-state.js` ก่อน buddy-agent/buddy-motion และ module ฉาก/บทเรียน Script เป็น `defer`; GSAP/ScrollTrigger และ ocean-world/ocean-life โหลดเฉพาะ Home ไม่ย้ายไป global account shell

ในโปรเจกต์ใหม่ที่ยังไม่มี include สามารถใส่ใน layout ที่เกี่ยวข้องตาม pattern นี้ โดยเลือก Bootstrap ตาม dependency จริงและโหลด shared components หลัง legacy styles ที่ต้องรองรับ:

```cshtml
<link rel="stylesheet" href="~/css/nextskill-tokens.css" asp-append-version="true" />
<link rel="stylesheet" href="~/css/nextskill-components.css" asp-append-version="true" />
```

สร้างไฟล์ที่อ้างถึงให้มีอยู่จริง ใช้ relative `~/...` assets และ Tag Helpers จาก `Views/_ViewImports.cshtml`; ไม่คัดลอกไฟล์ font, ชื่อ namespace หรือ route ที่ไม่มีในโปรเจกต์ใหม่

## Razor และ forms

- ใช้ ViewModel ที่ตรงกับหน้าจริง; อย่าใช้ `ViewBag` แทนข้อมูลหลักเพียงเพื่อให้ตัวอย่างสั้น
- หน้า catalog เดิมใช้ `CourseCatalogPageViewModel`, detail ใช้ `CourseDetailsPageViewModel` จาก `Models/CoursePagesViewModel.cs`; ข้อมูล request/state เรียนอยู่ใน `Models/LearningModels.cs`
- ดึงข้อมูลผ่าน Controller/Service เดิม ไม่เชื่อม SQL หรือเรียก data store จาก View เพื่อสร้างการ์ด
- ฟอร์มค้นหาใช้ GET และเก็บ query/sort/page; การแก้ข้อมูลใช้ POST ตาม endpoint เดิม
- Input มี `asp-for`, `<label>`, `asp-validation-for`; server ตรวจ `ModelState` เมื่อรับข้อมูลผิด คืน ViewModel พร้อมรายการประกอบที่ View ต้องใช้
- รักษา antiforgery เดิม Form Tag Helper/`@Html.AntiForgeryToken()` ตามรูปแบบโปรเจกต์; อย่าสร้าง token ซ้ำโดยไม่จำเป็น
- NextSkill ลง global `AutoValidateAntiforgeryToken` และกำหนด JSON header `X-CSRF-TOKEN` แล้ว ใช้ token ที่ render จริงจาก `#smart-antiforgery` ตาม flow เดิม ห้ามปิด validation เพื่อให้ปุ่มทำงาน
- รักษา local ReturnUrl และ auth/role checks ของ server; การซ่อนปุ่ม Admin ไม่ใช่ authorization

ตัวอย่าง markup สำหรับ navigation ในหน้าที่ import MVC Tag Helpers แล้ว:

```cshtml
<div class="ns-button-row">
    <a class="ns-button ns-button--primary"
       asp-controller="Home" asp-action="Courses">เลือกคอร์ส</a>
    <a class="ns-button ns-button--secondary"
       asp-controller="Home" asp-action="Index">กลับหน้าแรก</a>
</div>
```

นี่เป็นลิงก์เปลี่ยนหน้า ไม่ใช่ตัวอย่างบันทึกคอร์ส โปรเจกต์เพื่อนต้องแทน Controller/Action ที่มีจริง

## ข้อมูลจริงกับ preview

NextSkill ปัจจุบันมี SQL-backed cookie authentication และ LearningStore ที่ให้คะแนน/บันทึก progress บน server จึงไม่ควรใช้ข้อความจากเอกสารเก่าว่า XP ทั้งหมดเป็น mock

- Public course metadata มาจาก `CourseCatalog`/`LearningCatalog`; progress hydrate ผ่าน `/Learning/State`
- เลือกคอร์สใช้ `POST /Learning/SelectCourse` และ antiforgery แล้วไป Island ไม่ทำ mutation ผ่าน GET
- เมื่อ DB/network ใช้ไม่ได้ ให้แสดง unavailable/retry อย่าปั้น 0%, ปลดล็อกเกาะ หรือเติม XP ฝั่ง browser
- รักษา course/lesson IDs, `CanStart=false`, locked states และการไม่ให้ XP ซ้ำเมื่อทบทวนบทที่ผ่านแล้ว
- GuestPreview ใน Development เป็น browser preview session แยกจาก account ไม่ใช่การ login หรือการบันทึกถาวรของสมาชิก; Production ต้องเป็นไปตาม auth เดิม
- ไม่รื้อฟื้น legacy `courseProgress_v1` หรือปุ่ม “ทำเครื่องหมายว่าจบ” ฝั่ง local เพื่อแทนผลเรียนจริง

ข้อกำหนดเหล่านี้เกี่ยวกับการรักษา behavior ระหว่างทำ UI ไม่ได้สั่งให้ Skill ต่อฐานข้อมูล แก้สิทธิ์ หรือสร้างบัญชีทดสอบใหม่

## Nimo และ behavioral hooks

`Views/Shared/_FloatingBuddy.cshtml` ประกอบ singleton `#buddy-layer > #nextskill-agent` และ `_SkillBuddy`; `buddy-agent.js` ย้าย node เดิมเข้า `[data-buddy-anchor]` รวม anchor ใน dialog

อย่า clone ตัวละครหรือ duplicate IDs เพื่อให้แสดงทั้ง hero/dialog พร้อมกัน ต้องใช้ระบบ anchor เดิม เมื่อต้องเพิ่มภาพ/pose ให้ใช้ตัวละครเดิมตาม asset ที่มี ไม่อ้างว่าภาพแบนขยับตาหรือปากแยกชิ้นได้

เก็บ `data-smart-action`, `data-open-dialog`, `data-buddy-anchor`, singleton IDs และ hook ที่ module ใช้ หากจำเป็นต้องเปลี่ยน contract ให้ค้นหา caller ทั้ง CSS/JS/Razor แล้วตรวจ flow ที่กระทบ

## การตรวจที่สัมพันธ์กับงาน

เริ่มจาก `.csproj` จริง เช่น `dotnet build <project.csproj> --no-restore` เมื่อ dependencies พร้อม; ถ้ายังไม่ restore ให้ใช้ขั้นตอนของ repository และรายงานปัญหา network ตามจริง ไม่เปลี่ยน package version เพื่อหลบ warning โดยไม่มีเหตุผลของงาน

Repo มี `scripts/verify-current-journey.cjs` และ scripts QA อื่น ให้อ่านก่อนรันว่ามีการ POST, ต้องใช้ guest mode/credentials หรือฐานข้อมูลใด การตรวจธีมไม่ต้องส่งคำตอบหรือแก้ progress ของผู้ใช้จริง

เมื่อแก้ shared components ให้ดูอย่างน้อยหน้าคอร์สและฟอร์มที่ใช้ร่วมกัน; เมื่อแก้ฉากให้ดู Home/Island, pause/reduced motion และ dialog ตามส่วนที่กระทบ บันทึกผลตรวจใหม่แยกจากผล QA เก่าที่มีอยู่ในเอกสาร
