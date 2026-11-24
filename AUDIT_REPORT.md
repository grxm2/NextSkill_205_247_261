# รายงานตรวจความพร้อมส่ง NextSkill

วันที่ตรวจ 23 พฤศจิกายน 2569 (Asia/Bangkok) · ASP.NET Core MVC / .NET 10 / SQL Server LocalDB

## 1. สรุปผู้บริหาร

**4/10 · Critical 1 ข้อ · High 12 ข้อ**

[รันจริง] แอป build และ publish ได้ ตรวจเว็บบน localhost ด้วยฐานข้อมูลใหม่และบัญชีสังเคราะห์ การสมัคร ล็อกอิน และเลือกคอร์สมีข้อมูลเข้าออกจริง ผลรายกรณีอยู่ใน [หลักฐาน runtime](audit/runtime-results.json) และ [ยอดในฐานข้อมูลทดสอบ](audit/audit-db-totals.txt)

[อ่านโค้ด] มีรหัสเชิญผู้ดูแลที่ฝังตายตัวและข้ามเงื่อนไขการใช้ครั้งเดียว ส่วนการวัดผลปลดล็อกเป็นแบบทดสอบรายด่าน โจทย์กำหนด Final Quiz ต่อคอร์ส หลักฐานอยู่ใน `Services/AccountStore.cs:115–147`, `Services/LearningCatalog.cs:7–19` และ `Services/LearningStore.cs:326–389`

[รันจริง] Admin สร้างคอร์สจนปรากฏในแคตตาล็อกได้ แต่คอร์สที่สร้างจากข้อมูลแบบฟอร์มเริ่มเรียนไม่ได้ [อ่านโค้ด] ตัวเลขภาพรวมยังรวมประวัติจาก Preview และใช้คำเรียกที่กว้างกว่าข้อมูลจริง หลักฐาน [ผล Admin CRUD](audit/runtime-results.json), `Services/AdminContentStore.cs:76–119`, `Services/AccountStore.cs:165–205`

[อ่านโค้ด] ตรวจหาเอกสารเกณฑ์ผู้สอนด้วย `rg --files --hidden --no-ignore` สำหรับ PDF/DOCX และค้นข้อความ rubric ในซอร์ส ไม่พบเอกสารโจทย์ต้นฉบับในไฟล์ที่ตรวจ จึงใช้ requirement ที่แนบมา เอกสารโครงการที่อธิบายเจตนาของผู้พัฒนา ได้แก่ `README-SEALEARN.md`, `NextSkill_205_247_261/README-LOGIN.md` และ `docs/SMART-LEARNING-BACKEND.md`

### Top 10 ตามลำดับก่อนส่ง

1. **SEC-01** ปิดเส้นทางรหัสเชิญหลักฝัง source และตรวจบัญชี Admin ที่มีอยู่ [อ่านโค้ด] `Services/AccountStore.cs:115–147`
2. **REQ-01** ทำ Final Quiz ต่อคอร์สและกำหนดสิ่งที่ปลดล็อกเมื่อผ่านให้ตรงโจทย์ [อ่านโค้ด] `Services/LearningStore.cs:326–389`
3. **ADM-01** ให้ Admin สร้างคอร์สที่เรียนได้ครบ หรือแสดงสถานะฉบับร่างพร้อมรายการที่ต้องเติม [รันจริง] [Admin course create](audit/runtime-results.json)
4. **SEC-07** รักษา progress/ใบประกาศและยกเลิกการนำ ID คอร์สเดิมกลับมาใช้ [อ่านโค้ด] `Services/AdminContentStore.cs:123–134,179–180`
5. **SEC-03 / SEC-02** คืนการตรวจ CSRF ให้ Admin writes และสร้าง DOM ของ Quiz Studio จากค่าที่ตรวจแล้ว [อ่านโค้ด] `Controllers/AccountController.cs:241–302`, `wwwroot/js/admin-dashboard.js:502–539`
6. **SEC-04** ให้ความสำเร็จของ CRUD ขึ้นกับการบันทึกสำเร็จจริง [อ่านโค้ด] `Services/AdminContentStore.cs:165–176,295–306`
7. **CNT-01** ระบุแหล่งข้อมูลคอร์สให้ตายตัวและทดสอบวิธีเริ่มจากแพ็กเกจที่จะส่ง [อ่านโค้ด] `Services/AdminContentStore.cs:12–30`
8. **SEC-06 / ADM-02** ตรวจ schema นำเข้าและเก็บเฉลยตรงกับตัวเลือกที่ Admin เลือก [อ่านโค้ด] `Controllers/AccountController.cs:261–292`, `wwwroot/js/admin-dashboard.js:381–405`
9. **SEC-05** เปลี่ยนตัวชี้วัดให้มีหน่วยตรงกับคำบนจอ แยกสถิติผู้เรียนจาก Preview [อ่านโค้ด] `Services/AccountStore.cs:170–205`
10. **UX-01 / QUIZ-01** ทำหน้านโยบายให้ตรงระบบและแก้โจทย์ที่เดาถูกจากรูปแบบตัวเลือก [อ่านโค้ด] `Views/Home/Privacy.cshtml:1–6`, [สถิติข้อสอบ](audit/course-content-stats.json)

## 2. ตารางสถานะฟีเจอร์

✅ ผ่าน flow ที่ระบุเมื่อรันจริง · ⚠️ ผ่านบางส่วน/มีข้อจำกัด/อ้างอิงการตรวจโค้ด · ❌ ไม่มีผลตามที่ UI หรือโจทย์สื่อ · 🗑 ควรตัดหรือพัก · 🔁 ซ้ำกับทางเข้าหรือตัวชี้วัดอื่น

Path ของแอปด้านล่างนับจากโฟลเดอร์ `NextSkill_205_247_261/` ภายในรีโป เว้นแต่เป็น `audit/`, `docs/`, `scripts/` หรือไฟล์ระดับรีโป ชื่อ check ในรายงานอ้างอิง [runtime-results.json](audit/runtime-results.json)

### Guest และผู้เรียน

