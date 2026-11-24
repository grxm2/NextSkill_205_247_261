---
name: nextskill-mvc-theme
description: "Build, extend, or review NextSkill-style Thai ocean learning interfaces in ASP.NET Core MVC and Razor. Use when pages, layouts, forms, courses, or lesson UI must follow the shared NextSkill theme; also supports applying the theme to another MVC project."
---

# NextSkill MVC Theme

สร้างและปรับ UI ให้มีภาษาภาพเดียวกับ NextSkill: โลกการเรียนรู้ริมทะเลที่สดใส สบายตา เป็นมิตร และอ่านภาษาไทยได้ดี ภาษาหลักคือ **C#** ผ่าน **ASP.NET Core MVC**; Views ใช้ Razor (`.cshtml`) พร้อม HTML, CSS และ JavaScript เจ้าของงานสามารถสั่งเปลี่ยนธีมหรือขอบเขตเหล่านี้ได้โดยตรง

## ผู้อ่านและวิธีส่งต่อ

คำสั่งในไฟล์นี้เขียนสำหรับ AI coding agent; คนในทีมเริ่มที่ [README](README.md) ซึ่งมี onboarding และสถานะโปรเจกต์ ส่งทั้งโฟลเดอร์หรือ ZIP เพื่อให้ references และภาพครบ หากได้รับเฉพาะ `SKILL.md` ใช้กรอบหลัก โครงสร้าง และตัวอย่างในไฟล์นี้ได้; references เป็นรายละเอียดเสริม ถ้าไฟล์เสริมไม่มีให้แจ้งข้อจำกัด ไม่อ้างว่าอ่านแล้วหรือเดาข้อมูลที่หายไป

เมื่อมีแพ็กครบ ดู [ภาพอ้างอิงและ asset manifest](references/visual-references.md) สำหรับ Home desktop/mobile, คอร์ส, ฟอร์มบัญชี และ Nimo ภาพเป็นบันทึกเดิม ไม่ใช่ผล live QA ใหม่

## ภาพรวมและตำแหน่งไฟล์

Snapshot ตรวจ source วันที่ 1 พฤศจิกายน 2026: เว็บเรียน Upskill/Reskill มี Home ฉากทะเล, catalog/details, เกาะ/บทเรียน/quiz, บัญชีและ Admin; role ผู้เรียนใช้ชื่อ claim `User` ส่วนผู้ดูแลใช้ `Admin` มีระบบ SQL-backed auth/progress จริง แต่ไม่ถือว่าทุก flow ผ่าน QA เพียงเพราะมี source

Paths ต่อไปนี้เริ่มจากโฟลเดอร์ที่มี `.csproj`:

```text
Program.cs                         # MVC, cookie auth, routes, antiforgery
Controllers/                       # Home, Courses, Learning, Account
Models/AccountForms.cs             # RegisterForm/LoginForm
Models/CoursePagesViewModel.cs     # typed catalog/details
Views/Home/Index.cshtml            # _SmartJourneyLayout, JourneyMode=home
Views/Learning/Island.cshtml       # _SmartJourneyLayout, JourneyMode=learn
Views/Shared/_Layout.cshtml        # catalog/details และหน้าปกติ
Views/Shared/_AccountLayout.cshtml # หน้า account ที่เลือก layout นี้
Views/Account/AdminDashboard.cshtml # standalone, Layout=null
wwwroot/css/nextskill-tokens.css
wwwroot/css/nextskill-components.css
wwwroot/js/motion-state.js         # window.NextSkillMotion
wwwroot/images/nimo-learning.png  # ภาพ Nimo ที่ใช้งานจริง
wwwroot/images/nimo-rowing.png    # pose พายเรือ
Database/Setup.sql                # schema บัญชี ไม่ใช่ข้อมูลตัวอย่าง
```

