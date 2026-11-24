# NextSkill design system

อ่านเมื่อต้องตั้งธีมในโปรเจกต์ใหม่ เพิ่ม component หรือปรับรายละเอียด typography, สีสถานะ, responsive และ motion

## แหล่งอ้างอิงและสถานะ

บันทึกจาก working tree ของ NextSkill วันที่ 31 ตุลาคม 2026 ไม่ใช่คำยืนยันว่าทุกสาขาหรือทุกสำเนามีไฟล์ชุดเดียวกัน หลักฐานคือ `wwwroot/css/nextskill-tokens.css`, `nextskill-components.css`, `site-shell.css`, `course-pages.css`, `lesson-experience.css` และ active `_SmartJourneyLayout.cshtml`

หาก source ใหม่ต่างจาก snapshot ให้ตรวจว่าเป็นการปรับ shared theme โดยตั้งใจหรือเป็น legacy override ก่อนแก้ ใช้ route/layout ที่โหลดจริงเป็นหลัก ไม่ย้อนแก้ตามเอกสารเก่าโดยอัตโนมัติ

ปรับเอกสารเพิ่มเติมวันที่ 1 พฤศจิกายน 2026 โดยไม่เปลี่ยนค่า tokens ของ source ภาพบันทึกเดิมและ Nimo PNG รวมอยู่ในแพ็กแล้ว ดู [visual references และที่มา](visual-references.md) ภาพไม่ใช่ผลทดสอบ live รอบนี้และไม่ใช้แทนกฎ contrast

## Token contract

ถ้ามีไฟล์กลางอยู่แล้ว ให้ reuse และแก้จุดกลางตามคำขอ หากยังไม่มี ใช้ชุดนี้เริ่มต้นใน `wwwroot/css/nextskill-tokens.css`:

```css
:root {
  --ns-ink: #173e56;
  --ns-muted: #577b91;
  --ns-canvas: #e2f6ff;
  --ns-surface: #ffffff;
  --ns-border: #c9e3ef;
  --ns-primary: #087faa;
  --ns-primary-hover: #086189;
  --ns-success: #176a52;
  --ns-success-surface: #eaf8f0;
  --ns-danger: #aa3041;
  --ns-danger-surface: #fff0f2;
  --ns-warning: #795914;
  --ns-warning-surface: #fff6d8;
  --ns-radius-control: 14px;
  --ns-radius-surface: 20px;
  --ns-space-1: 4px;
  --ns-space-2: 8px;
  --ns-space-3: 12px;
  --ns-space-4: 16px;
  --ns-space-6: 24px;
  --ns-space-8: 32px;
  --ns-space-12: 48px;
  --ns-font: Prompt, 'Leelawadee UI', system-ui, sans-serif;
  --ns-font-number: Manrope, Prompt, sans-serif;
  --ns-ease-out: cubic-bezier(.23, 1, .32, 1);
  --ns-ease-in-out: cubic-bezier(.77, 0, .175, 1);
  --ns-ease-drawer: cubic-bezier(.32, .72, 0, 1);
  --ns-shadow: 0 12px 32px #173e560d;
}
```

สีฉากเช่นน้ำ แสง ทราย ต้นไม้ และสีเสื้อผ้าไม่ได้ต้องอ้าง semantic UI tokens ทุกจุด แยกสีเหล่านี้ด้วย scope ของฉาก เพื่อไม่ให้ปรับทะเลแล้วปุ่ม error หรือ success เปลี่ยนความหมาย

**ข้อจำกัดของ tokens เดิม:** muted บน canvas ได้ 4.0583:1 และ primary บน canvas ได้ 4.0765:1 ใช้ ink สำหรับข้อความบน canvas และ primary-hover สำหรับลิงก์ (6.1206:1) สีขาวบน primary ได้ 4.5390:1 และ muted บนขาวได้ 4.5188:1 ซึ่งผ่านเกณฑ์ข้อความปกติด้วยระยะเผื่อน้อย วัดสีหลังผสมพื้นจริง ดู [รายงานและ script](contrast-report.md)

