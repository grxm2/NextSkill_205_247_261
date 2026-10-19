# NextSkill — สมัครสมาชิกและเข้าสู่ระบบ

หน้าเว็บใช้ดีไซน์ขาวดำตามภาพอ้างอิง และแยกแบบฟอร์ม User / Admin

## เปิดใช้งาน

เปิด Solution ใน Visual Studio แล้วกด F5 เว็บจะเริ่มที่หน้า **Login** หากยังไม่ได้เข้าสู่ระบบ เมื่อ Login สำเร็จทั้ง User และ Admin จะเข้าสู่หน้า **Home (Learning Club)** จากนั้นกด **Courses** ใน Navigation เพื่อเปิดแค็ตตาล็อกจาก branch game

หน้า Home และหน้าคอร์สต้องเข้าสู่ระบบก่อน หากมี session อยู่แล้วจะเข้า Home ได้ทันที ส่วนหน้า Login/สมัครสมาชิกจะไม่แสดงเมนู Courses ให้ข้ามลำดับนี้

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

นำรหัสที่แสดงไปกรอกหน้า `/Account/AdminRegister` ใช้ได้ครั้งเดียวและหมดอายุใน 24 ชั่วโมง รหัสจะถูกใช้เมื่อการสมัครสำเร็จเท่านั้น ไม่มีบัญชี Admin หรือรหัสผ่านเริ่มต้นที่ฝังไว้ในโปรแกรม

## ติดตั้งฐานข้อมูลบนเครื่องใหม่

ติดตั้ง .NET 10 SDK, SQL Server LocalDB และเครื่องมือ sqlcmd จากนั้นรัน:

```powershell
sqlcmd -S '(localdb)\MSSQLLocalDB' -E -b -i './Database/Setup.sql'
dotnet restore
dotnet run --launch-profile https
```

ไฟล์ `Database/Setup.sql` สร้างฐานข้อมูลและตารางที่ยังไม่มี โดยไม่ลบข้อมูลเดิม
หากใช้ SQL Server instance อื่น ให้แก้ `ConnectionStrings:NextSkill` ใน `appsettings.json` และรัน Setup.sql ที่ instance นั้น ตัวแปรสภาพแวดล้อม `ConnectionStrings__NextSkill` ใช้แทนค่าการเชื่อมต่อได้ ไม่ควรใส่ SQL password ลงใน Git

LocalDB ใช้สำหรับพัฒนาบนเครื่องนี้ หากนำขึ้นเซิร์ฟเวอร์ให้ใช้ SQL Server ที่ติดตั้งสำหรับเซิร์ฟเวอร์ พร้อม HTTPS และใบรับรองที่เชื่อถือได้

## การทำงานที่ตรวจสอบแล้ว

- รหัสผ่านจัดเก็บด้วย ASP.NET Core PasswordHasher และ salt ไม่เก็บรหัสผ่านจริง
- SQL แบบมีพารามิเตอร์, ตรวจข้อมูลฝั่งเซิร์ฟเวอร์ และป้องกัน CSRF
- Cookie ยืนยันตัวตนแบบ HttpOnly และตรวจบทบาทฝั่งเซิร์ฟเวอร์
- จำกัดการพยายามสมัคร/Login 20 ครั้งต่อนาทีต่อ IP และล็อกบัญชี 15 นาทีเมื่อรหัสผ่านผิด 5 ครั้ง
- Logout ล้าง cookie ของเบราว์เซอร์ การเลือก Remember me ทำให้ cookie อยู่หลังปิดเบราว์เซอร์ อายุ 8 ชั่วโมงและต่ออายุเมื่อใช้งาน
- การทดสอบใช้บัญชีชั่วคราวแล้วลบเฉพาะข้อมูลทดสอบ

ระบบบัญชียังไม่มีการยืนยันอีเมล/ลืมรหัสผ่าน ส่วน `/Home/Courses` ใช้แค็ตตาล็อกจาก branch game และ `/Courses/Enrollment` ใช้หน้าลงทะเบียนเรียนเดิม

แนวทางอ้างอิง: [Cookie authentication ของ Microsoft](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/cookie?view=aspnetcore-10.0) และ [Antiforgery ของ ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0)
