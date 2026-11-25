# NextSkill — สมัครสมาชิกและเข้าสู่ระบบ

## เปิดใช้งาน

ติดตั้งฐานข้อมูลตาม [คู่มือเริ่มต้น](../README.md) แล้วรันแอป ผู้เยี่ยมชมเปิด `/` เพื่อสำรวจหน้าแรกและคลังคอร์ส การลงทะเบียนและความคืบหน้าผูกกับบัญชีผู้เรียน ผู้ที่เข้าสู่ระบบแล้วจะกลับไปยังคอร์สที่ค้างไว้เมื่อมีคอร์ส ส่วนผู้ดูแลจะเข้าสู่หน้าจัดการระบบ

| หน้า | URL ต่อท้ายที่อยู่เว็บ |
|---|---|
| สมัครผู้เรียน | `/Account/Register` |
| เข้าสู่ระบบสำหรับผู้เรียน | `/Account/Login` |
| สมัครผู้ดูแลด้วยรหัสเชิญ | `/Account/AdminRegister` |
| เข้าสู่ระบบสำหรับผู้ดูแล | `/Account/AdminLogin` |
| หน้าแรก | `/Home/Index` |
| โปรไฟล์และคอร์สของผู้เรียน | `/Account/Dashboard` |
| จัดการระบบ | `/Account/AdminDashboard` |

สมัครสำเร็จแล้วให้เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่ตั้งเอง รหัสผ่านต้องยาว 8–128 ตัวอักษร

## ดูข้อมูลใน SQL Server Management Studio (SSMS)

- Server type: **Database Engine**
- Server name: **`(localdb)\MSSQLLocalDB`**
- Authentication: **Windows Authentication**
- เชื่อมต่อด้วย Windows user เดียวกับที่รันเว็บ หากมีตัวเลือก Encrypt ให้เลือก Optional หรือเลือก Trust server certificate สำหรับ LocalDB บนเครื่องนี้
- เปิด **Databases → NextSkillAuth → Tables** แล้ว Refresh หากยังไม่เห็น

ฐานข้อมูลเดียวแยกตารางชัดเจน:

- `dbo.Users`: สมาชิกทั่วไป
- `dbo.Admins`: ผู้ดูแลระบบ
- `dbo.AdminInvitations`: แฮชรหัสเชิญผู้ดูแล วันหมดอายุ และวันใช้รหัส

```sql
USE NextSkillAuth;
SELECT Id, FullName, Email, CreatedAt, LastLoginAt FROM dbo.Users;
SELECT Id, FullName, Email, CreatedAt, LastLoginAt FROM dbo.Admins;
```

อีเมลต้องไม่ซ้ำภายในประเภทบัญชีเดียวกัน อีเมลเดียวกันสามารถสมัครแยก User และ Admin ได้ แต่แต่ละบัญชีมีรหัสผ่านและข้อมูลแยกกัน หน้า Login แต่ละประเภทอ่านเฉพาะตารางของตัวเอง

## รหัสเชิญ Admin

ผู้ดูแลเครื่องสร้างรหัสเชิญจาก PowerShell ในโฟลเดอร์โปรเจกต์:

```powershell
./Database/New-AdminInvitation.ps1
```

นำรหัสที่แสดงไปกรอกหน้า `/Account/AdminRegister` ใช้ได้ครั้งเดียวและหมดอายุใน 24 ชั่วโมง ระบบบันทึกการใช้รหัสพร้อมกับการสร้างบัญชีใน transaction เดียว

ก่อนเปิดใช้งานจากฐานข้อมูลที่เคยใช้รุ่นก่อน ให้ผู้ดูแลตรวจรายชื่อ `dbo.Admins` เทียบกับรายชื่อที่อนุมัติ ตรวจประวัติที่เกี่ยวข้อง และระงับบัญชีที่ไม่รู้จัก คุกกี้ผู้ดูแลจากรุ่นเก่าจะถูกปฏิเสธและผู้ดูแลที่ได้รับอนุมัติต้องเข้าสู่ระบบใหม่ หากต้องถอนคุกกี้ผู้ดูแลทั้งหมดในอนาคต ให้เปลี่ยนค่า `Authentication__AdminSessionVersion` เป็นค่าใหม่ที่ตรงกันบนทุก instance

## ติดตั้งฐานข้อมูลบนเครื่องใหม่

ติดตั้ง .NET 10 SDK, SQL Server LocalDB และเครื่องมือ sqlcmd จากนั้นรัน:

```powershell
sqlcmd -S '(localdb)\MSSQLLocalDB' -E -b -i './Database/Setup.sql'
dotnet restore
dotnet run --launch-profile https
```

ไฟล์ `Database/Setup.sql` สร้างฐานข้อมูลและตารางที่ยังไม่มี โดยไม่ลบข้อมูลเดิม
สำหรับเซิร์ฟเวอร์ที่บัญชีของเว็บไม่มีสิทธิ์สร้างตาราง ให้ผู้ดูแลรัน `scripts/LearningJourney.sql` ที่รากรีโปกับฐานเดียวกันก่อนเปิดแอป แล้วตั้ง `Learning__AutoMigrate=false` แอปจะตรวจรุ่นสคีมาก่อนอ่านข้อมูลการเรียน ค่าเริ่มต้นรองรับการติดตั้งเดิมด้วยการปรับสคีมาแบบเพิ่มตารางเท่านั้น
ค่า LocalDB อยู่ใน `appsettings.Development.json` สำหรับเครื่องพัฒนา เมื่อใช้งานบนเซิร์ฟเวอร์ ให้ตั้ง `ConnectionStrings__NextSkill` จากการตั้งค่าลับของโฮสต์และรัน Setup.sql ที่ SQL Server ที่กำหนด ใช้ HTTPS และตรวจใบรับรองของ SQL Server ด้วย `Encrypt=True;TrustServerCertificate=False`

หากใช้ชื่อโฮสต์อื่น ให้กำหนด `AllowedHosts` เป็นรายชื่อโดเมนที่เปิดให้บริการ คั่นชื่อด้วยเครื่องหมายอัฒภาค

## การจัดการบัญชีและเซสชัน

- รหัสผ่านจัดเก็บด้วย ASP.NET Core PasswordHasher และ salt ไม่เก็บรหัสผ่านจริง
- SQL แบบมีพารามิเตอร์, ตรวจข้อมูลฝั่งเซิร์ฟเวอร์ และป้องกัน CSRF
- Cookie ยืนยันตัวตนแบบ HttpOnly และตรวจบทบาทฝั่งเซิร์ฟเวอร์
- จำกัดการพยายามสมัคร/Login 20 ครั้งต่อนาทีต่อ IP และล็อกบัญชี 15 นาทีเมื่อรหัสผ่านผิด 5 ครั้ง
- Logout ล้าง cookie ของเบราว์เซอร์ การเลือก Remember me ทำให้ cookie อยู่หลังปิดเบราว์เซอร์ อายุ 8 ชั่วโมงและต่ออายุเมื่อใช้งาน

ระบบบัญชียังไม่มีการยืนยันอีเมลหรือระบบตั้งรหัสผ่านใหม่ คลังคอร์สอยู่ที่ `/Home/Courses` เส้นทางเดิม `/Courses/Enrollment` ส่งต่อมายังคลังคอร์ส ผู้เรียนลงทะเบียนจากหน้ารายละเอียดของแต่ละคอร์ส

แนวทางอ้างอิง: [Cookie authentication ของ Microsoft](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/cookie?view=aspnetcore-10.0) และ [Antiforgery ของ ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0)