Routes หลัก: `/Home/Index`, `/Home/Courses`, `/Home/Details/{id}`, `/Learning/Island?courseId=N`, `/Account/Login`, `/Account/Register`, `/Account/Dashboard`, `/Account/AdminDashboard` และ `/Learning/Entry`; `/` dispatch ตาม guest/User/Admin และคอร์สที่เรียนค้าง อย่าบังคับให้ทุกคนเริ่มที่ Login

รันจากโฟลเดอร์แอปด้วย `.NET 10 SDK`: `dotnet restore` แล้ว `dotnet run --launch-profile http` (snapshot ใช้ `http://localhost:5205`) ต้องมี SQL Server/LocalDB และค่า `ConnectionStrings:NextSkill` สำหรับบัญชีและ progress; ดูขั้นตอนฐานข้อมูลใน README ของ Skill ก่อนรัน SQL ไม่ฝัง credential หรือ seed บัญชีเอง โปรเจกต์เพื่อนให้ใช้ .NET version และ configuration ของเขา

ข้อจำกัดที่มีหลักฐาน: ยังไม่มี email verification/password reset ตามโค้ดบัญชีที่ตรวจ; artwork แยกตา/ปาก/แขนของ Nimo เป็นงานต่อยอด ไม่อ้างว่าทำแล้ว การตรวจ Admin แบบ signed-in/cross-device ยังไม่มีผลทดสอบใหม่ในรอบนี้ งานค้างและเจ้าของงานต้องตรวจจากทีมปัจจุบัน

## เริ่มจากโปรเจกต์จริง

1. หา `.csproj`, `Program.cs`, `Views/_ViewImports.cshtml`, `_ViewStart.cshtml` และหน้าใกล้เคียงที่จะทำ อ่านคำแนะนำของ repository และดูไฟล์ที่ผู้ใช้แก้ค้างไว้ก่อนแก้ไข
2. ตาม route → Controller → View → Layout → CSS/JS ที่โหลดจริง อย่าตัดสินธีมจากชื่อไฟล์หรือ README อย่างเดียว ตรวจ selector ท้ายไฟล์และ computed style เมื่อมีหลายชั้น override
3. ใน repo NextSkill ให้หา `nextskill-tokens.css`, `nextskill-components.css` และเลือก layout ให้ตรงประเภทหน้า ดู [แผนผัง MVC](references/mvc-integration.md) เมื่อต้องแตะ layout, script, routing หรือข้อมูลเรียน
4. หากใช้กับโปรเจกต์ของเพื่อน ให้ค้นหาโครงสร้างเทียบเท่า ใช้ namespace, ViewModel, route และ .NET version ของโปรเจกต์นั้น ห้ามผูกกับ path เครื่องผู้สร้างหรือคัดลอกชื่อฐานข้อมูลจาก NextSkill
5. ใช้ tokens และ components เดิมก่อนเพิ่มของใหม่ ถ้าโปรเจกต์ยังไม่มี ให้ตั้ง shared theme จากค่าด้านล่างและ [รายละเอียด design system](references/design-system.md) โดยเลือก typography, spacing และ states ให้ครบ

Skill นี้กำหนดกรอบงาน UI ไม่ได้สั่งให้สร้างหน้าใหม่ทั้งเว็บ เปลี่ยน backend หรือติดตั้ง framework เพิ่มเมื่อผู้ใช้ขอแก้เพียงจุดเดียว

ใช้ธีมและคอมโพเนนต์ของ NextSkill ตัดสินใจสำหรับงานปรับ UI ทั่วไป เปิด `ui-ux-pro-max` เมื่อผู้ใช้ระบุให้ใช้หรือมีคำถาม UX ที่หลักของโปรเจกต์ยังตอบไม่ได้ เช่น ลำดับโฟกัสของคอมโพเนนต์ใหม่ ให้ค้นเฉพาะเรื่องที่ติดอยู่ การปรับสี ระยะ ป้ายสถานะ หรือพื้นผิวตามธีมเดิมใช้ Skill นี้ได้เลย แม้งานนั้นจะเพิ่มหน้าใหม่

