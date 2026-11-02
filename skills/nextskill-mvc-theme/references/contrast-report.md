# Contrast ของ NextSkill tokens

วัดวันที่ 1 พฤศจิกายน 2026 ด้วย `scripts/check_contrast.py` ที่รวมในแพ็ก ใช้สูตร WCAG relative luminance สำหรับ opaque sRGB ไม่ใช่การประมาณจากภาพ screenshot และไม่ใช่ผลตรวจ computed styles ทุกหน้าของเว็บ

เกณฑ์ข้อความปกติ AA อย่างน้อย 4.5:1; ข้อความใหญ่ตามนิยาม WCAG อย่างน้อย 3:1 และต้องไม่ปัดค่าต่ำกว่าเกณฑ์ขึ้นให้ผ่าน ดู [W3C: Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

| Foreground | Background | Ratio | ข้อความปกติ AA |
|---|---|---|---|
| muted `#577b91` | canvas `#e2f6ff` | 4.0583:1 | ไม่ผ่าน |
| muted `#577b91` | white `#ffffff` | 4.5188:1 | ผ่าน ระยะเผื่อน้อย |
| primary `#087faa` | canvas `#e2f6ff` | 4.0765:1 | ไม่ผ่าน |
| primary `#087faa` | white `#ffffff` | 4.5390:1 | ผ่าน ระยะเผื่อน้อย |
| white `#ffffff` | primary `#087faa` | 4.5390:1 | ผ่าน ระยะเผื่อน้อย |
| primary-hover `#086189` | canvas `#e2f6ff` | 6.1206:1 | ผ่าน |

ตัวเลขแสดง 4 ตำแหน่งเพื่ออ่านง่าย script เปรียบเทียบกับ 4.5 ก่อนปัดค่า

## วิธีใช้สีที่แก้ไขแล้วใน Skill

- `--ns-muted` ใช้ข้อความรองบน surface ขาวทึบ ห้ามใช้เป็นข้อความปกติบน canvas โดยอัตโนมัติ
- บน canvas ใช้ `--ns-ink` สำหรับข้อความ และ `--ns-primary-hover` สำหรับลิงก์ พร้อม underline/รูปแบบลิงก์ที่เหมาะสม
- `--ns-primary` คงเป็นพื้นปุ่มที่มีข้อความขาวได้ ไม่ใช้เป็นข้อความปกติบน canvas
- Glass, opacity, ภาพฉาก และ gradient ต้องตรวจสี composited จริง ไม่ใช้ผล opaque pair ข้างบนแทน
- รอบนี้แก้กติกาใน Skill ไม่ได้แก้ CSS ของแอปจริง จึงไม่ใช่คำรับรองว่าจุดที่ใช้คู่สีไม่ผ่านในเว็บถูกแก้ครบแล้ว

## รันวัดซ้ำ

จากโฟลเดอร์ Skill ใช้ Python 3 โดยไม่ต้องติดตั้ง package:

```powershell
python scripts/check_contrast.py
python scripts/check_contrast.py '#086189' '#e2f6ff'
```

ชื่อคำสั่ง Python อาจเป็น `python3` หรือ `py -3` ตามเครื่อง script รองรับ hex 6 หลักทึบเท่านั้น และไม่ได้ตรวจขนาด/น้ำหนักฟอนต์, focus ring, disabled exceptions, สีหลัง alpha compositing หรือ accessibility ทั้งหน้า