| หน้า / จุด | สถานะ | คาดหวัง → สิ่งที่พบ | หลักฐาน / ข้อเสนอ |
| --- | --- | --- | --- |
| Home · ปุ่มพระจันทร์ | ✅ | เปลี่ยนธีมและจำข้ามหน้า → สลับและ reload แล้วยังเป็นธีมเดิมใน Production ใน origin เดียวกัน | [รันจริง] Dark mode click and reload และภาพ Home/Courses/Details/Login แบบมืด · [อ่านโค้ด] `wwwroot/js/journey-theme.js:149–181` · ตรวจ contrast เป็นรายหน้าต่อ |
| Home · วัน/คอร์ส/XP | ⚠️ | ตัวเลขจากบัญชีปัจจุบัน → HTML เริ่มด้วยสถานะซ่อน JS เติมจาก Learning State · Production Guest ไปจากหน้าแนะนำได้โดยยังไม่มีสถิติผู้ใช้ ส่วน Development Preview และบัญชีใช้คนละ GUID | [อ่านโค้ด] `Views/Home/_HomeLearningDashboard.cshtml:2–22`, `Controllers/LearningController.cs:17–40,155–156` · ใส่ป้ายกำกับว่าเป็นบัญชีใดและไม่มีการย้าย Progress |
| Home · คอร์สปัจจุบัน / โหมดทดลอง | ⚠️ | จำคอร์สเมื่อกลับมา → Preview ใช้ cookie ที่ปกป้อง GUID และ SQL · ล้าง cookie/ปิด session แล้วการเชื่อมถึงแถวเดิมอาจหาย ฝั่งบัญชีแยกจาก Preview | [รันจริง] Development guest preview มี cookie และ XP 0 · [อ่านโค้ด] `Controllers/LearningController.cs:20–37`, `Services/LearningStore.cs:56–71,165–181` · ปิดบนชุดส่งและอธิบายสถานะ |
| Home · ภารกิจ | ⚠️ | ภารกิจเปลี่ยนตามการเรียนและรีเซ็ตทุกวัน → นับจาก completion ที่แปลงเวลา UTC+7 แล้วคำนวณตามวัน · งานชิ้นนี้ไม่ได้เร่งนาฬิกาเพื่อทดสอบข้ามเที่ยงคืน | [อ่านโค้ด] `Models/LearningDailyGoals.cs:9–23`, `Services/LearningStore.cs:97–154`, `Views/Home/_HomeLearningDashboard.cshtml:61–109` · ใช้คำว่าเวลาไทยและวันอ้างอิงเดียวกัน |
| Courses · ค้นหา / หมวด / เรียง / pagination | ⚠️ | ค้นไทยและเคารพตัวกรอง → คำ “ภาษาอังกฤษ” ในหมวดภาษาอังกฤษพบ 5 แถว สถานะ A–Z คงอยู่และคำที่ไม่ตรงแสดง empty state ส่วน “เพิ่มล่าสุด” อาศัย ID | [รันจริง] Guest Thai search · [อ่านโค้ด] `Controllers/HomeController.cs:28–70`, `Views/Home/Courses.cshtml:22–51,95–100` · ให้ “เพิ่มล่าสุด” ใช้วันที่สร้างจริง |
| Courses · Nimo bubble | 🗑 | เมื่อสื่อคล้ายแชต ผู้ใช้อาจคาดว่าจะถามได้ → ข้อความชี้ทางและ hint ตามสถานะ/ข้อมูลข้อสอบ | [อ่านโค้ด] `wwwroot/js/buddy-agent.js`, `Views/Home/Courses.cshtml:34–43`, `Views/Learning/Practice.cshtml:46–64` · เก็บเป็นคำแนะนำสั้นที่เกี่ยวกับงาน |
| Details · เริ่มเรียนเกาะแรก | ✅ | Guest เข้า Login / Learner เริ่มคอร์ส → ทดสอบ Guest Production ไป Login และ Learner เปิดแผนที่โดย `activeCourseId=101` และเกิดแถว SQL | [รันจริง] Production guest / Course start / SQL totals · เก็บและตั้งข้อความ “ลงทะเบียนและเริ่มเรียน” |
| Details · เส้นทาง / สถานะล็อก | ⚠️ | แสดง current / locked / completed ตาม Progress → View แสดงข้อมูลตั้งต้นจาก catalog และใช้ JS อัปเดต · ฐานข้อมูลทดสอบคืนรายการ unlocked ตามลำดับ | [รันจริง] คอร์ส #101 เปิดด่าน 1 ตอนเริ่ม · [อ่านโค้ด] `Views/Home/Details.cshtml:78–118`, `Services/LearningStore.cs:122–136` · แสดงเหตุผลรวมถึงเกณฑ์ผ่าน |
| Details · ใบรับรอง / วงกลมเปอร์เซ็นต์ | ⚠️ | สรุปว่าจะได้เอกสารและเหลืออีกเท่าไร → วงกลมเติมจาก State เมื่อมีสิทธิ์ · เอกสารเป็นใบจบโดย NextSkill และไม่มีหน้าตรวจเลขสาธารณะ | [อ่านโค้ด] `Views/Home/Details.cshtml:54–57,154–171`, `Controllers/AccountController.cs:143–163` · ระบุผู้ออกและหน่วยให้ชัด |
| Island · สลับคอร์ส / กลับด่านปัจจุบัน | ⚠️ | เลือกคอร์ส ย้ายบริบทและกลับด่าน → มี dropdown และปุ่ม locate พร้อม handlers · ยังยืนยันทุกชุดคอร์สและการคืน scroll ไม่ได้ | [อ่านโค้ด] `Views/Learning/Island.cshtml:16–32,66–80`, `wwwroot/js/smart-journey.js` · จำกัดตัวเลือก “คอร์สของฉัน” และทางไปคลังให้ชัด |
| Island · รายละเอียดด่าน / เริ่มเรียน / ด่านล็อก | ⚠️ | เปิดด่านของตัวเองตามลำดับ → มี dialog, การย้ายไป Practice และ gate ทั้งหน้าและ store · Status ใน State หลังเริ่มต้นตรงกับลำดับ | [รันจริง] Course start และรายการ unlocked · [อ่านโค้ด] `Controllers/LearningController.cs:74–97,118–136`, `Services/LearningStore.cs:122–143,230–236` · เก็บลำดับด่าน |
| Island · 0/200, streak, ภารกิจ 0/3 / ใต้น้ำ | ⚠️ | เห็นสถานะที่แยกได้ → `200` คือ XP ต่อระดับของบัญชี, `0/3` คือเป้าประจำวัน · เลื่อนลงได้และเนื้อหายังอยู่ภายในฉากยาว | [รันจริง] [ภาพช่วงล่าง](audit/screenshots/island-bottom.png) และ `0/200 XP` ที่คอร์ส #101 · [อ่านโค้ด] `Views/Learning/Island.cshtml:8,35–61` · ติดป้าย “ระดับ” และลดระยะเลื่อน |
| Login · แท็บผู้เรียน/ผู้ดูแล | ✅ | ส่งฟอร์มคนละ action และได้ role จริง → สร้างและล็อกอินทั้งสองบทบาทในฐานข้อมูลทดสอบ | [รันจริง] Learner login / Admin invites · [อ่านโค้ด] `Controllers/AccountController.cs:22–27,69–109` · ป้ายบทบาทสอดคล้องกับ redirect |
| Login · จดจำ / แสดงรหัสผ่าน / สมัคร / ลืมรหัสผ่าน | ⚠️ | จดจำและควบคุม input → cookie persistent อายุ ticket 8 ชม. · มีปุ่มแสดงรหัสและลิงก์สมัคร · ไม่พบฟังก์ชันรีเซ็ตรหัสผ่าน | [รันจริง] Learner session cookie · [อ่านโค้ด] `Program.cs:14–25`, `Views/Account/Login.cshtml:70–104` · เปลี่ยนข้อความ remember ให้ตรงและระบุช่องทางติดต่อ |
| Login · ข้ามไปก่อน | ✅ | เปิดหน้าแรกแบบ Guest → ไป Home และไม่มี Auth cookie ใน Production | [รันจริง] Production guest start and skip · `Views/Account/Login.cshtml:95–98` · เปลี่ยนเป็น “กลับหน้าแรก” |
| Dashboard · XP / Level / Streak / จบ N คอร์ส | ⚠️ | แสดงผลสะสมต่อบัญชี → State/Activity อ่านจาก SQL, ระดับมาจาก XP รวม · ไม่มีการวัดข้ามวันในรอบนี้ | [อ่านโค้ด] `Services/LearningStore.cs:75–159`, `Views/Account/Dashboard.cshtml:72–130` · แยก XP รวมกับ XP ในระดับ |
| Dashboard · เหรียญ / ใบประกาศ | ⚠️ | ได้รางวัลเมื่อเรียนจบ → เปิดใบประกาศคอร์ส #101 ได้ มีชื่อผู้เรียน คอร์ส วันที่ออกและผู้จัด NextSkill ไม่มีเลขอ้างอิงหรือทะเบียนตรวจสาธารณะ | [รันจริง] Certificate 200 หลังผ่าน 3 ด่าน มีชื่อผู้เรียนทดสอบ · [อ่านโค้ด] `Services/LearningStore.cs:351–389`, `Views/Account/Certificate.cshtml:28–36` · ใช้ “ใบยืนยันการเรียนจบโดย NextSkill” |
| Dashboard · ภารกิจวันนี้และ 7 วัน | ⚠️ | เห็นกิจกรรมรายวัน → ย้อนตาม completion จริงที่เวลาไทย · ซ้ำ Home/Island และไม่ยืนยันการ rollover ใน runtime | [อ่านโค้ด] `Views/Account/Dashboard.cshtml:183–222`, `Services/LearningStore.cs:97–154` · เก็บประวัติบน Dashboard และให้หน้าบทเรียนแสดงสรุป |
| Dashboard · แก้ชื่อ/อีเมล | ✅ | ชื่อมีผลกับโปรไฟล์ เปลี่ยนอีเมลถามรหัสปัจจุบัน → ทดสอบปฏิเสธเมื่อขาดรหัสและบันทึกชื่อไทยพร้อมอักขระพิเศษ | [รันจริง] Learner dashboard and profile validation · `Controllers/AccountController.cs:165–208` · เพิ่มการยืนยันอีเมลถ้าต้องใช้เป็นบัญชีจริง |
| Dashboard · อวตาร | 🗑 | อาจคาดว่าจะเปลี่ยนรูป → Dashboard ผู้เรียนใช้รูป Nimo คงที่ และไม่มี flow อัปโหลด | [อ่านโค้ด] `Views/Account/Dashboard.cshtml:29–38,225–258` · เก็บเป็นภาพประกอบโปรไฟล์ |
| Footer · ความเป็นส่วนตัว/เงื่อนไข | ⚠️ | เปิดนโยบายที่มีสาระ → ทั้งสอง route ตอบ 200 · Privacy เป็น template, Terms เป็นอังกฤษและกล่าวถึงเฉพาะข้อมูลบางส่วน | [รันจริง] Production GET ทั้งสองหน้า · [อ่านโค้ด] `Views/Home/Privacy.cshtml:1–6`, `Views/Account/Terms.cshtml:1–7` · รวมทางเข้าเอกสารที่ใช้งานจริง |
| Legacy · Courses Enrollment | 🔁 | คาดว่ามีหน้าลงทะเบียน → Redirect ไปคลังคอร์ส หน้า Enrollment เก่ามีลีกและข้อมูลตัวอย่างที่ไม่ได้ render ทาง action นี้ | [รันจริง] GET 302 · [อ่านโค้ด] `Controllers/CoursesController.cs:7–8`, `Views/Courses/Enrollment.cshtml:111` · เก็บ redirect หากต้องรักษาลิงก์เก่า |

### Admin

