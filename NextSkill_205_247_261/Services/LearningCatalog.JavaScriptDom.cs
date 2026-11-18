using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

public static partial class LearningCatalog
{
    public const int JavaScriptDomCourseId = 16;

    private static LearningCourseDefinition CreateJavaScriptDomCourse() => new(
        JavaScriptDomCourseId, "JavaScript สำหรับหน้าเว็บ", "Technology",
        "ต่อ JavaScript เข้ากับ HTML เพิ่มเนื้อหาลงใน DOM และควบคุมหน้าตาด้วยคลาส CSS ผ่านคลิปสั้น 3 บท",
        "javascript",
        [
            new(1, "เชื่อม JavaScript เข้ากับ HTML", "เกาะสคริปต์",
                "เริ่มจากทำให้เบราว์เซอร์รู้ว่าจะอ่านโค้ด JavaScript จากตรงไหน แล้วตรวจว่าคำสั่งทำงานได้จริง",
                [
                    R("สิ่งที่ควรสังเกตในคลิป", "ดูตัวอย่างการเขียน JavaScript ภายใน HTML และการย้ายโค้ดไปอยู่ในไฟล์ .js แยก"),
                    R("สรุปและตัวอย่าง", "แท็ก script ครอบโค้ดที่เขียนใน HTML ได้ ส่วน src ใช้ชี้ไปยังไฟล์สคริปต์ภายนอก วางแท็กไว้ท้าย body เมื่อสคริปต์ต้องใช้องค์ประกอบที่ประกาศก่อนหน้า เปิด Console เพื่อดูข้อความหรือข้อผิดพลาด",
                        "<!-- ท้าย body ของ index.html -->\n<script src=\"app.js\"></script>\n\n// app.js\nconsole.log('พร้อมใช้งาน');")
                ],
                [
                    Q(1, "แอตทริบิวต์ใดบอกตำแหน่งไฟล์ JavaScript ในแท็ก script?", 1,
                        "src ชี้ไปที่ไฟล์ .js ที่เบราว์เซอร์ต้องโหลด", "href", "src", "id", "class"),
                    Q(2, "คำสั่งใดเหมาะกับการตรวจว่าสคริปต์เริ่มทำงานแล้ว?", 2,
                        "console.log ส่งข้อความไปที่ Console ของเครื่องมือสำหรับนักพัฒนา", "document.title", "Math.round()", "console.log()", "classList.add()"),
                    Q(3, "ถ้าสคริปต์ต้องเลือกปุ่มที่เขียนไว้ใน body ควรวางแท็ก script ที่ไหนในตัวอย่างนี้?", 3,
                        "สคริปต์ท้าย body จะเริ่มหลังจากเบราว์เซอร์อ่านปุ่มที่อยู่ก่อนหน้าแล้ว", "ก่อน doctype", "ในแอตทริบิวต์ class", "ในแท็ก title", "ท้าย body หลังปุ่ม"),
                    Q(4, "เหตุผลที่แยก JavaScript เป็นไฟล์ app.js คืออะไร?", 0,
                        "ไฟล์สคริปต์แยกช่วยจัดระเบียบและให้หลายหน้าอ้างถึงไฟล์เดียวกันได้", "จัดโค้ดให้ดูแลง่ายและใช้ซ้ำได้", "เปลี่ยน JavaScript ให้เป็น CSS", "ซ่อนโค้ดจากเบราว์เซอร์", "ทำให้ HTML โหลดโดยไม่ต้องอ่านไฟล์")
                ], 9, Video: new("hS2vw0qVt0c", 482)),
            new(2, "เพิ่มข้อความและองค์ประกอบใน DOM", "เกาะจัดวางเนื้อหา",
                "ฝึกเพิ่มข้อความหรือองค์ประกอบรอบตำแหน่งที่เลือก เช่น ใส่ข้อความแจ้งเตือนในกล่องเดิมโดยเก็บเนื้อหาที่มีอยู่",
                [
                    R("สิ่งที่ควรสังเกตในคลิป", "เทียบ insertAdjacentHTML, insertAdjacentElement และ insertAdjacentText ว่ารับข้อมูลชนิดใด และตำแหน่งที่เพิ่มอยู่ด้านในหรือด้านนอกองค์ประกอบ"),
                    R("สรุปและตัวอย่าง", "ใช้ beforebegin และ afterend เพื่อแทรกด้านนอก ใช้ afterbegin และ beforeend เพื่อแทรกด้านใน ถ้าข้อความมาจากผู้ใช้ให้ใช้ insertAdjacentText เพื่อแสดงเป็นข้อความธรรมดา",
                        "const panel = document.querySelector('#panel');\npanel.insertAdjacentText('beforeend', 'เพิ่มรายการแล้ว');")
                ],
                [
                    Q(1, "เมธอดใดจะแสดง <b> เป็นข้อความตามตัวอักษร?", 1,
                        "insertAdjacentText แทรกข้อความธรรมดา เบราว์เซอร์จึงแสดงเครื่องหมายแท็กตามตัวอักษร", "insertAdjacentHTML", "insertAdjacentText", "insertAdjacentElement", "querySelector"),
                    Q(2, "ตำแหน่งใดเพิ่มเนื้อหาเป็นรายการสุดท้ายด้านในองค์ประกอบ?", 3,
                        "beforeend อยู่ด้านใน ติดก่อนแท็กปิดขององค์ประกอบ", "beforebegin", "afterbegin", "afterend", "beforeend"),
                    Q(3, "เมื่อต้องการแทรกปุ่มที่สร้างด้วย document.createElement ควรใช้เมธอดใด?", 0,
                        "insertAdjacentElement รับ DOM Element ที่สร้างไว้แล้วโดยตรง", "insertAdjacentElement", "insertAdjacentText", "classList.toggle", "getAttribute"),
                    Q(4, "ถ้าแทรกป้ายด้วย afterend ป้ายใหม่จะอยู่ตรงไหน?", 2,
                        "afterend แทรกด้านนอก ต่อจากองค์ประกอบเป้าหมายในระดับเดียวกัน", "ด้านในเป็นรายการแรก", "ด้านในเป็นรายการสุดท้าย", "ด้านนอกต่อจากองค์ประกอบ", "ด้านนอกก่อนองค์ประกอบ")
                ], 7, Video: new("zFU2kQJZO5k", 384)),
            new(3, "เปลี่ยนคลาส CSS ด้วย JavaScript", "เกาะสถานะหน้าจอ",
                "เปลี่ยนสถานะของกล่องในหน้าเว็บด้วยคลาส CSS เช่น เปิดและปิดการแสดงผล แล้วตรวจได้ว่าตอนนี้เปิดอยู่หรือเปล่า",
                [
                    R("สิ่งที่ควรสังเกตในคลิป", "ดูความต่างระหว่างการกำหนด className ทั้งค่า กับการใช้ classList จัดการคลาสเป็นรายตัว"),
                    R("สรุปและตัวอย่าง", "add เพิ่มคลาส remove เอาคลาสออก toggle สลับว่ามีคลาสอยู่หรือไม่ และ contains ใช้ตรวจสอบสถานะ การใช้ classList ช่วยเก็บคลาสตัวอื่นที่มีอยู่",
                        "const panel = document.querySelector('#panel');\npanel.classList.toggle('is-open');\nconsole.log(panel.classList.contains('is-open'));")
                ],
                [
                    Q(1, "เมธอดใดใช้เปิดหรือปิดคลาส is-open ด้วยคำสั่งเดียว?", 2,
                        "toggle เพิ่มคลาสเมื่อยังไม่มี และเอาคลาสออกเมื่อมีอยู่แล้ว", "contains", "add", "toggle", "item"),
                    Q(2, "ถ้า card มีคลาส card shadow แล้วกำหนด card.className = 'selected' จะเหลือคลาสใด?", 1,
                        "การกำหนด className จะแทนค่าข้อความคลาสทั้งหมดด้วยค่าใหม่", "card shadow selected", "selected", "card selected", "shadow"),
                    Q(3, "ถ้าต้องการเพิ่ม selected โดยเก็บคลาส card และ shadow ไว้ ใช้คำสั่งใด?", 0,
                        "classList.add จัดการเฉพาะชื่อคลาสที่ระบุ คลาสเดิมจึงยังอยู่", "card.classList.add('selected')", "card.className = 'selected'", "card.classList.remove('selected')", "card.classList.contains('selected')"),
                    Q(4, "ข้อใดคืนค่า true หรือ false ว่า card มีคลาส selected อยู่หรือไม่?", 3,
                        "contains ตรวจว่าชื่อคลาสอยู่ในรายการหรือไม่และคืนค่าแบบบูลีน", "card.classList.add('selected')", "card.classList.remove('selected')", "card.classList.item(0)", "card.classList.contains('selected')")
                ], 10, Video: new("_YQyVnPI_Og", 590))
        ]);
}