## Liquid Glass

- ใน NextSkill ตรวจว่า layout โหลด `wwwroot/css/glass.css` แล้วใช้ `--ns-liquid-panel-bg`, `--ns-liquid-panel-edge`, `--ns-liquid-panel-shadow`, `--ns-liquid-filter` และพื้นสำรอง `--ns-liquid-panel-solid` ตามโหมดสี ใช้ blur และแสงสะท้อนบางบนผิวของแผง
- ให้เนื้อหาที่สัมพันธ์กันแชร์พื้นผิว เช่น สถิติคอร์สในแถบเดียวคั่นด้วยเส้นบาง ป้ายสถานะใช้สีอ่อนคู่กับข้อความและไอคอนที่สื่อความหมาย หลีกเลี่ยงกระจกซ้อนและพื้นขาวรายชิ้นที่ทำให้สายตาต้องไล่อ่านหลายแผง
- ตรวจความชัดของข้อความบนส่วนที่สว่างและมืดที่สุดหลังผสมกับภาพหรือสีพื้น ใช้ค่าทึบตามธีมเมื่อเบราว์เซอร์ไม่มี blur หรือผู้ใช้เลือกลดความโปร่งใสหรือเพิ่มคอนทราสต์

## Typography

- Repo เดิมมี `wwwroot/fonts/Prompt-Regular.ttf`, `Prompt-Medium.ttf`, `Prompt-SemiBold.ttf`, `manrope-600.ttf`; `@font-face` ใช้ `font-display: swap`
- โปรเจกต์เพื่อนต้องใช้ path ฟอนต์ที่มีจริง ไม่อ้างไฟล์จากเครื่องผู้สร้าง ถ้าไม่มีฟอนต์ ให้ใช้ fallback ชั่วคราวและแจ้งว่ายังไม่ได้บรรจุ Prompt/Manrope ห้ามเพิ่ม `@font-face` ที่ชี้ไฟล์ไม่มีอยู่
- Body ยาว/บทเรียน `16px / 1.8`; input/select `16px / 1.6`; label `14px / 1.6`; secondary text โดยทั่วไป 14px; badge สั้น `12px / 1.6`
- Course hero เดิมใช้ `clamp(28px, 4vw, 44px)` และ line-height 1.5; hero ฉากใช้ขนาดเฉพาะหน้า ไม่บังคับหน้าบัญชีหรือ Admin ให้มีหัวข้อใหญ่เท่าหน้า Home
- ใช้น้ำหนัก 400/500/600 ที่มีจริง อย่าใช้ letter spacing แน่นกับข้อความไทยหรือจัด line-height จนวรรณยุกต์ถูกตัด ตัดบรรทัดตามเนื้อหาได้ ไม่ hardcode `<br>` ทุกหน้าจอ

## Component behavior

| Component | รายละเอียดที่ตรวจพบ |
|---|---|
| `.ns-button` | inline-flex, gap 10px, padding 11px 20px, font 500 14px/1.5, border 1px, radius 14px |
| primary | พื้น primary, ข้อความขาว, เงาฐาน `0 3px 0 #07526e`, min-height 52px |
| secondary | พื้น `#f6fcff`, ข้อความ primary-hover |
| text | พื้น/ขอบโปร่งใส, ข้อความ primary-hover |
| danger | ใช้ danger-surface กับข้อความ danger สำหรับ destructive action ตามบริบท |
| compact/icon | min-height 44px; icon กว้าง 44px; compact text 13px |
| focus | outline 3px สี primary-hover และ offset 4px สำหรับปุ่ม |
| `.ns-field` | gap 8px; input/select padding 10px 14px, radius 12px, min-height 48px |
| `.ns-surface` | surface, border, radius-surface, shadow จาก tokens |
| `.ns-status` | padding 14px 18px, radius 12px, font 14px/1.8; มี error/success variants |
| `.ns-badge` | padding 5px 10px, radius 9px; upcoming ใช้ warning surface |
| `.ns-button-row` | gap 12px, align center, wrap ได้ |