| หน้า / จุด | สถานะ | คาดหวัง → สิ่งที่พบ | หลักฐาน / ข้อเสนอ |
| --- | --- | --- | --- |
| Header · Ctrl+K / ค้นหา | ⚠️ | ค้นทุกข้อมูลและผลลัพธ์พาไปได้ → ส่งข้อความไปฟิลเตอร์คอร์ส คำถาม และผู้เรียนในแต่ละแท็บ · ไม่มีผลค้นหาสถิติหรือหน้าผลรวม | [อ่านโค้ด] `wwwroot/js/admin-dashboard.js:906–927` · ระบุขอบเขตหรือให้ผลลัพธ์พร้อมลิงก์ |
| Header · กระดิ่งจุดแดง | ❌ | คาดว่ามีแจ้งเตือนอ่าน/ยังไม่อ่าน → เปิด browser alert สรุปยอดและบอก SQL ปกติแบบตายตัว | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:146–148`, `wwwroot/js/admin-dashboard.js:933–937` · ตัดไอคอนจุดแดง |
| ปุ่มดูหน้าบ้าน / บันทึกกิจกรรม | ⚠️ | เปิดมุมผู้เรียน/ประวัติการกระทำ → ลิงก์ไปหน้า Home สาธารณะใน session เดิม · ปุ่ม Activity เลื่อนลงไปส่วนที่รวมวันสมัครและล็อกอินล่าสุด | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:136–142,196–198`, `wwwroot/js/admin-dashboard.js:940–946`, `Services/AccountStore.cs:188–205` · ใช้ “หน้าแรก” และ “การสมัครและล็อกอินล่าสุด” |
| Overview · กราฟ 3/6/12 เดือนและโดนัท | ⚠️ | ดูแนวโน้มและสัดส่วน → เปลี่ยนแท่งตามช่วงได้จริง กราฟรวม 4 ชนิดเหตุการณ์จาก SQL มี latest-login ต่อบัญชี โดนัทมาจากหมวด JSON เดือนยอดศูนย์ยังวาดแท่ง 8% | [รันจริง] Admin dashboard tabs and controls และ [ภาพ Overview](audit/screenshots/admin-overview.png) · [อ่านโค้ด] `Services/AccountStore.cs:195–205`, `Models/AdminDashboardModel.cs:115–126`, `Views/Account/AdminDashboard.cshtml:208–304` · แยก series และแสดง 0 ให้ตรง |
| Overview · KPI 4 การ์ด | ⚠️ | เปรียบเทียบผู้เรียน คอร์ส ด่าน XP → Users/บัญชีมาจาก SQL · เคส “129 คอร์ส” คือจำนวนแถว progress · lessons/XP รวม Preview · การ์ดคอร์สอ้าง JSON | [อ่านโค้ด] `Services/AccountStore.cs:168–205`, `Models/AdminDashboardModel.cs:36–48` · เปลี่ยนชื่อหน่วยและขอบเขตตัวหาร |
| ตารางคอร์ส · ค้นหา / หมวด / แนะนำ | ⚠️ | กรองแถวตามคำค้น/หมวดและเห็น flag → JS filter รายการ JSON และ Featured เป็นข้อมูลที่บันทึกไว้ | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:477–567`, `wwwroot/js/admin-dashboard.js:220–276` · เก็บและแยกป้าย Featured จากสถานะเผยแพร่ |
| ตารางคอร์ส · ดูหน้าจริง / สร้าง / บันทึก | ⚠️ | เนื้อหาที่บันทึกเริ่มเรียนได้ → สร้าง/แก้/ลบผ่าน Admin endpoint ใช้ไฟล์ JSON · ฟอร์มสร้างบทว่างและ Catalog คืน `canStart=false` | [รันจริง] Admin course test · [อ่านโค้ด] `Services/AdminContentStore.cs:76–119`, `Services/LearningCatalog.cs:17–19` · Draft + ขั้นตอนใส่บทเรียน |
| ตารางคอร์ส · ลบ / รหัสคอร์ส | ⚠️ | ลบอย่างปลอดภัยและรักษาประวัติ → มี confirm และลบแบบถาวรที่ชั้น JSON · SQL และคำถามยังอยู่ · ID ใหม่ดูเลขสูงสุดขณะนั้น | [รันจริง] หลังลบรายการทดสอบ Details 404 · [อ่านโค้ด] `wwwroot/js/admin-dashboard.js:205–216`, `Services/AdminContentStore.cs:123–134,179–180` · archive + ID คงที่ |
| นำเข้า JSON | ⚠️ | ข้อมูลถูกต้องและจำกัดความเสียหาย → ทดสอบไฟล์ที่รับ 1 รายการกับ JSON syntax ผิด · ไม่มี schema validation ครบ มีเพียงข้อจำกัดระดับโฮสต์/ฟอร์มและตัวกรองชื่อในทางปกติ | [รันจริง] Admin JSON import · [อ่านโค้ด] `Controllers/AccountController.cs:261–282`, `Services/AdminContentStore.cs:139–164` · จำกัดขนาด ตรวจทุกแถว และแจ้งข้อผิดพลาดราย field |
| Quiz Studio · 176 / เพิ่ม แก้ ลบ | ⚠️ | แก้ข้อที่ใช้จริงแล้วข้อมูลคงอยู่ → CRUD ตรวจได้ผ่าน HTTP ในสำเนา JSON · โค้ดอาจเลื่อนตำแหน่งเฉลยจากช่องว่างและไม่รับรองว่าเลือกด่านที่มีจริง | [รันจริง] Admin question CRUD · [อ่านโค้ด] `wwwroot/js/admin-dashboard.js:374–415`, `Services/AdminContentStore.cs:226–249` · validate choice/answer/lesson |
| Quiz Studio · ทดลองตอบ / คำใบ้ | ⚠️ | ทดลองใน Admin และ Nimo ใช้ข้อมูลข้อเดียวกัน → quiz tester ทำงานใน JS กับชุดคำถาม Admin · Learner ใช้ Hint/Coaching จาก JSON และข้อความสำรองเมื่อขาด | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:649–654,950–977`, `wwwroot/js/admin-dashboard.js:556–615`, `Services/LearningCatalog.cs:60–67,90–93` · เก็บคำใบ้เฉพาะข้อที่ช่วยคิด |
| Account Directory | ⚠️ | ค้น/กรองสมาชิกและจัดการบัญชีถ้ามี → ฟิลเตอร์ชื่อ/อีเมลและ role ใน 100 แถวล่าสุด · แสดง PII ต่อ Admin และมีเพียงรายการอ่าน | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:666–714`, `wwwroot/js/admin-dashboard.js:618–639`, `Services/AccountStore.cs:182–186` · บอกขอบเขตรายการและซ่อนอีเมลใน demo |
| Admin Profile · Online & Active / LocalDB | ❌ | คาดว่ามี health monitoring → string คงที่และเปิดเผยรายละเอียด stack ไม่มี health probe | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:719–744` · เอาแถวนี้ออก |
| Recent Activity | ⚠️ | คาดว่ามีประวัติทุกเหตุการณ์ → Query reconstruct แถวสมัครและล่าสุดที่ล็อกอิน ข้อความอังกฤษ และไม่ครอบคลุม CRUD | [อ่านโค้ด] `Services/AccountStore.cs:188–205`, `Views/Account/AdminDashboard.cshtml:466–475` · แปลและตั้งชื่อใหม่ หรือทำ event ledger หากต้องใช้จริง |

## 3. Coverage Matrix

| Requirement จากโจทย์แนบ | สถานะ | หลักฐาน |
| --- | --- | --- |
| สมัครสมาชิก | ทำแล้ว | [รันจริง] สมัคร Learner แล้วพบแถว SQL, กรอกผิดและซ้ำมี validation ในรายงาน runtime |
| เข้าสู่ระบบ / แยกบทบาท | ทำบางส่วน | [รันจริง] ผู้เรียนและผู้ดูแลเข้า flow คนละบทบาท, Guest/Learner ถูก redirect ออกจาก Admin 7/7 ต่อบทบาท · [อ่านโค้ด] SEC-01 ยังทำให้การมอบ role Admin เชื่อถือไม่ได้ |
| ดูรายการคอร์สและรายละเอียด | ทำแล้ว | [รันจริง] GET Courses/Details 200, รายการผิด 404 · [อ่านโค้ด] การค้นและเรียงจริงใช้ `Controllers/HomeController.cs:28–79` |
| ลงทะเบียนเรียน | ทำบางส่วน | [รันจริง] คลิกเริ่มเรียนสร้าง `LearningCourseProgress` และเลือก active course · [อ่านโค้ด] `/Courses/Enrollment` Redirect และไม่มีขั้นตอนยืนยัน/ถอนการลงทะเบียน `Controllers/CoursesController.cs:8`, `Services/LearningStore.cs:165–181` |
| ดูคอร์สที่ลงทะเบียนและความคืบหน้า | ทำแล้วในกรณีทดสอบ | [รันจริง] Course State คืนคอร์สที่เริ่มและด่านที่ปลดล็อก · Dashboard render บัญชีทดสอบ · [อ่านโค้ด] `Views/Account/Dashboard.cshtml:97–130` |
| มี Final Quiz **ต่อคอร์ส** | ไม่มี | [อ่านโค้ด] คำถามดึงด้วย CourseId + LessonId และให้คะแนนทีละด่าน · การเรียนจบมาจากทุกด่านผ่าน `Services/LearningCatalog.cs:36–73`, `Services/LearningStore.cs:326–389` |
| ผ่านจึงปลดล็อก / ไม่ผ่านเรียนเนื้อหาถัดไปไม่ได้ | ทำบางส่วน | [รันจริง] ผลตกในด่านแรกของ #101 คงด่าน 2 ไว้ในสถานะล็อกและ XP 0 พอสอบผ่านไปด่าน 2 และ 3 ได้ · [อ่านโค้ด] Gate อยู่ระดับด่านและการเลือกคอร์สอื่นเป็นอิสระ `Services/LearningCatalog.cs:11`, `Services/LearningStore.cs:165–181,326–355` |
| Admin เพิ่ม/แก้ไข/ลบ/จัดการคอร์ส | ทำบางส่วน | [รันจริง] CRUD บน JSON สำเนา · สร้างแล้วเริ่มเรียนไม่ได้ · [อ่านโค้ด] ขาด publishable content lifecycle และลบโดยไม่ผูกประวัติ |
| ส่วนเสริม | นอก requirement | [อ่านโค้ด] XP/level/streak/ภารกิจ/เหรียญ/ใบประกาศ/แผนที่/ธีม/Nimo/กราฟ/นำเข้า/Quiz Studio อยู่ในตาราง §2 หลายรายการควรพักตาม §7 |

## 4. Findings ตามความรุนแรง

