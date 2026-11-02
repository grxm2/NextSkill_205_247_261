# NextSkill MVC Theme — เริ่มสำหรับคนในทีม

เอกสารนี้สำหรับคน; `SKILL.md` เป็นคำสั่งสำหรับ AI coding agent ภาษาโปรแกรมหลักของเว็บคือ **C#** ใช้ ASP.NET Core MVC, Razor (`.cshtml`), HTML, CSS และ JavaScript

## ใช้แพ็กนี้อย่างไร

ส่งโฟลเดอร์ `nextskill-mvc-theme/` ทั้งชุดหรือ ZIP ให้เพื่อน เพื่อให้ไฟล์อ้างอิงและภาพอยู่ครบ ไม่ต้องส่ง source code หรือฐานข้อมูลส่วนตัวไปด้วย หากใช้กับ AI ให้บอกว่า “อ่าน SKILL.md และ reference ที่เกี่ยวข้อง แล้วทำหน้าที่ระบุให้ตรงธีม โดยรักษาระบบ MVC เดิม”

`SKILL.md` มีกรอบสี semantic tokens, คู่สี contrast, โครงสร้างไฟล์, route, sizing, motion และตัวอย่าง Razor พื้นฐานครบสำหรับใช้ไฟล์เดียว รายละเอียด onboarding และภาพอยู่ในแพ็กนี้ ถ้าติดตั้ง Skill แล้ว เรียกด้วย `$nextskill-mvc-theme` ตามเครื่องมือที่ใช้

## สถานะที่ตรวจจาก source — 1 พฤศจิกายน 2026

| ส่วน | สถานะ/ขอบเขต |
|---|---|
| Stack | .NET 10, C#, MVC/Razor, SqlClient กับ SQL Server; ไม่ใช่ EF Core ใน snapshot นี้ |
| ผู้เรียน | UI เรียกผู้เรียน แต่ claim role จริงชื่อ `User`; มี catalog, course details, เลือกคอร์ส, เกาะ, บทเรียน/quiz และ progress |
| Admin | role `Admin`, หน้า dashboard และระบบบัญชีแยก; อย่าถือว่าทุก admin operation ผ่าน end-to-end QA แล้ว |
| บัญชี | Cookie auth, register/login; email verification/password reset ยังไม่มีใน source ที่ตรวจ |
| หลักสูตร | catalog แยกจากข้อมูลบัญชี; คอร์สที่เรียนได้ตรวจ `CanStart` จาก server ส่วนอื่นเป็น upcoming ไม่ปั้นบทเรียนให้ดูครบ |
| Progress/XP | server authoritative และบันทึก SQL; retake ไม่ให้ XP ซ้ำ ไม่ใช้ localStorage แทน |
| Guest preview | Development เท่านั้นตาม configuration; แยกจากบัญชีจริงและไม่ใช่ข้อมูลถาวรของสมาชิก |
| ภาพ Nimo | ใช้ PNG เดิมเป็นหลัก; การแยกตา/ปาก/แขนเป็น asset หลาย layer ยังเป็นงานต่อยอด |
| การตรวจรอบนี้ | ตรวจ source, ภาพบันทึกเดิม และ contrast แบบคำนวณ; ไม่ได้ทดสอบบัญชีจริง/Admin/cross-device ใหม่ |

ดู route/layout และลำดับ asset ใน [MVC integration](references/mvc-integration.md) และภาพใน [visual references](references/visual-references.md) เอกสารเก่าของ repo บางส่วนอธิบาย Home/Login flow รุ่นก่อน ให้ตรวจ source ปัจจุบันเสมอ

รายการงานที่เพื่อนทำอยู่ เจ้าของงาน และกำหนดส่งต้องตรวจจาก issue/ทีมปัจจุบัน เอกสารนี้ไม่ใช่ live backlog

## เปิดโปรเจกต์บนเครื่องใหม่

ขั้นตอนนี้อิง NextSkill ต้นทาง ไม่ใช่ข้อบังคับให้โปรเจกต์เพื่อนอัปเกรดเป็น .NET 10:

