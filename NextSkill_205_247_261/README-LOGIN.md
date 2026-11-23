# NextSkill — สมัครสมาชิกและเข้าสู่ระบบ

หน้าเว็บใช้ดีไซน์ขาวดำตามภาพอ้างอิง และแยกแบบฟอร์ม User / Admin

## เปิดใช้งาน

เปิด Solution ใน Visual Studio แล้วกด F5 เว็บจะเริ่มที่หน้า **Login** หากยังไม่ได้เข้าสู่ระบบ เมื่อ Login สำเร็จทั้ง User และ Admin จะเข้าสู่หน้า **Home (Learning Club)** จากนั้นกด **Courses** ใน Navigation เพื่อเปิดแค็ตตาล็อกจาก branch game

หากยังไม่พร้อม Login ให้กด **ข้ามไปก่อน** ใต้ปุ่ม Log in เพื่อเข้า Home และเปิด Courses จาก Navigation ได้ทันที โดยไม่ต้องเชื่อมต่อฐานข้อมูลบัญชี หน้า `/` ยังเริ่มที่ Login ตามเดิม

การข้ามใช้สำหรับดูหน้า Home และหน้าคอร์สตัวอย่างเท่านั้น ไม่ได้สร้างบัญชีหรือให้สิทธิ์ User/Admin หน้า My account และ Admin dashboard ยังต้องเข้าสู่ระบบตามบทบาทเดิม

การรวม branch Login เก็บหน้า Home, Navigation, Floating Buddy และแค็ตตาล็อก `/Home/Courses` ปัจจุบันไว้ครบ หน้า Dashboard ของ User และ Admin ยังแยกตามบทบาทตามระบบบัญชีเดิม

| หน้า | URL ต่อท้ายที่อยู่เว็บ |
|---|---|
| สมัคร User | `/Account/Register` |
| Login User | `/Account/Login` |
| สมัคร Admin | `/Account/AdminRegister` |
| Login Admin | `/Account/AdminLogin` |
| หน้า Home หลัง Login (User / Admin) | `/Home/Index` |
| ข้อมูลบัญชี User | `/Account/Dashboard` |
| จัดการระบบ Admin (ผ่านบัญชีของฉัน) | `/Account/AdminDashboard` |

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

## การทำงานที่ตรวจสอบแล้ว

- รหัสผ่านจัดเก็บด้วย ASP.NET Core PasswordHasher และ salt ไม่เก็บรหัสผ่านจริง
- SQL แบบมีพารามิเตอร์, ตรวจข้อมูลฝั่งเซิร์ฟเวอร์ และป้องกัน CSRF
- Cookie ยืนยันตัวตนแบบ HttpOnly และตรวจบทบาทฝั่งเซิร์ฟเวอร์
- จำกัดการพยายามสมัคร/Login 20 ครั้งต่อนาทีต่อ IP และล็อกบัญชี 15 นาทีเมื่อรหัสผ่านผิด 5 ครั้ง
- Logout ล้าง cookie ของเบราว์เซอร์ การเลือก Remember me ทำให้ cookie อยู่หลังปิดเบราว์เซอร์ อายุ 8 ชั่วโมงและต่ออายุเมื่อใช้งาน
- การทดสอบใช้บัญชีชั่วคราวแล้วลบเฉพาะข้อมูลทดสอบ

ระบบบัญชียังไม่มีการยืนยันอีเมล/ลืมรหัสผ่าน ส่วน `/Home/Courses` ใช้แค็ตตาล็อกจาก branch game และ `/Courses/Enrollment` ใช้หน้าลงทะเบียนเรียนเดิม

แนวทางอ้างอิง: [Cookie authentication ของ Microsoft](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/cookie?view=aspnetcore-10.0) และ [Antiforgery ของ ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0)