| ID | หมวด | ระดับ | หลักฐาน | สิ่งที่พบ / ผลกระทบ | วิธีแก้ | ขนาด |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-01 | Auth | **Critical** | [อ่านโค้ด] `Controllers/AccountController.cs:16–27,43–59`, `Services/AccountStore.cs:115–147`, commit `28c2fa9` | บัญชี Admin สมัครจากเส้นทางสาธารณะด้วยรหัสหลักค่าคงที่ที่ข้ามการใช้ครั้งเดียวและหมดอายุ ผู้ถือค่าที่ฝังมีทางได้ role และเข้าถึงข้อมูลผู้เรียน | เอาทางเลือกค่าคงที่ออก ใช้รหัสเชิญแบบหมดอายุ/ใช้ครั้งเดียว ตรวจบัญชีและถอน session ที่ไม่เชื่อถือ | S–M |
| REQ-01 | Requirement | **High** | [อ่านโค้ด] `Services/LearningCatalog.cs:7–19,54–73`, `Services/LearningStore.cs:326–389` | Quiz รายด่านและใบจบหลังผ่านทุกด่านยังขาดขั้นสอบรวมคอร์ส ไม่สามารถเดโมการปลดล็อกด้วย Final Quiz ได้ | ระบุ content ที่ต้องปลดล็อก เพิ่ม Final Quiz ต่อคอร์สและบันทึกผล/รอบสอบฝั่ง server | L |
| ADM-01 | Course CRUD | **High** | [รันจริง] Admin course create · [อ่านโค้ด] `Services/AdminContentStore.cs:76–119`, `Services/LearningCatalog.cs:17–19`, `Views/Account/AdminDashboard.cshtml:753–824` | บันทึกคอร์สจาก form ได้แต่ไม่มีบทเรียนพร้อมวิดีโอ/ข้อความและข้อสอบ ไม่สามารถเรียนจริงได้ | ทำแบบร่างและ publish gate พร้อมแก้เนื้อหาทีละด่าน | L |
| SEC-07 | Data lifecycle | **High** | [อ่านโค้ด] `Services/AdminContentStore.cs:123–134,179–180`, `Services/LearningStore.cs:81–85,122–136` | ข้อมูลลบแยกจาก progress/ใบประกาศและ Quiz · ลบคอร์สเลขสูงสุดที่เกิน 120 แล้วสร้างใหม่อาจใช้เลขเดิม ทำให้ความคืบหน้าผิดหลักสูตร | ใช้ immutable ID, archive และคงชื่อคอร์สเดิมในหลักฐานจบ | M |
| SEC-03 | CSRF | **High** | [อ่านโค้ด] `Program.cs:8–12,17–21`, `Controllers/AccountController.cs:241–302` | การแก้ Admin ทั้ง 5 endpoint ยกเว้น antiforgery โดยตรง คำขอ multipart และ JSON มีเงื่อนไขเบราว์เซอร์ต่างกัน · ยังไม่ยืนยันการโจมตี | ให้ global filter คุมการเขียนทั้งหมดและส่ง token จาก UI | S |
| SEC-02 | DOM XSS | **High** | [อ่านโค้ด] `Models/AdminQuizQuestion.cs:8`, `Services/AdminContentStore.cs:226–249`, `wwwroot/js/admin-dashboard.js:502–539` | ID คำถามชนิด string จากข้อมูลที่บันทึกเข้าบริบท HTML attribute โดยไม่ encode มีความเสี่ยง stored HTML injection ในหน้า Admin | ตรวจชนิด ID และสร้าง DOM ด้วย API ที่แยกข้อความ/attribute | M |
| SEC-04 | Persistence | **High** | [อ่านโค้ด] `Services/AdminContentStore.cs:117–119,165–176,247–249,295–306` | เปลี่ยน cache ก่อนเขียนไฟล์และกลืน exception จึงรายงานสำเร็จได้แม้ข้อมูลหายหลัง restart หรือระบบหลาย process เห็นคนละค่า | Atomic write หรือ SQL transaction และคืนข้อผิดพลาดหลังบันทึกล้มเหลว | M |
| CNT-01 | Packaging | **High** | [อ่านโค้ด] `Services/AdminContentStore.cs:12–30,42–67,193–223`, `Database/custom_courses.json` ระดับรีโป, ไฟล์ JSON ในโปรเจกต์ | แหล่งข้อมูลขึ้นกับ working directory · root มี JSON คอร์สต่างชุดและไม่มีไฟล์คำถาม เมื่อเริ่มจากตำแหน่งผิดอาจไม่มีคอร์สที่เริ่มได้ | กำหนด content path จาก app/content root และ fail startup อย่างชัดเจนเมื่อชุดไฟล์ขาด | S–M |
| SEC-06 | Import | **High** | [รันจริง] ผิด syntax ตอบ 400 · [อ่านโค้ด] `Controllers/AccountController.cs:261–282`, `Services/AdminContentStore.cs:139–176` | รับ JSON ตาม shape ที่ deserialize ได้โดยไม่มีการตรวจความหมายครบ ข้อจำกัดค่า/รายการและความสัมพันธ์ขาด · แถวบางส่วนข้ามเงียบและข้อความผิดพลาดนำ exception มาต่อ | จำกัดขนาด/รายการ ทำ schema และ validation แบบ preflight แล้ว commit รายการที่ยืนยัน | M |
| ADM-02 | Quiz validation | **High** | [อ่านโค้ด] `wwwroot/js/admin-dashboard.js:381–405`, `Controllers/AccountController.cs:285–292`, `Services/AdminContentStore.cs:226–249` | ตัดตัวเลือกว่างและ clamp index เฉลย ทำให้ค่าที่ Admin เลือกเปลี่ยนอย่างเงียบ เสี่ยงตัดคะแนนผู้เรียนผิด | เก็บ mapping ต่อ choice และ reject เฉลยที่ชี้ช่องว่างหรือเกินรายการ | S |
| SEC-05 | KPI | **High** | [อ่านโค้ด] `Controllers/LearningController.cs:20–37,155–156`, `Services/AccountStore.cs:168–205`, `Models/AdminDashboardModel.cs:41–48` | Preview, บัญชี Admin, คอร์สที่เลิกใช้ร่วมในตัวเลขเรียน/XP · “คอร์ส” หลายการ์ดหมายถึงคน×คอร์ส ส่วนอัตราจบด่านใช้ตัวหารเฉลี่ยแบบไม่สอดคล้อง | กำหนด cohort, สถานะ, หน่วย/ช่วงเวลา แล้วเขียนชื่อให้ตรง query | M |
| UX-01 | Privacy | **High** | [รันจริง] GET `/Home/Privacy` 200 · [อ่านโค้ด] `Views/Home/Privacy.cshtml:1–6`, `Views/Account/Terms.cshtml:1–7`, `Database/Setup.sql:8–20` | UI ขอให้ยอมรับและเก็บอีเมล ชื่อ ประวัติเรียนและวันที่กดยอมรับ แต่ privacy route เป็นข้อความ placeholder · Terms ไม่บอกข้อมูลเรียน/การใช้และระยะเก็บครบ | เขียนไทยตามข้อมูลที่เก็บจริง วัตถุประสงค์ ผู้เข้าถึง ระยะเวลาและช่องทางใช้สิทธิ์ | S–M |
| QUIZ-01 | คุณภาพข้อสอบ | **High** | [อ่านโค้ด] [สถิติ JSON](audit/course-content-stats.json), [ตัวอย่างและวิธีวัด](audit/content.md) | ตัวเลือกถูกยาวที่สุดเพียงตัวเดียว 112/176 ข้อ กลยุทธ์เลือกตัวเลือกยาวสุดพร้อมสุ่มกรณีเสมอคาดถูก 67.8% เทียบกับ 30.8% สุ่มทั่ว ทำให้ gate การเรียนมีความน่าเชื่อถือต่ำ | ทำตัวลวงสมจริงด้วยความยาวใกล้เคียงและทดลองกับผู้เรียน | L |
| DATA-01 | ป้าย XP | **Medium** | [รันจริง] `#island-level-xp` ขึ้น 0/200 · [อ่านโค้ด] `Views/Home/Details.cshtml:54–58`, `Views/Learning/Island.cshtml:35–41`, `Services/LearningStore.cs:17,351–359` | 150 คือ 3×50 ของคอร์ส, 200 คือรอบระดับรวม, โบนัสจบ +100 รวมได้ 250 ในคอร์ส #101 แต่ป้ายไม่เชื่อมความหมาย | แยก “คะแนนจากด่าน 150”, “โบนัสจบ +100”, “ระดับ 0/200 XP” | S |
| DATA-02 | Activity / วันที่ | **Medium** | [อ่านโค้ด] `Services/AccountStore.cs:172,188–205`, `Services/LearningStore.cs:97–115` | วันของภารกิจใช้ UTC+7 · KPI เดือนใหม่ขึ้นกับ UTC · รายการ Recent Activity เก็บได้เพียง login ล่าสุดและศัพท์อังกฤษ | ใช้เขตเวลาเดียวกันใน KPI ที่อ้างวันไทยและตั้งชื่อเหตุการณ์ตามข้อมูลที่เก็บ | M |
| DATA-03 | การออกใบประกาศ | **Medium** | [อ่านโค้ด] `Services/LearningCertificates.cs:8–26`, `Controllers/AccountController.cs:143–163`, `Views/Account/Certificate.cshtml:28–36` | มีชื่อ คอร์ส วันที่ แต่ไม่มีเลขอ้างอิงและ route ตรวจอิสระ ชื่อปัจจุบันถูกอ่านเมื่อเปิดใบเดิม | สร้าง snapshot ตอนออกและระบุว่าออกโดย NextSkill | M |
| SEC-09–13 | Hardening | **Medium/Low** | [อ่านโค้ด] [รายละเอียด SEC-09 ถึง SEC-13](audit/security.md) | การรับชมมี action ข้ามตามนโยบาย, learning GET เขียน profile, การคุม session และการเปิดเผย error ต้องจัดขอบเขต รวมถึง validation และ headers หัวข้อ Privacy SEC-08 รวมอยู่ใน UX-01 ในการนับรายงานหลัก | ตัดสินนโยบาย video, แยก read/write และเพิ่มความรัดกุมตามภาคผนวก | S–M |
| UX-02 | Admin affordance | **Medium** | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:146–148,732–737`, `wwwroot/js/admin-dashboard.js:906–946` | กระดิ่ง, ป้ายระบบปกติและคำค้น “สถิติ” สื่อความสามารถเกินที่มี | ตัดกระดิ่งและสถานะคงที่ เปลี่ยน label และลิงก์ผลค้น | S |
| DEV-01 | ดูแลโค้ด | **Medium** | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:1–1008`, `wwwroot/js/admin-dashboard.js:1–1066`, `Services/LearningStore.cs:56–159` | View/JS Admin ใหญ่ ฝัง charts/modals และ inline styles · อ่าน full state หลายครั้งภายใต้ lock และ revalidate cookie กับ SQL ทุก request | แยก partial/feature modules, ลดการประกอบ full state ที่ไม่ต้องใช้ วัด query/lock ก่อนปรับ | M |
| UX-03 | UI/Content | **Medium/Low** | [อ่านโค้ด] [หลักฐาน UX](audit/ux.md), [ตัวอย่างเนื้อหา](audit/content.md) | ลำดับ CTA คลุมเครือในฉากใหญ่ ศัพท์ Admin ไทย/อังกฤษปนกัน การให้เครดิตช่องด้วยป้ายผู้สอนเสี่ยงสื่อการรับรอง | ลด layer ตกแต่ง ติดป้ายเจ้าของเนื้อหาต้นทาง และทำคำศัพท์ชุดเดียว | M |

### ตรวจความปลอดภัยและข้อมูลบัญชี