1. ติดตั้ง .NET 10 SDK และ SQL Server ที่เครื่องเข้าถึงได้; LocalDB เป็นตัวเลือกบน Windows สำหรับ development
2. หาโฟลเดอร์ที่มี `NextSkill_205_247_261.csproj` และเปิด terminal ในโฟลเดอร์นั้น
3. ตั้งค่า `ConnectionStrings:NextSkill` ของเครื่องตัวเอง ผ่าน configuration/user secrets/environment เช่น key `ConnectionStrings__NextSkill` ห้าม commit password หรือคัดลอก connection string ส่วนตัวของคนอื่น
4. บนฐานข้อมูล development ของตัวเอง ตรวจ `Database/Setup.sql` ก่อนรัน สคริปต์นี้สร้าง `NextSkillAuth` และตารางบัญชีที่ยังไม่มี ไม่ได้ seed ผู้เรียน/Admin หรือคอร์สตัวอย่าง หากใช้ชื่อฐานข้อมูลอื่นต้องปรับเป้าหมายให้ตรง configuration โดยตั้งใจ
5. LearningStore มี additive schema setup; ถ้า runtime account ไม่มีสิทธิ์สร้างตาราง ให้ผู้ดูแล DB ตรวจและใช้ `scripts/LearningJourney.sql` จาก repository root กับฐานข้อมูลที่ตั้งค่าไว้ ไม่รัน SQL กับ production เพียงเพื่อดูธีม
6. จากโฟลเดอร์แอป:

```powershell
dotnet restore
dotnet run --launch-profile http
```

Snapshot ของ `Properties/launchSettings.json` ใช้ `http://localhost:5205`; ถ้าเปลี่ยนพอร์ตให้ดู URL ที่ console แสดง หน้าสาธารณะหลักคือ `/Home/Index` และ `/Home/Courses` ส่วนข้อมูลบัญชี/ผลเรียนต้องมี DB และ session ที่ถูกต้อง

ตัวอย่าง setup สำหรับ **LocalDB development ของตัวเอง** หลังตรวจชื่อ instance/DB แล้ว:

```powershell
sqlcmd -S '(localdb)\MSSQLLocalDB' -E -b -i './Database/Setup.sql'
# รันจากโฟลเดอร์แอป; ไฟล์ learning schema อยู่ที่ ../scripts/LearningJourney.sql
sqlcmd -S '(localdb)\MSSQLLocalDB' -E -b -d NextSkillAuth -i '../scripts/LearningJourney.sql'
```

ไม่มีบัญชี Admin/รหัสผ่าน seed ใน Setup.sql; ระบบมี `Database/New-AdminInvitation.ps1` สำหรับ workflow รหัสเชิญ ให้ผู้ดูแลทีมเป็นคนจัดการ ไม่สร้างรหัสเชิญหรือบัญชีอัตโนมัติเพราะเรียกใช้ Skill

## Nimo กับชื่อไฟล์เก่า

ชื่อที่ใช้ใน UI ปัจจุบันคือ **Nimo** แต่ยังมี `wwwroot/css/niko-coach.css`, `niko-voyage.css`, `wwwroot/js/niko-coach.js`, `niko-voyage.js` รวมถึง hooks เช่น `niko-practice-start` และ partial `_NikoPractice.cshtml` เพื่อความเข้ากันได้

ยังไม่มีหลักฐานวันที่เปลี่ยนชื่ออย่างแน่ชัด จึงไม่ระบุวันขึ้นเอง การใช้ชื่อใหม่ใน UI ไม่ใช่คำสั่ง rename ไฟล์หรือ hooks ย้อนหลัง ดู asset ที่โหลดจริงใน `_SkillBuddy.cshtml`: `nimo-learning.png` และ `nimo-rowing.png`

## ข้อตกลงทีม

ยังไม่พบกติกาทีมที่ยืนยัน branch/commit convention, token owner หรือ protected pages ในส่วนที่ตรวจ ข้อเสนอต่อไปนี้เป็น **ข้อเสนอให้ทีมตกลง** ไม่ใช่กฎที่มีอยู่แล้ว:

- branch อาจใช้ `feature/<งาน>` หรือ `fix/<งาน>` และ commit สื่อว่าเปลี่ยนหน้า/พฤติกรรมใด โดยยึด convention เดิมถ้ามี
- การแก้ `nextskill-tokens.css`, `nextskill-components.css` หรือ shared layout ควรมีผู้รีวิวจากคนดูแล UI และแนบภาพหน้าที่กระทบ; ทีมต้องกำหนดชื่อผู้รับผิดชอบเอง
- งานหน้าเดียวควรแตะไฟล์เฉพาะหน้าเป็นหลัก ส่วน auth, grading/XP, schema และไฟล์งานค้างของเพื่อนอยู่นอกขอบเขต theme-only เว้นแต่งานระบุให้แก้
- ไม่มีรายชื่อหน้า “ห้ามแตะ” ตายตัวใน Skill; ถ้าทีมมีให้บันทึกใน contributor guide/AGENTS.md แล้วอ้างจากที่เดียว

## ตรวจและส่งต่อ

ดู [ผล contrast และคำสั่งวัด](references/contrast-report.md); รูปในแพ็กเป็นภาพอ้างอิงเก่าที่ระบุที่มา ไม่ใช่ใบรับรอง accessibility หรือผล live QA ใหม่ แพ็กนี้ไม่ได้รวมฐานข้อมูล connection strings credentials หรือข้อมูลบัญชีจริง