`nextskill-components.css` เดิมรองรับ input/select ภายใต้ `.ns-field` หากเพิ่ม textarea ให้ขยาย component โดยตั้ง min-height ที่เหมาะกับข้อความหลายบรรทัด ไม่สมมติว่า style เดิมครอบคลุมแล้ว

เมื่อต้อง pending ให้มีข้อความ/สถานะที่มองเห็นได้ ป้องกัน submit ซ้ำตาม flow และใช้ `aria-busy` ตามเหมาะสม `aria-busy` เพียงอย่างเดียวไม่ได้แสดง spinner หรือข้อความให้ผู้ใช้เห็น

## Page composition

- Shell ปกติ: header, navigation, main, footer ใช้ container `min(1320px, 90%)`; footer ไม่ทับฟอร์มหรือปุ่มท้ายหน้า
- Catalog: eyebrow/หัวข้อ/คำอธิบาย → filter/search → visible status → grid → pagination/empty state; grid 3 คอลัมน์ ลดเป็น 2 ที่ 1000px และ 1 ที่ 700px
- Course detail: ชื่อและคำอธิบายคอร์ส → ข้อมูลการเรียน/บทเรียน → action ที่ตรงสถานะจริง ไม่ทำ CTA หลักหลายปุ่มแข่งกัน
- Forms/account: พื้นสงบ ขาว/ฟ้าอ่อน label และ validation อ่านง่าย ไม่โหลดฉากหรือการเดินทางเพียงเพื่อใช้สีธีมเดียวกัน
- Learning: ข้อความอ่านและตัวเลือก quiz 16px/1.8, ตัวเลือกสูงอย่างน้อย 52px; dialog บทเรียนเดิมจำกัดความกว้าง 820px แต่ต้องย่อได้บนมือถือ
- Admin: ใช้ tokens เดียวกันและ compact variant ได้ รักษาความชัดของตาราง/ฟอร์ม ไม่บังคับเติมเกาะหรือมาสคอตในทุก panel

คำศัพท์ร่วม: **เริ่มเรียน / เรียนต่อ / ทบทวน / ผ่านแล้ว / ยังไม่ปลดล็อก / เร็ว ๆ นี้** เลือกตามสถานะ server; ระบบขัดข้องให้แจ้งไม่พร้อมและ retry ไม่แสดง 0% ราวกับเป็นผลเรียนจริง

## Motion contract

- ปุ่มเดิมใช้ transition 160ms กับ `--ns-ease-out`; pressed เลื่อนลง 2px เฉพาะเมื่อไม่ disabled ตาม interaction ที่ออกแบบ
- Hover เฉพาะอุปกรณ์ `(hover: hover) and (pointer: fine)` ไม่ฝากข้อมูลสำคัญไว้กับ hover
- Reduced motion: ตัด positional feedback/ambient travel ที่ไม่จำเป็น ให้ state เปลี่ยนและ action ทำงานได้ทันที
- ฉาก Home ใช้ GSAP/ScrollTrigger ที่มีใน repo และ static fallback; ไม่บังคับ animation runtime ในหน้าฟอร์ม
- ใช้ controller/lifecycle เดิมเมื่อมี หลีกเลี่ยงหลายระบบเขียน `transform` บน element เดียว แยก wrapper ตามหน้าที่
- เก็บเสียงไว้ให้ผู้ใช้สั่งเอง หลีกเลี่ยง ambient event ทับข้อความหรือรบกวนระหว่างอ่าน/ตอบคำถาม

ใน NextSkill ให้ดู `wwwroot/js/motion-state.js` ก่อน subscribe สถานะ ใช้ `window.NextSkillMotion` ร่วมกับสถานะ scene/dialog ตาม module เดิม ฟังก์ชันที่มีใน snapshot: `snapshot`, `subscribe`, `setPaused`, `togglePaused`, `refresh`, `visible`; อ่าน signature จริงก่อนเรียก