- [อ่านโค้ด] Production ใช้ `UseExceptionHandler("/Home/Error")` และ Razor แสดง Request ID พร้อมคำอธิบาย Development Mode คงที่ หน้า Error โดยตรงตอบ 200 ในการ sweep และไม่มีการกระตุ้น exception เพื่อยืนยันภาพเมื่อเกิดปัญหาจริง `Program.cs:70–74`, `Views/Shared/Error.cshtml:1–23` [ผล HTTP](audit/runtime-results.json)
- [รันจริง] Guest Production และ Learner ถูกส่งไป Login/AccessDenied ที่ Admin endpoints ทั้ง 7 รายการ แต่ปุ่ม Login skip ไป Home โดยไม่มี auth cookie [ผล HTTP และ Chromium](audit/runtime-results.json) · [อ่านโค้ด] CSRF สำหรับ unsafe method เปิด globally และ Admin ยกเว้นห้าจุด `Program.cs:8–12`, `Controllers/AccountController.cs:241–302`
- [อ่านโค้ด] การอ่าน/เขียนความคืบหน้า ใบประกาศ โปรไฟล์ ใช้ `NameIdentifier` จาก principal/Preview · request model ผู้เรียนใช้ CourseId/LessonId ไม่มี AccountId เป้าหมายให้แก้ ตัวตรวจสิทธิ์ด่านและเฉลยอยู่ server · ไม่มี key ใน learner DTO มีเฉลยใน payload ของ Admin ที่ต้อง role Admin `Controllers/LearningController.cs:138–156`, `Controllers/AccountController.cs:143–208`, `Models/LearningModels.cs:56–67,76–97`, `Services/LearningCatalog.cs:88–93`
- [อ่านโค้ด] การให้ XP ใช้คะแนนที่ server คำนวณ, transaction และ key ของ completion · รันซ้ำหลังผ่านคืน XP 0 ตามโค้ด ตรวจแยกจากการยิงพร้อมกันและการสำรวจช่องโหว่ `Services/LearningStore.cs:56–71,326–389`, `Services/LearningSchema.cs:13–80`
- [อ่านโค้ด] SQL values ใช้ parameters · ชื่อตารางบัญชีเลือกจาก role ในโค้ด ไม่พบ EF raw SQL API · `Services/AccountStore.cs:20–34,49–112`, `Services/LearningStore.cs:40–53`
- [อ่านโค้ด] Auth กำหนด rate limit 20 ครั้งต่อนาทีต่อ IP และบัญชีมี lockout 15 นาทีหลังรหัสผิด 5 ครั้ง อีเมล normalize และ unique แยกตารางจึงมีอีเมลเดียวกันข้ามบทบาทได้ ยังไม่ได้สำรวจบัญชีจริง `Program.cs:53–68`, `Services/AccountStore.cs:82–112`, `Database/Setup.sql:8–36`
- [อ่านโค้ด] Cookie ตั้ง `HttpOnly`, `SameSite=Lax`, `Secure=Always` นอก Development, HTTPS redirect/HSTS มีใน pipeline · local HTTP ไม่ได้ออกใบ TLS และไม่ยืนยัน reverse proxy/CSP ของชุดส่ง `Program.cs:14–31,70–93` รายละเอียด secrets/SQL/schema/HTML ดู [ภาคผนวกความปลอดภัย](audit/security.md)

## 5. ความสม่ำเสมอและรายงาน AI Slop

คะแนน 0 = รบกวนงานน้อย, 5 = ข้อมูลหรือการโต้ตอบเสียหายจากความรก/ถ้อยคำ คะแนนเป็นการประเมินงานออกแบบจากองค์ประกอบจริง ความเป็นภาพที่สร้างด้วย AI ต้องมีหลักฐานที่มาแยกต่างหาก ตาราง rubric 10 ข้อ คอนทราสต์และภาพใหญ่สุดอยู่ใน [ภาคผนวก UX](audit/ux.md)

| หน้า | คะแนน /5 | สิ่งที่ชี้ได้และวิธีแก้ |
| --- | --- | --- |
| Home | 4 | [อ่านโค้ด] `.ow-scene` มีฉากเรือ พื้นหลังหลายชั้นและ `.hd-glass` · มี title ซ้อนกันตามสถานะ `Views/Home/Index.cshtml:12–37`, `Views/Home/_HomeLearningDashboard.cshtml:8–50` · ให้ CTA เด่นในจอแรกและหยุด motion ของกลุ่มตกแต่งที่อยู่นอกจอ |
| Courses | 2 | [รันจริง] [ภาพโหมดมืด](audit/screenshots/courses-dark.png) พบผลช่วงท้ายจอแรก · [อ่านโค้ด] หัวเรื่อง ภาพท่าเรือ chip และแผง Nimo นำก่อนผล `Views/Home/Courses.cshtml:11–51` · ให้ช่องค้นและผลเริ่มบน viewport เดียว จัดหมวดป้ายให้มี hierarchy |
| Details | 3 | [อ่านโค้ด] `.cj-route.cj-glass`, ป้ายใบรับรอง และวงแหวนแย่งความสนใจ CTA `Views/Home/Details.cshtml:54–78,154–177` · ให้ปุ่มเริ่มและรายการด่านใกล้กัน ลด glass |
| Island บนน้ำ | 4 | [อ่านโค้ด] เปลี่ยนคอร์สอยู่ในหัวข้อหลักและ chip ขวาไม่มีคำ “ต่อระดับ” ในข้อความเห็นได้ `Views/Learning/Island.cshtml:16–61` · ป้าย drop-down ชัด วาง KPI รองจากปุ่มเรียน |
| Island ใต้น้ำ | 4 | [รันจริง] [ภาพตำแหน่งล่าง](audit/screenshots/island-bottom.png) · [อ่านโค้ด] แผนที่มีฉากยาวก่อนถึงข้อมูลชุดถัดไป `Views/Learning/Island.cshtml:66–84` · ลดระยะและมีรายการด่านในจอเดียว |
| Practice | 2 | [อ่านโค้ด] `#practice-answered-count`, เกณฑ์ผ่าน และบทบาทคำใบ้มีประโยชน์ มาสคอตใหญ่และปุ่มออกแข่งขันกับเนื้อหา `Views/Learning/Practice.cshtml:18–64` · เก็บคำใบ้แบบเปิดเมื่อขอ |
| Login / Register | 3 | [อ่านโค้ด] badge/ภาพมาสคอต/คำอธิบายเทคนิคสลับภาษา `Views/Account/Login.cshtml:20–42,80–104`, `Views/Account/Register.cshtml:11–24,110–130` · ให้ฟอร์มมาก่อนข้อความประดับและเปลี่ยนคำข้าม |
| Learner Dashboard | 3 | [อ่านโค้ด] แผง glass หลายกลุ่มและสถิติซ้ำ Home/Island `Views/Account/Dashboard.cshtml:72–224` · นำ “เรียนต่อ” มาก่อนรางวัลและเปลี่ยนภารกิจเป็นหนึ่งแถว |
| Admin Overview | 5 | [อ่านโค้ด] KPI, กราฟ, ป้ายกิจกรรมจริง, Nimo, Recent Activity และ alert ต่างมีน้ำหนักสูง `Views/Account/AdminDashboard.cshtml:146–163,183–304` · เหลือข้อมูลที่ใช้ตัดสินใจและเปลี่ยนคำให้ตรงหน่วย |
| Admin Courses | 3 | [อ่านโค้ด] ตารางแน่น แต่สถานะแนะนำและเผยแพร่แยกไม่ได้ `Views/Account/AdminDashboard.cshtml:479–567` · ให้สถานะ Draft/Published/Archived และลดปุ่มแยกรายแถว |
| Admin Questions | 4 | [อ่านโค้ด] การ์ดแสดงโจทย์ เฉลย และคำใบ้ ตอกป้ายซ้ำในรายการขนาดใหญ่ `Views/Account/AdminDashboard.cshtml:578–659` · ใช้รายการแบ่งหน้ากับแผงแก้โจทย์ |
| Admin Learners | 2 | [อ่านโค้ด] ตารางอ่านได้แต่ `Account Directory` และป้าย admin ใหญ่เกินสำคัญ `Views/Account/AdminDashboard.cshtml:666–714` · วาง filter/จำนวนและใช้ศัพท์ไทยชุดเดียว |
| Admin Settings | 4 | [อ่านโค้ด] มีกล่องเหมือนแดชบอร์ด health แต่เป็นข้อความคงที่ `Views/Account/AdminDashboard.cshtml:719–744` · เหลือชื่อ บทบาท และออกจากระบบ |
| Dark mode | 3 | [อ่านโค้ด] สถานะร่วมแต่ override หลายชุดและข้อความทับสีจากภาพ `wwwroot/js/journey-theme.js:149–181`, `wwwroot/css/journey-theme.css` · วัด contrast ระดับ component และตั้งพื้นทึบให้ข้อความสำคัญ |

### ข้อมูล ตัวเลข และคุณภาพเนื้อหา

- [อ่านโค้ด] JSON ใน app มี **21 คอร์ส, 64 ด่าน, 176 ข้อ** ตามไฟล์และวิธีนับใน [รายงานเนื้อหา](audit/content.md) คอร์ส ID คือ 1 และ 101–120 มีรายการ retired 2–17 ในโค้ด `Services/CourseCatalog.cs:8–24` · ตัวเลขไม่ต่อเนื่องมีที่มาจากข้อมูลและกฎกำหนด ID
- [อ่านโค้ด] คำตอบ A/B/C/D มี 55/56/53/12 ตามลำดับ 122 ข้อมี 3 ตัวเลือก และ 54 ข้อมี 4 ตัวเลือก มี 24 ด่านวิดีโอ 4 ข้อและ 40 ด่านการอ่าน 2 ข้อ หลัง normalize ไม่พบ prompt ซ้ำตรงกัน ทุกข้อมี Explanation/Hint และ 80 ข้อไม่มี Coaching ส่วนเพิ่ม ตัวลวงหลายข้อสั้นและผิดชัดเมื่อเทียบกับเฉลย [สถิติ](audit/course-content-stats.json) และ [ตัวอย่างเนื้อหา](audit/content.md)
- [อ่านโค้ด] ชื่อช่อง/องค์กร เช่น BBC Learning English และ Nielsen Norman Group อยู่ใน metadata หลักสูตร และสื่อเป็น YouTube/ข้อความใน JSON · “ผู้สอน” ทำให้เจ้าของสื่อดูเป็นผู้สอนของระบบเอง ควรใช้ “สื่อจาก” พร้อมลิงก์และระบุใบจบออกโดย NextSkill ไม่ยืนยันความพร้อมเล่นวิดีโอภายนอกทุกตัว [รายละเอียดที่มาและระดับ](audit/content.md)
- [อ่านโค้ด] ตรวจภาพปก 21 ภาพที่เลือกใช้ · คำ “UX RESEARCH”/“GREETINGS” มาจากป้าย DOM ที่แก้ได้ใน `Models/CoursePagesViewModel.cs:91–119` และ `Views/Home/Courses.cshtml:59–65` เจอเอกสาร prompt สำหรับ asset หลายตัว ส่วนที่มาของภาพรายไฟล์ที่ไม่มีกระบวนการบันทึกยังยืนยันไม่ได้ [contact sheet](audit/course-covers-contact-sheet.jpg)
- [อ่านโค้ด] ยอดอ้างอิง 3 ผู้เรียน, 4 บัญชี, 129 คอร์ส, 33 ด่าน, 1,950 XP, 170 กิจกรรม ตรวจความหมายจริงจาก query: 129 อาจเป็นจำนวนคน×คอร์ส, 33×50 + 3×100 = 1,950, 129 + 33 + 4 สมัคร + 4 ล็อกอินล่าสุด = 170 ความสอดคล้องเชิงคณิตศาสตร์ไม่ยืนยันค่าในฐานจริง [ที่มาและข้อจำกัด](audit/content.md)