## กรอบธีมที่ต้องรักษา

- **บุคลิก:** Thai learning adventure, ทะเลฟ้าอ่อน เกาะ เรือ เมฆ และภาพประกอบที่เป็นมิตร ใช้พื้นที่ว่างชัดเจนและข้อความสี navy
- **แบรนด์เดิม:** ใช้ชื่อ `NextSkill` และมาสคอต `Nimo` ในข้อความผู้ใช้ ไฟล์เก่าที่ชื่อ `niko-*` คงชื่อได้ เมื่อใช้กับแบรนด์ของเพื่อน ให้ใช้ชื่อและ asset ที่เจ้าของโปรเจกต์กำหนด
- **ภาษาหลัก:** เมนู คำสั่ง สถานะ และข้อความผิดพลาดเป็นไทย ชื่อคอร์สหรือศัพท์วิชาการอังกฤษคงตามข้อมูลจริง โทนสนับสนุนให้เรียนต่อ ไม่ตำหนิผู้เรียน
- **ฉากกับพื้นที่ทำงาน:** หน้า Home/แผนที่ใช้ภาพเล่าเรื่องได้ หน้าเนื้อหาเรียน คอร์ส ฟอร์ม บัญชี และ Admin เน้นอ่านง่ายและทำงานสำเร็จ ไม่จำเป็นต้องมีฉากเคลื่อนไหวทุกหน้า
- **พื้นผิว:** ใช้ Liquid Glass กับกลุ่มที่ลอยบนฉาก เช่น แถบข้อมูลคอร์ส แผงนำทาง หรือแถบขั้นตอน รวมข้อมูลที่เกี่ยวข้องบนกระจกแผ่นเดียว ใช้สีโปร่งตามธีม ขอบสะท้อนบาง และเงาเบา โดย reuse `glass.css` และมีพื้นทึบสำรอง ใช้พื้นสงบสำหรับข้อความยาว ตาราง และฟอร์ม ดู [แนวทาง Liquid Glass](references/design-system.md#liquid-glass)
- **ลำดับสายตา:** ใช้ขนาดตัวอักษร น้ำหนัก ระยะว่าง และสีเน้นจากธีมก่อน ใช้ตัวอักษร navy บนพื้นสว่าง และสีข้อความสว่างตามธีมบนพื้นมืด ให้แสงสะท้อนอยู่บนขอบหรือพื้นผิวของกลุ่ม หลีกเลี่ยงแถบขาวหลังคำ ป้ายขาวที่ซ้ำกัน ขอบตัวอักษร และแสงเรืองรอบข้อความ เก็บตัวอักษรขาวไว้กับพื้นเข้มที่ต้องการคอนทราสต์ เช่น ปุ่มหลัก
- **ขอบเขตภาพ:** ไม่เปลี่ยนเป็น dark theme, ชุดสีม่วง/ส้มทั้งเว็บ, dashboard คนละสไตล์ หรือเปลี่ยนหน้าตามาสคอต เว้นแต่ผู้ใช้ขอ ห้ามใช้ภาพหรือเอฟเฟกต์บังหัวข้อ ปุ่ม และเนื้อหาเรียน

## Tokens หลัก

ใช้ CSS custom properties ชุด `--ns-*` เป็นจุดปรับกลาง อย่ากระจาย hex ของ semantic UI ไปตามหน้า สีภาพประกอบทะเลคงพาเลตของงานภาพได้

| Token | ค่า | ใช้กับ |
|---|---|---|
| `--ns-ink` | `#173e56` | หัวข้อและข้อความหลัก |
| `--ns-muted` | `#577b91` | คำอธิบายรองบนพื้นขาว; ไม่ใช้ข้อความปกติบน canvas |
| `--ns-canvas` | `#e2f6ff` | พื้นหน้า |
| `--ns-surface` | `#ffffff` | การ์ดและฟอร์ม |
| `--ns-border` | `#c9e3ef` | เส้นขอบบาง |
| `--ns-primary` | `#087faa` | พื้นปุ่มหลักกับข้อความขาว; ไม่ใช้ข้อความปกติบน canvas |
| `--ns-primary-hover` | `#086189` | hover และข้อความลิงก์เข้ม |
| `--ns-success` / `--ns-success-surface` | `#176a52` / `#eaf8f0` | สำเร็จ |
| `--ns-warning` / `--ns-warning-surface` | `#795914` / `#fff6d8` | คำเตือน/เร็ว ๆ นี้ |
| `--ns-danger` / `--ns-danger-surface` | `#aa3041` / `#fff0f2` | ผิดพลาด/การกระทำอันตราย |

**คู่สีที่ต้องระวัง:** muted บน canvas = 4.0583:1 และ primary บน canvas = 4.0765:1 ใช้ `--ns-ink` สำหรับข้อความบน canvas และ `--ns-primary-hover` สำหรับลิงก์ (6.1206:1) สีขาวบน primary = 4.5390:1 และ muted บนขาว = 4.5188:1 ผ่านเกณฑ์ข้อความปกติด้วยระยะเผื่อน้อย ตรวจหลังผสมสีบนพื้นจริง หากคอนทราสต์ต่ำ ให้ปรับสีตัวอักษรหรือเพิ่มความทึบของแผงทั้งกลุ่มตามธีม ดู [ผลวัดและวิธีคำนวณ](references/contrast-report.md) เมื่อมีแพ็กครบ

- **ฟอนต์:** Prompt สำหรับภาษาไทยและเนื้อหา น้ำหนัก 400/500/600; Manrope 600 สำหรับตัวเลขหรือข้อความสั้นที่เหมาะสม ใช้ local fonts ที่โปรเจกต์มีพร้อม fallback ห้ามเปลี่ยนไปใช้ฟอนต์ละตินที่แสดงภาษาไทยไม่ครบ
- **ตัวอ่าน:** เนื้อหาเรียนและข้อความยาว `16px / 1.8`; ข้อความรอง/label ประมาณ `14px`; `12px` ใช้เฉพาะ badge หรือ metadata สั้น ไม่ลดเนื้อหาเรียนเพื่อให้พอดีจอ
- **ระยะ:** ใช้สเกล `4 / 8 / 12 / 16 / 24 / 32 / 48px`; เพิ่มระยะที่จำเป็นตามบริบทโดยไม่สร้างระบบ spacing อีกชุด
- **มุม:** control `14px`, surface `20px`, input `12px`; เงากลาง `0 12px 32px #173e560d`
- **สีสถานะ:** success เขียว, warning เหลืองน้ำตาล, error/danger แดง ตาม reference ใช้ข้อความหรือไอคอนประกอบ ไม่สื่อสถานะด้วยสีอย่างเดียว
- **Motion พื้นฐาน:** ปุ่ม 160ms, ease-out `cubic-bezier(.23,1,.32,1)`, pressed ลง 2px; reduced motion ตัด positional feedback ค่าเสริม ease-in-out `cubic-bezier(.77,0,.175,1)` และ drawer `cubic-bezier(.32,.72,0,1)` เลือกตาม interaction ไม่ใช้เวลาเดียวกับทุก animation

## ใช้คอมโพเนนต์กลาง

| งาน | Class เดิม | ข้อตกลง |
|---|---|---|
| ปุ่ม | `.ns-button` | สูงอย่างน้อย 48px |
| การกระทำหลัก | `.ns-button--primary` | สูงอย่างน้อย 52px; เด่นที่สุดหนึ่งจุดต่อกลุ่มการตัดสินใจ |
| รอง/ข้อความ | `.ns-button--secondary`, `.ns-button--text` | ใช้กลับ เปลี่ยน หรือดูข้อมูลเสริม |
| กะทัดรัด/ไอคอน | `.ns-button--compact`, `.ns-button--icon` | พื้นที่กดอย่างน้อย 44px; icon button ต้องมีชื่อที่อ่านได้ |
| ฟอร์ม | `.ns-field` | label ชัดเจน; input/select สูงอย่างน้อย 48px และ font 16px |
| พื้นผิว | `.ns-surface` | ขาว ขอบบาง มุม 20px เงาเบา |
| ข้อความสถานะ | `.ns-status` และ error/success variants | pending, สำเร็จ, ผิดพลาด, retry ต้องเห็นได้ |
| ป้าย/กลุ่มปุ่ม | `.ns-badge`, `.ns-button-row` | ใช้สถานะสั้นและจัด action ให้ wrap ได้ |

ใช้ `<a>` สำหรับเดินทางและ `<button>` สำหรับกระทำ กำหนด `type` ของปุ่มให้ชัดเจนในฟอร์ม ปุ่มต้องมี default, hover, pressed, focus, pending และ disabled ตามงานจริง `aria-disabled` บนลิงก์ไม่ได้หยุดการคลิกเอง ต้องจัดการพฤติกรรมด้วย

คอมโพเนนต์ใหม่ใช้ชื่อ scoped เช่น `.ns-*` หรือ prefix ของหน้า หลีกเลี่ยง override กว้างอย่าง `button`, `input`, `.btn` หรือการเพิ่ม `!important` แข่งกัน ห้ามลบ `id`, `data-*` หรือ class ที่ JavaScript ใช้เป็น hook เพื่อปรับหน้าตาอย่างเดียว

## ข้อตกลง ASP.NET Core MVC

- รักษา MVC/Razor: Controller ประสาน request, ViewModel ส่งข้อมูล, View/Partial ประกอบ UI และ CSS/JS เสริม interaction ไม่ย้ายไป React, Next.js, Blazor หรือ SPA โดยไม่มีคำขอ
- ใช้ strongly typed `@model` ตามโปรเจกต์ ใช้ Tag Helpers เช่น `asp-controller`, `asp-action`, `asp-route-*`, `asp-for`, `asp-validation-for` และ versioned local assets ด้วย `asp-append-version="true"`
- เลือก shared Layout ตามประเภทหน้า ไม่เอาฉากทะเลและ learning scripts ไปใส่ทุกหน้า ก่อนเพิ่ม `@section Styles`/`Scripts` ต้องตรวจว่า layout render section นั้นจริง
- ฟอร์มต้องมี label, validation ใกล้ช่อง และ error summary เมื่อเหมาะสม รักษา ModelState, antiforgery, authorization และ ReturnUrl เดิม
- เมื่อเพิ่มช่องฟอร์ม ให้ตรวจตั้งแต่ ViewModel binding, validation, การแสดงค่าคืนเมื่อผิดพลาด ไปถึงการบันทึกตามขอบเขตที่ผู้ใช้ขอ อย่ารับข้อความแล้วทิ้งเงียบ ๆ หรืออ้างว่าบันทึกได้เมื่อยังไม่มี persistence รองรับ
- การเลือกคอร์ส บันทึกคำตอบ XP และการปลดล็อกใช้ server ตามระบบเดิม อย่าเปลี่ยนเป็น localStorage หรือแสดงว่า “บันทึกแล้ว” ก่อน server ยืนยัน แยก guest preview จากบัญชีจริง
- ใช้ข้อมูลจริงของ ViewModel จัดการ empty/loading/error states อย่าสร้างจำนวนผู้เรียน คะแนน รีวิว หรือผลเรียนปลอมเพื่อให้หน้าดูเต็ม

## ตัวอย่าง Razor

ตัวอย่างนี้เป็น pattern สำหรับปรับเข้ากับ View เดิม ไม่ใช่คำสั่งแทนหน้าเดิมทั้งไฟล์ ใช้ namespace/route/property ที่โปรเจกต์มีจริง; MVC Tag Helpers ต้อง import แล้ว

### ปุ่มนำทางหลัก

```cshtml
<a class="ns-button ns-button--primary"
   asp-controller="Home" asp-action="Courses">เลือกคอร์ส</a>
```

### ฟอร์มพร้อม validation

ตัวอย่างใช้ `LoginForm` ใน `Models/AccountForms.cs`; คง action, ReturnUrl และ validation scripts เดิม Form Tag Helper ของ POST สร้าง antiforgery token ให้ตาม configuration อย่าเพิ่ม token ซ้ำ

```cshtml
@model LoginForm
<form asp-controller="Account" asp-action="Login" method="post">
    <input asp-for="ReturnUrl" type="hidden" />
    <div asp-validation-summary="ModelOnly" class="ns-status ns-status--error"></div>
    <div class="ns-field">
        <label asp-for="Email">อีเมล</label>
        <input asp-for="Email" type="email" autocomplete="username"
               aria-describedby="email-error" />
        <span asp-validation-for="Email" id="email-error"></span>
    </div>
    <div class="ns-field">
        <label asp-for="Password">รหัสผ่าน</label>
        <input asp-for="Password" type="password" autocomplete="current-password"
               aria-describedby="password-error" />
        <span asp-validation-for="Password" id="password-error"></span>
    </div>
    <button class="ns-button ns-button--primary" type="submit">เข้าสู่ระบบ</button>
</form>
```

### การ์ดคอร์สแบบ typed partial

ใช้ `CourseBrowseItem` ของ NextSkill; เพิ่ม spacing ด้วย scoped class/stylesheet ของหน้า ไม่ใช้ตัวอย่างนี้แทน course-state adapter เดิม ปุ่มดูรายละเอียดเป็น GET ไม่ได้เลือกคอร์สหรือให้ XP

```cshtml
@model CourseBrowseItem
<article class="ns-surface">
    <h2>@Model.Title</h2>
    <p>@Model.Description</p>
    @if (!Model.CanStart)
    {
        <span class="ns-badge ns-badge--upcoming">เร็ว ๆ นี้</span>
    }
    <a class="ns-button ns-button--secondary"
       asp-controller="Home" asp-action="Details"
       asp-route-id="@Model.Id">ดูรายละเอียด</a>
</article>
```

## Responsive และการอ่าน

- ใช้ container เดิมของ shell; แนวทางหน้าปกติคือ `width: min(1320px, 90%)` และพื้นที่อ่านจำกัดความกว้างตามชนิดเนื้อหา
- ใช้ breakpoint ของหน้าที่กำลังแก้ก่อนสร้างชุดใหม่ Grid คอร์สเดิมเป็น 3 → 2 → 1 คอลัมน์ที่ 1000/700px; หน้าฉากและบัญชีมีเงื่อนไขต่างกัน
- จอเล็กเรียงหัวข้อ ข้อความ และ CTA ให้กดได้ก่อน ปรับภาพฉากและจำนวนคอลัมน์ แทนการย่อทั้งหน้า; ปุ่ม/ข้อความไทยยาวต้องไม่ล้นหรือถูกตัด
- มี focus ที่เห็นได้, ใช้ keyboard ได้, label ครบ และตรวจ contrast บนพื้นจริง โดยเฉพาะข้อความบน glass/ภาพ ปุ่มและเมนูยังใช้งานได้ที่ zoom 200%
- Modal/dialog ต้องมีชื่อ เปิดแล้วจัด focus, Escape ปิดเมื่อเหมาะสม และคืน focus ไปยังตัวเปิด ภาพตกแต่งใช้ `alt=""`/`aria-hidden` ตามองค์ประกอบ

## Motion และ Nimo

- ใช้ motion เป็น feedback หรือเล่าเรื่องเฉพาะพื้นที่ฉาก ไม่ขยับเนื้อหาอ่านหรือบังคับชม animation ก่อนเลือกคอร์ส/เริ่มเรียน
- ใช้ pause และ `prefers-reduced-motion`; ฉากตกแต่งหยุดเมื่อพัก motion, ซ่อนแท็บ, อยู่นอกจอ หรือ dialog เปิด ตาม lifecycle ของระบบ
- ใน NextSkill ใช้ `window.NextSkillMotion` และระบบ buddy เดิม Nimo เป็น singleton DOM node เดียวที่ย้ายระหว่าง anchor ห้าม clone หรือสร้างมาสคอตลอยตัวซ้ำ
- ใช้ CSS/WAAPI สำหรับ interaction เล็ก GSAP/ScrollTrigger ใช้กับฉากที่โปรเจกต์มีอยู่แล้ว ไม่เพิ่มเป็น dependency ของฟอร์มหรือหน้าข้อมูลธรรมดา
- ดูเวลาตอบสนองและ easing เดิมใน [design system](references/design-system.md) เมื่อแก้ animation ตรวจกรณีคลิกซ้ำ เปลี่ยนหน้า และเปลี่ยน reduced motion ระหว่างทำงาน

## ตรวจงานก่อนส่ง

ตรวจให้เหมาะกับส่วนที่เปลี่ยน ไม่ต้องรันทุกระบบเมื่อแก้ข้อความอย่างเดียว:

- build โปรเจกต์เมื่อแก้ Razor/C#/การประกอบ layout และรายงาน error หรือ warning ที่เกี่ยวข้องตามจริง
- เมื่อแก้ layout/style ตรวจ desktop, tablet, mobile อย่างน้อย 360/390/768/1024/1440px และ 320px ถ้าองค์ประกอบแคบเสี่ยงล้น รวมข้อความไทยยาวและ zoom 200%
- ตรวจ keyboard/focus, สีและ disabled/pending/error/empty ของส่วนที่แตะ รวม reduced motion เมื่อมี motion
- เมื่อแตะ flow ตรวจจากหน้าเข้า → action → ผลลัพธ์/ย้อนกลับ รักษา query, deep link และข้อมูลคอร์ส; ไม่ส่งคำตอบหรือแก้ข้อมูลจริงเพียงเพื่อเช็กธีม
- ถ้าเข้าถึงเว็บได้ ให้ดูภาพหน้าและ computed style จริง ถ้าตรวจได้เฉพาะ source/ภาพที่บันทึกไว้ ให้ระบุข้อจำกัดและห้ามอ้างว่าทดสอบ live แล้ว

## การทำงานร่วมกัน

ทำตาม `AGENTS.md`, contributor guide และข้อตกลงทีมที่พบจริงก่อน ขณะจัดทำ Skill ยังไม่มีหลักฐานกติกา branch/commit หรือรายชื่อผู้มีสิทธิ์แก้ tokens จึงไม่กำหนดขึ้นเอง ดูข้อเสนอแยกใน README; หน้า/ส่วนที่ห้ามแตะต้องมาจากขอบเขตงานและทีม ไม่ใช่การเดา

เมื่อแก้ shared token/component ให้ระบุหน้าที่ได้รับผลและภาพเปรียบเทียบ เก็บงานไว้เฉพาะขอบเขตที่ขอ อย่ารวมงานค้างของเพื่อน เปลี่ยน namespace/route/DOM hooks หรือแก้ auth/XP/database เพื่อทำธีมโดยไม่จำเป็น

ส่งมอบไฟล์ที่แก้ เหตุผลสั้น ๆ และผลตรวจที่ทำจริง หากต้องขยาย shared token/component ให้แก้จุดกลางและตรวจหน้าที่ใช้ร่วมกัน แทนคัดลอก CSS ชุดใหม่