## 6. ถ้อยคำที่ควรแก้ก่อนส่ง

[อ่านโค้ด] ค้น source และเอกสารด้วย `rg -i -l` ทั้งแปดกลุ่ม ในกรอบที่ตัด `wwwroot/lib`, build output และ DB ออก ไม่พบชื่อบัญชี 4 ชื่อที่ผู้ใช้ระบุในไฟล์ที่ค้น พบรูปแบบอีเมลหรือ path ผู้ใช้ใน 14 ไฟล์ จำนวนนี้รวมคู่มือติดตั้งและตัวอย่าง ไม่ได้ใช้เป็นจำนวน PII จริง ไฟล์ผลค้นแสดงชื่อไฟล์ โดยเก็บอีเมลและค่าส่วนตัวออกจาก output [ผลการค้น](audit/word-scan.txt)

| คำ/รายการ | จุดที่พบ | เหตุผล / คำที่ใช้แทน |
| --- | --- | --- |
| “Use this page to detail your site's privacy policy.” / “Privacy Policy” | [อ่านโค้ด] `Views/Home/Privacy.cshtml:1–6` | ข้อความ scaffold ให้แทนด้วยนโยบายข้อมูลและ cookie ฉบับไทย |
| “Online & Active”, “LocalDB MSSQL”, “ระบบฐานข้อมูล LocalDB ทำงานปกติ” | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:732–737`, `wwwroot/js/admin-dashboard.js:933–937` | สัญญาณสุขภาพไม่มี probe และเผย stack ภายใน ตัดจาก Admin Profile และกระดิ่ง |
| “กิจกรรมจริง”, “คอร์สจริงในระบบ” | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:215,263–330`, `wwwroot/js/admin-dashboard.js:933–937` | ใช้ “เหตุการณ์ที่นับในช่วงนี้”, “คอร์สในคลัง” และแสดงกลุ่มข้อมูล |
| “last signed in”, “created a user account”, “created an admin account” | [อ่านโค้ด] `Services/AccountStore.cs:188–193` | ใช้ “เข้าสู่ระบบล่าสุด”, “สมัครบัญชีผู้เรียน”, “สร้างบัญชีผู้ดูแล” |
| “Account created successfully. Please log in.” / “Too many attempts…” | [อ่านโค้ด] `Controllers/AccountController.cs:56`, `Program.cs:63–67` | ใช้ข้อความไทยที่บอกวิธีดำเนินการ |
| “Full Admin Access”, “Admin / Owner”, “Quiz & Question Studio”, “Account Directory”, “Recent Activity” | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:45–112,430–475,578–585,666–673,719–741` | ใช้ “ผู้ดูแลระบบ”, “จัดการข้อสอบ”, “รายชื่อบัญชี”, “การสมัครและล็อกอินล่าสุด” · คำ owner ใช้เมื่อมีบทบาทแยกจริง |
| “ข้ามไปก่อน - เข้าสู่ระบบจากโปรแกรมเลย” | [รันจริง] [ภาพหน้า Login](audit/screenshots/login-dark.png) และคลิกไป Home โดยไม่มี cookie · [อ่านโค้ด] `Views/Account/Login.cshtml:95–98` | ลิงก์ข้ามเปลี่ยนเป็น “กลับหน้าแรก” |
| “ดูหน้าจริง” / “เกาะของฉัน” / “คอร์สของฉัน” | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:559–565`, `Views/Shared/_Navbar.cshtml`, `Views/Account/Dashboard.cshtml:97–130` | ใช้ “ดูรายละเอียดคอร์ส”, “แผนที่บทเรียน”, “คอร์สของฉัน” ตามปลายทาง |
| “โหมดทดลอง” / “ผู้เรียนทดลอง” | [อ่านโค้ด] `Views/Home/_HomeLearningDashboard.cshtml:30–48`, `Controllers/LearningController.cs:94` | ใช้ Production ในชุดส่ง ถ้าสาธิต Preview ให้บอกว่า “ผลทดลองบันทึกแยกจากบัญชีและเปิดได้จากเบราว์เซอร์นี้” |
| “ใบรับรอง” / “ใบประกาศ” | [อ่านโค้ด] `Views/Home/Details.cshtml:54–57`, `Views/Account/Dashboard.cshtml:153–179`, `Views/Account/Certificate.cshtml` | ทำชื่อเดียวว่า “ใบยืนยันการเรียนจบโดย NextSkill” |
| “ผู้สอน” สำหรับชื่อช่องหรือสำนัก | [อ่านโค้ด] `Views/Account/AdminDashboard.cshtml:527–553`, `Database/custom_courses.json` ใน app | ใช้ “เจ้าของสื่อต้นทาง” · กำกับผู้พัฒนาบทอ่านแยก |
| “SeaLearn”, “Niko”, “English for Business” | [อ่านโค้ด] `README-SEALEARN.md`, `Views/Shared/_SeaLearnHome.cshtml:104`, `Views/Shared/_NikoPractice.cshtml`, ชื่อ `wwwroot/js/niko-voyage.js` และ route/asset เก่า | ชื่อเก่าที่พบชัดใน source ให้เปลี่ยนตามการใช้งาน · ยังไม่มีหลักฐานว่าทุกคำปรากฏใน UI ปัจจุบัน |
| “Test 1”, “Test v1”, “อันดับและคะแนนเป็นข้อมูลตัวอย่าง” | [อ่านโค้ด] `Services/CourseCatalog.cs:8–24`, `Views/Courses/Enrollment.cshtml:111` | รายการประวัติและ dead view · ย้ายข้อความทดสอบออกจาก UI ที่ส่ง |
| “Codex”, “ChatGPT”, “OpenAI”, “GPT”, “prompt”, “AI generated” / “TODO”, “FIXME”, “dummy”, “mock” | [อ่านโค้ด] ค้นกลุ่มคำใน Views, JS, CSS, Controllers, Models, JSON, docs, scripts และชื่อไฟล์ · ตัวอย่าง `docs/learning-island-image-prompt.md`, `docs/cave-matte-image-prompts.md`, `skills/nextskill-mvc-theme/agents/openai.yaml` | แยกเอกสารสร้างภาพ/เครื่องมือจากเอกสารส่ง · “AI” ในชื่อคอร์สทักษะเป็นวิชา คงเมื่ออธิบายตรงกับเนื้อหา |
| “gay”, “gram22”, “Kadsan”, “fewfew” และอีเมลส่วนบุคคล | [อ่านโค้ด] ชื่อที่ผู้ใช้แจ้งและจุด render `Views/Account/AdminDashboard.cshtml:692–705`, `Views/Home/_HomeLearningDashboard.cshtml:17–22`, `Database/Setup.sql:1–47` ไม่มี seed บัญชี | ยืนยันค่าของฐานจริงไม่ได้ · เตรียมชื่อบัญชีเดโมสุภาพและอีเมลโดเมนตัวอย่าง ตรวจคำทักทายจากบัญชีที่จะเปิด |
| localhost / ชื่อเครื่อง / path ผู้ใช้ / secret | [อ่านโค้ด] `README-LOGIN.md:26–72`, `Properties/launchSettings.json`, `docs/home-ocean-art.md:29`, `docs/home-island-terrain.md:5`, `docs/HOME-OCEAN-WORLD.md:14`, `Services/AccountStore.cs:122–123` | ค่า dev ที่จำเป็นอยู่ในคู่มือติดตั้งได้ ใช้ path สัมพัทธ์ในเอกสาร ตัดรหัสหลักจากซอร์สและตรวจ history ที่เผยแพร่ไปแล้ว |
| “เรียนฟรีทุกหมวดหมู่” / “100%”, “อัจฉริยะ”, “เปลี่ยนชีวิต”, “รับประกันผล” | [อ่านโค้ด] “เรียนฟรีทุกหมวดหมู่” อยู่ใน Overview `Views/Account/AdminDashboard.cshtml:262` คำอื่นค้นใน source และข้อมูลคอร์ส | เปลี่ยนป้ายในกราฟเป็น “สัดส่วนคอร์สตามหมวด” ยังไม่พบหลักฐานว่าคำอื่นเป็นคำรับประกันบน UI ที่ตรวจ และคำ “AI” มีบริบทชื่อวิชา |
| “รูปแบบไฟล์ JSON ไม่ถูกต้อง: …” + exception string | [อ่านโค้ด] `Controllers/AccountController.cs:279–282` | แยกข้อความปลอดภัยจาก log ภายใน เช่น “ไฟล์ไม่ตรงรูปแบบที่กำหนด” |

## 7. ฟีเจอร์ที่ควรซ่อน พัก หรือตัดก่อนส่ง

- [อ่านโค้ด] **ตัดกระดิ่งจุดแดงและป้าย Online & Active/LocalDB MSSQL** ทั้งคู่เสนอข้อมูลที่ไม่มีสถานะจริง `wwwroot/js/admin-dashboard.js:933–937`, `Views/Account/AdminDashboard.cshtml:732–737`
- [อ่านโค้ด] **พักนำเข้า JSON ที่เปิดให้ใช้ทั่วไปใน Admin เดโม** จนตรวจ schema และมีผลลัพธ์ต่อรายการ `Controllers/AccountController.cs:261–282`
- [อ่านโค้ด] **พักปุ่มสร้างคอร์สแบบเผยแพร่ทันที** หากยังเพิ่มเนื้อหาด่านจาก UI ไม่ได้ เก็บตัวอย่างคอร์สที่เรียนได้สำหรับเดโม `Services/AdminContentStore.cs:76–119`
- [อ่านโค้ด] **ซ่อน Preview ในชุดส่ง และเก็บหน้าแรก Guest** ลดการปะปนสถิติและการเข้าใจว่าเข้าสู่ระบบแล้ว `Controllers/LearningController.cs:20–37`
- [อ่านโค้ด] **ลดกราฟอัตราจบด่านและ Activity log ที่อ้างเหตุการณ์ครบ** จนสูตร/หน้าที่ตรงกับข้อมูล `Models/AdminDashboardModel.cs:41–48`, `Services/AccountStore.cs:188–205`
- [อ่านโค้ด] **เก็บ Nimo เฉพาะจุดที่บอกทักษะหรือช่วยตอบ** ลดบทพูดประดับและการเคลื่อนไหวในหน้าค้น/จัดการ `Views/Home/Courses.cshtml:34–43`, `Views/Account/AdminDashboard.cshtml:159–165`
- [อ่านโค้ด] **พักลีก หน้า Enrollment และ view เก่าที่ไม่มี route** จัดเอกสารและ asset ตัวอย่างให้อยู่นอกชุดส่งหลังตรวจ reference `Controllers/CoursesController.cs:8`, `Views/Courses/Enrollment.cshtml:111`

## 8. สิ่งที่ยังยืนยันไม่ได้

- ชื่อบัญชี ประวัติเรียน อีเมลจริง และตัวเลข 3/4/33/129/1,950/170 จากฐานเดิม รันกับฐานสร้างใหม่ `NextSkill_Audit` เท่านั้น ค่าที่อาจารย์เห็นควรตรวจด้วยฐานเดโมที่อนุญาตและแยกข้อมูลสังเคราะห์
- โจทย์ต้นฉบับว่าปลดล็อกคอร์สถัดไปหรือกลุ่มเนื้อหาภายในคอร์ส จึงให้ประเมินตามข้อความที่แนบและเผยสมมติฐานใน Coverage Matrix
- วิดีโอ YouTube, URL ภายนอก, ต้นทางภาพที่บันทึกไม่ครบ และความถูกต้องของการอ้างเครดิตรายบท Browser ถูกบล็อกภายนอกเพื่อให้ตรงกติกา
- การหมดอายุ ticket 8 ชม., การค้างฟอร์มแล้วกลับจาก Back, การ submit พร้อมกันหลายคำขอ, การเปลี่ยนวันเวลาไทยจริง, และการเปิดสองเครื่องพร้อมกัน ยังไม่มีผลรันเฉพาะกรณี
- การยืนยันแนวทาง exploitation, secret ที่ใช้ได้จริง, การทำให้ IDOR/CSRF/XSS เกิดผล และการแทรก request เพื่อหลบสิทธิ์ ตรวจเชิงป้องกันจากโค้ดและตรวจ role/สถานะปกติใน localhost เท่านั้น
- ยังไม่ได้ทำ Lighthouse, การรับรอง WCAG AA ครบทุกหน้าที่ทุกขนาด, ตรวจ CPU เครื่องตามตัวเลขในภาพของผู้ใช้ หรือทดสอบกับ browser จริงที่ติดส่วนขยายและ GPU เหมือนเครื่องเดโม ผล CDP เป็นเวลางาน main thread ของแท็บในช่วงตัวอย่าง
- หัวข้อ PDPA ที่รายงานประเมินจากข้อมูลและคำอธิบายของแอป ไม่ได้วินิจฉัยการปฏิบัติตามกฎหมายภายนอก และไม่ทราบระยะเก็บข้อมูลที่ผู้ดูแลตั้งใจ

## 9. แผนแก้ไข

| ช่วง | งาน |
| --- | --- |
| **ต้องทำก่อนส่ง** | ปิดรหัส Admin ฝังและทบทวนบัญชี, ทำ Final Quiz ตามโจทย์, ทำคอร์สที่สร้างให้เผยแพร่ได้จริง, ปิดช่องว่าง CSRF/validation, จัดการ ID กับการลบและการเขียนที่ล้มเหลว, ทำแพ็กเกจและฐานเดโมใหม่ |
| **ควรทำ** | ปรับถ้อยคำและนโยบายความเป็นส่วนตัว, แยก Draft/Published, เปลี่ยน KPIs ให้ตรงหน่วย, ทำข้อสอบให้ตัวลวงสมดุล, ทำป้าย XP และใบจบให้ชัด, ไล่ keyboard/labels/contrast พร้อมธีม |
| **ถ้ามีเวลา** | ลดชั้นเอฟเฟกต์และน้ำหนักภาพ Local, แยก Admin partials, รวม design tokens, แก้เอกสารและชื่อมาสคอตเก่า และเพิ่มการตรวจ startup/timezone/การส่งซ้ำที่ใช้ DB แยก |

## 10. ภาคผนวกการตรวจ

### โครงสร้าง

| โฟลเดอร์ / ส่วน | หน้าที่และสภาพที่ตรวจพบ |
| --- | --- |
| `Controllers/` | Public, Account/Admin, Courses redirect, Learning ทั้งหน้าและ JSON ขอบเขตวิธี/สิทธิ์/ตารางอยู่ใน [รายการ route 41 แถว](audit/routes.md) |
| `Models/` | Form DTO, Entity record และ ViewModel อยู่ร่วมกัน เช่น `Models/AccountForms.cs`, `Models/CoursePagesViewModel.cs`, `Models/LearningModels.cs` · ไม่พบไดเรกทอรี `ViewModels/` แยก |
| `Views/` | Razor แยก Home, Account, Learning, Courses และ Shared partials · Enrollment เก่ามี view แต่ action redirect `Controllers/CoursesController.cs:5–8` |
| `Services/` | `AccountStore` และ `LearningStore` ใช้ SQL แบบ async · catalog, course/quiz CRUD ใช้ JSON และ in-process cache |
| `Database/`, `scripts/` | `Database/Setup.sql` สร้างบัญชีและ invitation, `scripts/LearningJourney.sql` มี DDL การเรียน และ `Services/LearningSchema.cs` สร้างหกตารางแบบ lazy ใน runtime · ไม่พบ `Data/` แบบ DbContext หรือ `Migrations/` ของ EF |
| `wwwroot/` | CSS/JS/assets ภาพและไลบรารีที่เสิร์ฟผ่าน `MapStaticAssets` · มีคู่ชื่อเก่าและไฟล์ décor ขนาดใหญ่ ดู [รายงาน UX](audit/ux.md) |
| `appsettings*.json`, `Program.cs` | default connection string, MVC filters, cookie, rate limiter, HTTPS, static assets และ routes `Program.cs:7–97` |
| `.gitignore`, docs, README | `.gitignore` กัน `bin/`, `obj/` และ `.vs` · คู่มือ login/install อยู่ย่อยและ README ระดับบนยังชื่อ SeaLearn · ไม่พบ ERD ประกอบจากรายการเอกสารและไฟล์ SQL ที่ตรวจ |

**ตาราง SQL 9 ตาราง** · [อ่านโค้ด] Users/Admins (PK Guid + unique NormalizedEmail ต่อตาราง), AdminInvitations (PK CodeHash), LearningProfiles (PK AccountId/Role), LearningCourseProgress (PK AccountId/Role/CourseId และ FK profile), LearningLessonCompletions, LearningLessonVideos และ LearningVideoWatchStarts (PK รวม course/lesson และ FK progress), LearningAchievements (PK AccountId/Role/AchievementKey และ FK profile) ทั้ง course และ lesson เป็น ID จาก JSON · ไม่มี FK จาก profile ไป Users/Admins และไม่มี ON DELETE CASCADE ใน DDL ที่ตรวจ รายละเอียด [PK/FK/index/defaults](audit/security.md)

[อ่านโค้ด] ไม่มี EF Core package ใน `NextSkill_205_247_261.csproj:1–13` · จึงไม่มี EF migration/model snapshot ให้วัด drift แยก การคง schema ใช้ `IF OBJECT_ID … IS NULL` ไม่ปรับคอลัมน์เก่าที่มีอยู่ ตรวจว่า DDL learning 6 บล็อกใน SQL และ runtime ตรงกันหลัง trim ตาม [ภาคผนวกความปลอดภัย](audit/security.md) ส่วน Setup.sql ไม่ insert ผู้ใช้ ค่า seed เนื้อหาโหลดจาก JSON จึงควรแยกจากบัญชีและการเชิญ

[อ่านโค้ด] GSAP ถูกอ้างจาก Layout การเรียนและ Admin และ jQuery validation มี entry ใน Shared partial จึงยังสรุปไม่ได้ว่าไลบรารีที่จัดส่งตัดออกได้ ตัวอย่างไฟล์ legacy ที่ยังหลงเหลือ เช่น `wwwroot/js/sealearn.js`, `wwwroot/css/sealearn.css` ไม่พบ Razor อ้างไฟล์ตรงจากการค้น ส่วน `_NikoPractice` มี reference จาก Enrollment view ที่ไม่ render ตาม route ปัจจุบัน `Views/Shared/_SmartJourneyLayout.cshtml:90`, `Views/Shared/_ValidationScriptsPartial.cshtml:1–2`, `Views/Account/AdminDashboard.cshtml:1009`, `Views/Courses/Enrollment.cshtml:114` รีโปมี 506 ไฟล์ที่ track และ Git objects แบบ loose 64.28 MiB กับแบบ pack 9.23 MiB จาก `git ls-files` และ `git count-objects -vH` ตัวเลข Git objects รวมประวัติด้วย

### คำสั่งและขอบเขต

| งาน | คำสั่ง/วิธี | หลักฐาน |
| --- | --- | --- |
| สำรวจและ guard | `git status --short --branch`, `git ls-files`, `rg --files`, `rg -n`, ค้นเอกสาร rubric | [สถานะท้ายงาน](audit/workspace-status.txt), [routes](audit/routes.md) |
| Restore / Build | คัดลอก inputs ไป `audit/.runtime/app` แล้ว `dotnet restore --source <NuGet cache ในเครื่อง> -p:NuGetAudit=false`, `dotnet build --no-restore --nologo` | [restore](audit/restore-isolated.log), [build](audit/build-isolated.log) · [ผลคำสั่ง] ผ่าน 0 warning, 0 error |
| EF | `dotnet ef migrations list --project NextSkill_205_247_261 --no-build` | [ผลคำสั่ง](audit/ef.log) ไม่พบ `dotnet-ef` · app ใช้ SqlClient |
| Publish | `dotnet publish --no-restore --nologo -c Debug -o <audit/.runtime/published>` และ `-c Release -o <audit/.runtime/release>` | [Debug](audit/publish.log), [Release](audit/publish-release.log) · [ผลคำสั่ง] ทั้งสองผ่าน Production ใน runtime suite ใช้ published Debug และ Release ถูกยืนยันถึงขั้น package |
| DB | `SqlLocalDB create NextSkill_Audit_20261123 17.0`, `SqlLocalDB start NextSkill_Audit_20261123`, `sqlcmd -S '(localdb)\NextSkill_Audit_20261123' -E -C -b -i <audit Setup.sql>` สองรอบ | [bootstrap](audit/localdb-setup.log) · SQL สร้างใหม่โดยแทนชื่อ `NextSkillAuth` เป็น `NextSkill_Audit` ในสำเนาชั่วคราว ตั้ง `ConnectionStrings__NextSkill` เฉพาะ process |
| Browser / HTTP | `node --check audit/runtime.cjs`, `audit/run-local.ps1` เปิด `127.0.0.1:52791` (Development) และ `127.0.0.1:52792` (Production) พร้อม route guard ของ Chromium และ proxy ปลายทาง local ปิด | [สคริปต์](audit/runtime.cjs), [ผล HTTP/Chromium](audit/runtime-results.json), [ยอด SQL](audit/audit-db-totals.txt) |
| วิเคราะห์เนื้อหา | `node audit/course-content-stats.cjs` | [สคริปต์](audit/course-content-stats.cjs), [JSON](audit/course-content-stats.json), [ภาพปก](audit/course-covers-contact-sheet.jpg) |

การย้ายตำแหน่งไปสำเนาใน temp แบบ sandbox ครั้งแรกล้มเหลวและคำสั่ง restore/build รันที่ workspace จึงมีการเขียนไฟล์ build ที่ Git ignore ไว้ใน `obj/` และพยายามเขียน `bin/` การคัดลอก DLL หลักถูก process เดิมล็อก ทำให้ขึ้น `MSB3026` 10 ครั้ง และ `MSB3027/MSB3021` จากนั้นแยก build ภายใต้ `audit/.runtime` โดยไม่มีการแก้ source ที่ผู้ใช้ติดตามหรือไฟล์ภาพที่มีอยู่ก่อน [หลักฐาน build ครั้งแรก](audit/build.log) และ [สถานะ Git](audit/workspace-status.txt)

การรัน DLL ที่ build แล้วด้วย environment Production ในรอบแรกทำให้บาง static assets ตอบ 404 พร้อมเตือน `StaticWebAssetsInvoker[17]` รอบยืนยันใช้ published output และแยกเป็นเหตุการณ์วิธีเปิดแอป ครอบคลุมทั้ง asset ในแอปและ URL ที่ตั้งใจตอบ 404 โดยใช้ผลรอบหลังเป็นหลัก Log Startup มีคำเตือนว่าไม่มีพอร์ต HTTPS ในชุดทดสอบ HTTP ที่ผูกกับ loopback ไม่ได้ใช้เพื่อสรุปการตั้ง TLS ของชุดส่ง [Development log](audit/app-52791.log) และ [Production log](audit/app-52792.log)

### ผล E2E และ responsive

**ผลยืนยัน [รันจริง]** · 35/35 checks ผ่านใน Chromium/HTTP รวมการถ่ายภาพหน้าเว็บ 15 ตัวอย่าง และทดสอบ HTTP sweep 46 คำขอเพิ่มเติม ภาคผนวกมี 41 แถวสำหรับ action/method หรือ alias แตกต่างกัน โดย 4 Auth POST อยู่ใน flow สมัครและล็อกอินแทนการ sweep ไร้ข้อมูล บัญชีที่มีและเส้นทางที่ไม่เปิดตามบทบาทมีผลต่างกัน [หลักฐาน runtime](audit/runtime-results.json)

| Journey | ผลและขอบเขตที่ยืนยัน |
| --- | --- |
| Guest · Home → Courses → Details → Login | [รันจริง] Root redirect ไป Home ค้นภาษาอังกฤษในหมวดเดียวกันพบ 5 รายการ ตรวจ empty state และ Details ID ไม่มีจริงตอบ 404 กดเริ่มคอร์สไป Login ใน Production และลิงก์ข้ามกลับ Home แบบ Guest |
| Register → Login → Profile | [รันจริง] ฟอร์มผิด/อีเมลซ้ำมี validation ฟอร์มถูกสร้างบัญชีและล็อกอินได้ Remember me มีอายุเหลือ 8 ชม. พร้อม HttpOnly/Lax ใน Development การเปลี่ยนอีเมลเมื่อไม่ให้รหัสปัจจุบันถูกปฏิเสธ คำขออัปเดตที่มีรหัสและอีเมลใหม่ตอบ redirect และชื่อไทยที่มี ฿ กับ & ปรากฏในหน้าโปรไฟล์ |
| Enroll → Lesson Quiz → Reward | [รันจริง] เริ่ม #101 ผ่านปุ่มบนหน้า Details และเปิดด่านแรกใน SQL ใช้ HTTP ตาม workflow การเรียนและตัวเลือก Skip วิดีโอที่ระบบมี ด่านแรกตอบไม่ผ่านได้ 0 XP และด่านที่สองยังล็อก จากนั้นผ่านสามด่าน ได้ 50/50/150 XP การส่งคำตอบด่านเดิมรอบทบทวนได้ XP เพิ่ม 0 เปิดหน้าใบประกาศในเบราว์เซอร์เห็นชื่อบัญชีทดสอบ |
| Edge cases | [รันจริง] Login skip, cookie, ตัวกรองไม่พบข้อมูล, Details 404, แสดง Dashboard ผู้ใช้ใหม่, สัญลักษณ์พิเศษในชื่อ, Island เลื่อนลง 717 px และ reload ได้, หลัง logout Dashboard ส่งไป Login ตรวจ refresh ระหว่างทำข้อสอบและ expiry จริงยังไม่ครบ |
| Admin | [รันจริง] ใช้รหัสเชิญครั้งเดียวที่สร้างจากสคริปต์ใน DB ทดลอง เปิดสี่แท็บ กด Ctrl+K แล้ว focus ช่องค้น และช่วงกราฟมี 3/6/12 แท่ง กระดิ่งเปิด alert สรุปพร้อมข้อความบอกว่า DB ปกติแบบคงที่ CRUD คอร์สและ Quiz Studio ผ่าน HTTP คอร์ส #121 ที่สร้างไม่สามารถเริ่มเรียนได้ และหลังลบ Details ตอบ 404 ทดสอบไฟล์นำเข้าได้ 1 รายการและ JSON ผิดตอบ 400 |
| Authorization | [รันจริง] Guest ใน Production และ Learner ที่ล็อกอินใน Development ถูกปฏิเสธที่ Admin 7/7 ต่อกลุ่ม เกิด 302 ไป Login หรือ AccessDenied ตามบทบาท ตามลำดับ Production Guest GET Learning State/Lesson ได้ 401 และ Island/Practice redirect 302 ส่วน Learning POST ที่ไม่มี antiforgery token ตอบ 400 ก่อน action filter |
| HTTP และ asset | [รันจริง] Sweep ได้ 200×12, 302×24, 400×6, 401×2, 403×1, 404×1 และ 500×0 หน้า Error โดยตรงตอบ 200 ส่วนหน้า AccessDenied ตอบ 403 ไม่พบ asset local สถานะผิดหรือ `pageerror` ในชุดที่บันทึก และมีการปิดกั้นคำขอที่อาจออกไป Google Fonts 3 ครั้ง ตัวเก็บ console ไม่รวมข้อความเครือข่ายทั่วไปที่ตั้งใจ block |
| SQL ที่ทิ้งไว้ | [รันจริง] ยอดจากการรันสองรอบรวมบัญชีผู้เรียน 2, Admin 2, Preview profiles 2, progress 2 แถว, ผ่านด่าน 3 ครั้ง รวม 250 XP และใช้ invitation 2 รายการ เป็นฐานใหม่จากสคีมาและข้อมูลสังเคราะห์ งานนี้ไม่ได้คัดข้อมูลจากฐานเดิม [ผล SQL](audit/audit-db-totals.txt) |

**หน้าจอและประสิทธิภาพ [รันจริง]** · Home และ Island ที่ 360/768/1280/1920 px ไม่มี document-width overflow ความสูง Home 3,114/3,014/3,327/3,327 px และ Island 1,475/1,527/1,617/1,620 px ตามลำดับ ตรวจภาพ dark ใน Home, Courses, Details ที่ 1280 และ Login ที่ 360 ส่วน Admin 1280 พบไม่มี `h1` ที่แสดง ช่องค้น global ไม่มี label ที่ตัวตรวจนับได้ และมีตารางเลื่อนภายใน [ตัวอย่าง viewport](audit/runtime-results.json) และ [รายละเอียด accessibility](audit/ux.md)

[รันจริง] โปรไฟล์เสริมผ่าน **10/10 ตัวอย่าง** บน Development วัด `TaskDuration` จาก CDP delta ช่วงละประมาณ 1.8 วินาที ที่ 1280 px Home ปกติใช้ main-thread 1.200 วินาที idle และ 1.440 วินาทีตอนเลื่อน เทียบกับ 0.064 และ 0.257 วินาทีเมื่อเปิด reduced motion ระหว่างเลื่อน layout count ลดจาก 237 เหลือ 1 ครั้ง Island ปกติวัด 0.027 วินาที idle และ 0.310 วินาทีตอนเลื่อน ส่วน reduced motion 0.001 และ 0.516 วินาที ตัวอย่างนี้มีหนึ่งรอบต่อเงื่อนไข และไม่ใช่การวัด CPU ทั้งเครื่องหรือ GPU สาเหตุรายเลเยอร์ยังยืนยันจากข้อมูลชุดนี้ไม่ได้ [ผลการวัด](audit/ux-profile.json) และ [สคริปต์](audit/ux-profile.cjs)

### ไฟล์ทดสอบและข้อมูลที่เหลือ

- [routes.md](audit/routes.md), [security.md](audit/security.md), [content.md](audit/content.md), [ux.md](audit/ux.md) เป็นรายละเอียดประกอบข้อสรุป
- [run-local.ps1](audit/run-local.ps1) กับ [runtime.cjs](audit/runtime.cjs) ใช้ SQL แยกและบัญชีสังเคราะห์ ไม่บันทึกค่ารหัสผ่านหรือรหัสเชิญไว้ในรายงาน
- `audit/screenshots/` เป็นภาพจาก localhost ที่รันด้วยชุดทดสอบ [ตัวอย่าง Overview](audit/screenshots/admin-overview.png), [Home บนมือถือ](audit/screenshots/home-360.png), [Island](audit/screenshots/island-1280.png)
- เก็บ LocalDB instance และฐาน `NextSkill_Audit` สำหรับตรวจซ้ำ ไม่แตะฐานเดิม ปิดแอป localhost และลบ build scratch `audit/.runtime` เมื่อจบ การตรวจซ้ำใช้สำเนาโปรเจกต์ที่ไม่รวม `bin/obj` ใน `audit/.runtime/app` ทำ restore/build จาก package cache ตามตารางและ publish Debug ไป `audit/.runtime/published` ก่อนเรียก runner ชุดนี้ใช้ Chrome และ `playwright-core` ที่มีอยู่ใน `artifacts/home-hero-qa/node_modules` ในเครื่อง

