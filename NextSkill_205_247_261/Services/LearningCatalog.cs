using NextSkill_205_247_261.Models;

namespace NextSkill_205_247_261.Services;

// Assessment keys stay server-side; the public API projects Questions without CorrectChoice.
public sealed record LearningQuizDefinition(int Id, string Prompt, string[] Choices, int CorrectChoice, string Explanation);
public sealed record LearningLessonDefinition(int Id, string Title, string IslandName, string Summary,
    LearningReading[] Reading, LearningQuizDefinition[] Questions, int Minutes = 8, int Xp = 50);
public sealed record LearningCourseDefinition(int Id, string Title, string Category, string Description,
    string IslandKind, LearningLessonDefinition[] Lessons);

public static class LearningCatalog
{
    private static LearningQuizDefinition Q(int id, string prompt, int answer, string explanation, params string[] choices)
        => new(id, prompt, choices, answer, explanation);
    private static LearningReading R(string heading, string text, string? example = null) => new(heading, text, example);

    public static IReadOnlyList<LearningCourseDefinition> Courses { get; } =
    [
        new(13, "English for Work", "Languages", "ฝึกภาษาอังกฤษที่ใช้จริงในการแนะนำตัว อีเมล การประชุม และข้อเสนอแนะ", "english",
        [
            new(1, "แนะนำตัวในที่ทำงาน", "เกาะเริ่มบทสนทนา", "แนะนำชื่อ บทบาท และสิ่งที่รับผิดชอบให้คู่สนทนาเข้าใจในสามประโยค",
            [R("บอกบทบาทให้ชัด", "ใช้ I’m ตามด้วยชื่อ และ I work as a/an ตามด้วยตำแหน่งงาน หากขึ้นต้นชื่ออาชีพด้วยเสียงสระให้ใช้ an", "Hi, I’m Mina. I work as a UX researcher."),
             R("เล่าความรับผิดชอบ", "ใช้ I’m responsible for + คำนามหรือกริยาเติม -ing เพื่อบอกงานหลัก ปิดท้ายด้วย Nice to meet you. ไม่จำเป็นต้องเล่าประวัติทั้งหมด", "I’m responsible for interviewing customers. Nice to meet you.")],
            [Q(1,"ประโยคใดใช้แนะนำบทบาทได้เหมาะสม",1,"I work as a developer. บอกบทบาทโดยใช้ work as ตามด้วยอาชีพ","I am work developer.","I work as a developer.","I works a developer."),
             Q(2,"เติมคำ: I’m responsible for ___ customers.",0,"หลัง for ใช้กริยาเติม -ing: interviewing","interviewing","interview","interviewed"),
             Q(3,"หลังแนะนำตัวแล้วควรปิดบทสนทนาอย่างไร",2,"Nice to meet you. เป็นประโยคสุภาพเมื่อพบกันครั้งแรก","Give me your tasks.","You must know me.","Nice to meet you.")]),
            new(2,"เขียนอีเมลให้ชัดเจน","เกาะอีเมล","เขียนหัวเรื่องที่มีเป้าหมาย ขอสิ่งที่ต้องการอย่างสุภาพ และระบุเวลาที่ชัดเจน",
            [R("เริ่มจากเหตุผลที่เขียน", "หัวเรื่องควรบอกสิ่งที่ต้องทำ ไม่ใช้คำกว้าง ๆ อย่าง Hello อย่างเดียว ประโยคแรกใช้ I’m writing to... เพื่อให้ผู้อ่านเข้าใจวัตถุประสงค์", "Subject: Request for feedback on the homepage\nI’m writing to ask for your feedback on the new homepage."),
             R("ระบุคำขอและกำหนดเวลา", "Could you + กริยารูปปกติ เป็นคำขอที่สุภาพ ใช้ by ตามด้วยกำหนดส่ง และระบุวันจริงเพื่อลดความสับสน", "Could you review the draft by Friday, 23 October? Thank you for your help.")],
            [Q(1,"หัวเรื่องใดช่วยให้ผู้อ่านรู้ว่าต้องทำอะไร",0,"Request for feedback on the homepage บอกวัตถุประสงค์และชิ้นงานชัดเจน","Request for feedback on the homepage","Hello!!!","Something important"),
             Q(2,"ประโยคขอให้ตรวจงานแบบสุภาพคือข้อใด",2,"Could you review the draft? ใช้ could you ตามด้วยกริยารูปปกติ","You review now!","Could you reviewed the draft?","Could you review the draft?"),
             Q(3,"by Friday หมายถึงอะไร",1,"by ระบุกำหนดที่ต้องทำให้เสร็จ ไม่เกินวันศุกร์","เริ่มทำหลังวันศุกร์","ทำให้เสร็จภายในวันศุกร์","ทำเฉพาะทุกวันศุกร์")],10),
            new(3,"สื่อสารในการประชุม","เกาะประชุม","เสนอความคิด ขอคำอธิบาย และสรุปงานถัดไปอย่างสุภาพ",
            [R("ขอความชัดเจนก่อนตอบ", "ถ้ายังไม่เข้าใจ ใช้ Could you clarify...? หรือ Do you mean...? เพื่อตรวจสอบความหมาย แทนการเดาหรือแสร้งว่าเข้าใจ", "Could you clarify what you mean by ‘ready for launch’?") ,
             R("ตกลงงานและผู้รับผิดชอบ", "ใช้ I suggest + กริยาเติม -ing เพื่อเสนอแนวทาง ก่อนจบสรุปว่าใครทำอะไรภายในเมื่อไร", "I suggest testing the form first. To confirm, I’ll test it by Tuesday and share the results.")],
            [Q(1,"หากไม่เข้าใจคำว่า ready for launch ควรถามอย่างไร",1,"Could you clarify...? ขอคำอธิบายโดยสุภาพ","Yes, anything.","Could you clarify what ‘ready for launch’ means?","You are wrong."),
             Q(2,"เติมคำ: I suggest ___ the form first.",2,"หลัง suggest ใช้ testing ซึ่งเป็นกริยาเติม -ing","to testing","test","testing"),
             Q(3,"ข้อใดเป็นการสรุปงานที่ตรวจสอบได้",0,"ระบุผู้รับผิดชอบ งาน และกำหนดเวลา ทำให้ทุกคนเข้าใจตรงกัน","I’ll test the form by Tuesday and share the results.","We should do something soon.","This seems fine.")],10),
            new(4,"ให้ข้อเสนอแนะอย่างสร้างสรรค์","เกาะร่วมงาน","ให้ข้อเสนอแนะที่ยึดพฤติกรรม ผลกระทบ และข้อเสนอที่ทำได้จริง",
            [R("พูดถึงสิ่งที่สังเกตได้", "หลีกเลี่ยงการตัดสินบุคลิก ใช้ I noticed... ตามด้วยพฤติกรรมจริง แล้วอธิบายผลกระทบ เช่นผู้อ่านสับสนตรงไหน", "I noticed the email has no deadline, so the team may not know when to respond."),
             R("เสนอขั้นตอนถัดไป", "Could we...? ช่วยชวนหาทางแก้ร่วมกัน อธิบายสิ่งที่อยากให้ปรับอย่างเฉพาะเจาะจง และเปิดรับมุมมองของอีกฝ่าย", "Could we add a deadline to the request? What do you think?")],
            [Q(1,"ข้อใดเป็นข้อเสนอแนะที่อิงสิ่งสังเกตได้",2,"การบอกว่าอีเมลไม่มี deadline อิงชิ้นงาน ไม่ตัดสินบุคลิก","You are always careless.","Your work is bad.","I noticed the email has no deadline."),
             Q(2,"ประโยคใดชวนแก้ปัญหาร่วมกัน",0,"Could we add a deadline? เป็นข้อเสนอที่ทำได้จริงและสุภาพ","Could we add a deadline to the request?","You must do better somehow.","It is all your fault."),
             Q(3,"โครงสร้างข้อเสนอแนะที่เหมาะสมคืออะไร",1,"เริ่มสิ่งที่สังเกต อธิบายผลกระทบ แล้วเสนอวิธีปรับปรุง","ตัดสินบุคลิก → สั่งให้เปลี่ยน","สิ่งที่สังเกต → ผลกระทบ → ข้อเสนอ","ชมทั่วไป → จบการสนทนา")],10)
        ]),
        new(1,"UX Research","Design","ฝึกตั้งคำถาม สัมภาษณ์ผู้ใช้ วิเคราะห์หลักฐาน และวางแผนทดสอบการใช้งาน","ux",
        [
            new(1,"ตั้งคำถามวิจัย","เกาะโจทย์ผู้ใช้","แยกคำถามวิจัยออกจากคำตอบที่ทีมอยากได้ และเลือกสิ่งที่ต้องรู้ก่อนตัดสินใจ",
            [R("เริ่มจากการตัดสินใจ", "ระบุก่อนว่าทีมจะใช้ผลวิจัยตัดสินใจเรื่องอะไร จากนั้นเขียนสิ่งที่ยังไม่รู้เกี่ยวกับผู้ใช้ คำถามวิจัยควรเปิดกว้างและไม่ผูกกับวิธีแก้ที่ตั้งไว้", "เรายังไม่รู้ว่าพนักงานใหม่ติดขัดตรงไหนในการเลือกคอร์สแรก"),
             R("เลือกวิธีให้ตรงคำถาม", "การสัมภาษณ์ช่วยเข้าใจเหตุผลและประสบการณ์ แบบสอบถามช่วยเห็นรูปแบบในกลุ่มใหญ่ ส่วนการทดสอบการใช้งานช่วยดูว่าผู้ใช้ทำภารกิจสำเร็จหรือไม่", "อยากรู้ว่าหาปุ่มเปลี่ยนคอร์สเจอไหม → ให้ผู้ใช้ลองทำภารกิจจริง")],
            [Q(1,"ข้อใดเป็นคำถามวิจัยที่ไม่ชี้นำ",1,"คำถามเรื่องสิ่งที่ติดขัดเปิดให้ค้นพบปัญหาจริง","ผู้ใช้ชอบปุ่มสีฟ้าของเราใช่ไหม","ผู้ใช้ติดขัดตรงไหนในการเลือกคอร์สแรก","ทำไมผู้ใช้ไม่เข้าใจดีไซน์ที่ดีของเรา"),
             Q(2,"อยากรู้ว่าผู้ใช้หาปุ่มเปลี่ยนคอร์สเจอหรือไม่ ควรใช้วิธีใด",0,"ให้ทำภารกิจจริงเพื่อสังเกตการใช้งาน","ทดสอบการใช้งานด้วยภารกิจ","นับจำนวนสมาชิกอย่างเดียว","ถามว่าชอบสีหรือไม่"),
             Q(3,"ควรเขียนคำถามวิจัยหลังจากอะไร",2,"ระบุการตัดสินใจและสิ่งที่ยังไม่รู้ก่อนเลือกคำถาม","เลือกคำตอบที่อยากได้","วาดหน้าจอทั้งหมดเสร็จเท่านั้น","ระบุการตัดสินใจที่ผลวิจัยจะช่วย")]),
            new(2,"สัมภาษณ์โดยไม่ชี้นำ","เกาะรับฟัง","ถามถึงเหตุการณ์จริง ใช้คำถามปลายเปิด และไม่ขายไอเดียระหว่างสัมภาษณ์",
            [R("ถามอดีตที่เกิดขึ้นจริง", "ความทรงจำจากเหตุการณ์ล่าสุดช่วยให้เห็นบริบทได้ดีกว่าการคาดเดาว่าอนาคตจะทำอะไร ใช้คำถามว่า ช่วยเล่าครั้งล่าสุดที่... แทน ถ้ามีฟีเจอร์นี้จะใช้ไหม", "ช่วยเล่าครั้งล่าสุดที่คุณพยายามเรียนทักษะใหม่เพื่อใช้ทำงาน"),
             R("ฟังและถามต่อ", "ถามว่า เกิดอะไรขึ้นต่อ หรือ ทำอย่างไร โดยไม่ใส่คำตอบให้ บันทึกคำพูดและแยกสิ่งที่ได้ยินออกจากการตีความ ขอความยินยอมก่อนบันทึกเสียง", "คุณบอกว่าหาคอร์สยาก ช่วยเล่าว่าตอนนั้นลองหาอย่างไรบ้าง")],
            [Q(1,"คำถามใดให้หลักฐานจากเหตุการณ์จริง",2,"ถามครั้งล่าสุดเพื่อให้ผู้ใช้เล่าบริบทและพฤติกรรมจริง","ถ้ามีแอปใหม่จะใช้แน่นอนใช่ไหม","คุณเป็นคนขยันเรียนใช่ไหม","ช่วยเล่าครั้งล่าสุดที่คุณเลือกเรียนคอร์สออนไลน์"),
             Q(2,"เมื่อผู้ใช้บอกว่าขั้นตอนยาก ควรถามต่ออย่างไร",0,"ขอให้เล่าขั้นตอนที่เกิดขึ้น โดยไม่ชี้คำตอบ","ช่วยเล่าว่าตอนนั้นทำอย่างไรบ้าง","เป็นเพราะปุ่มเล็กใช่ไหม","จริง ๆ ระบบเราใช้ง่ายนะ"),
             Q(3,"ก่อนบันทึกเสียงควรทำสิ่งใด",1,"ขอความยินยอมอย่างชัดเจนก่อนบันทึก","เปิดบันทึกเงียบ ๆ","ขอความยินยอมจากผู้ร่วมวิจัย","ส่งเสียงให้ทุกคนในทีมทันที")],10),
            new(3,"จากข้อมูลสู่ข้อค้นพบ","เกาะหลักฐาน","แยกข้อสังเกต การตีความ และข้อเสนอ เพื่อให้ข้อค้นพบตรวจสอบได้",
            [R("แยกสิ่งที่เห็นกับสิ่งที่คิด", "ข้อสังเกตคือพฤติกรรมหรือคำพูดจริง การตีความคือคำอธิบายที่ต้องมีหลักฐานรองรับ อย่าเปลี่ยนข้อสันนิษฐานหนึ่งคนเป็นข้อสรุปของผู้ใช้ทั้งหมด", "ข้อสังเกต: ผู้ใช้ 3 จาก 5 คนกลับไปหน้า Home เพื่อเปลี่ยนคอร์ส"),
             R("จัดกลุ่มแล้วระบุขอบเขต", "รวมข้อมูลที่มีความหมายคล้ายกัน เก็บข้อมูลที่ขัดแย้งด้วย และระบุจำนวน/บริบทของผู้เข้าร่วม งานวิจัยกลุ่มเล็กช่วยพบปัญหา แต่ไม่ใช่อัตราแทนประชากรทั้งหมด", "ข้อค้นพบ: ในกลุ่มทดสอบนี้ ปุ่มเปลี่ยนคอร์สไม่ถูกคาดหวังให้อยู่ในเมนูโปรไฟล์")],
            [Q(1,"ข้อใดเป็นข้อสังเกต",1,"จำนวนผู้ใช้และพฤติกรรมที่เห็นเป็นหลักฐานโดยตรง","ทุกคนเกลียดการเรียน","ผู้ใช้ 3 จาก 5 คนกลับ Home เพื่อเปลี่ยนคอร์ส","ควรย้ายปุ่มทันที"),
             Q(2,"ผู้ใช้ 3 จาก 5 คนในกลุ่มทดสอบติดขัด สรุปได้ว่าอะไร",2,"กลุ่มตัวอย่างเล็กไม่เพียงพออ้างอัตราประชากรทั้งหมด","60% ของผู้ใช้ทั้งประเทศจะติดขัดแน่นอน","ระบบใช้ไม่ได้สำหรับทุกคน","พบปัญหาในกลุ่มทดสอบนี้ ควรตรวจสอบและปรับปรุง"),
             Q(3,"ข้อมูลที่ขัดกับข้อสรุปเบื้องต้นควรทำอย่างไร",0,"เก็บและพิจารณาข้อมูลที่ขัดแย้งเพื่อลดการเลือกหลักฐานเข้าข้างตัวเอง","เก็บไว้และตรวจสอบบริบท","ลบทิ้งเพื่อให้ผลสวย","เปลี่ยนคำพูดให้เข้าข้อสรุป")],10),
            new(4,"วางแผนทดสอบการใช้งาน","เกาะทดลอง","สร้างภารกิจที่มีเป้าหมาย สังเกตโดยไม่ช่วยนำ และนำปัญหามาจัดลำดับแก้ไข",
            [R("เขียนภารกิจโดยไม่เฉลยปุ่ม", "เล่าสถานการณ์และเป้าหมาย หลีกเลี่ยงชื่อเมนูหรือขั้นตอนที่จะทดสอบ ระบุเกณฑ์สำเร็จล่วงหน้า เช่นเปลี่ยนไปคอร์สใหม่ได้โดยเก็บความคืบหน้าเดิม", "คุณอยากเริ่มฝึก JavaScript โดยพักคอร์สภาษาไว้ ลองทำให้พร้อมเรียนบทแรก"),
             R("สังเกตและจัดลำดับ", "บันทึกว่าสำเร็จหรือไม่ จุดติดขัด และการขอความช่วยเหลือ อย่ารีบบอกทาง จัดลำดับปัญหาตามผลกระทบ ความถี่ และความมั่นใจของหลักฐาน", "ปุ่มเรียนต่อกดไม่ได้ → กระทบงานหลักมากกว่าสีไอคอนไม่ตรงความชอบ")],
            [Q(1,"ภารกิจใดไม่บอกคำตอบล่วงหน้า",0,"ให้เป้าหมายแทนชื่อเมนูที่ต้องการทดสอบ","คุณอยากเปลี่ยนไปฝึก JavaScript ลองทำให้พร้อมเรียนบทแรก","กด Change Course แล้วเลือก JavaScript","กดปุ่มสีฟ้าขวาบน"),
             Q(2,"เมื่อผู้ใช้เงียบและหาปุ่มไม่เจอ ผู้วิจัยควรทำอย่างไร",2,"ให้โอกาสสังเกตการคิดและการกระทำก่อนช่วย","ชี้ปุ่มให้ทันทีเสมอ","แย่งเมาส์ไปกด","สังเกตและถามสิ่งที่กำลังคิดโดยไม่เฉลย"),
             Q(3,"ควรแก้ปัญหาใดก่อนเมื่อหลักฐานน่าเชื่อถือเท่ากัน",1,"ปัญหาที่ขัดขวางงานหลักควรได้ความสำคัญก่อนความชอบเชิงภาพ","สีไอคอนไม่ตรงความชอบหนึ่งคน","ผู้ใช้เริ่มเรียนต่อไม่ได้","เงาการ์ดไม่สวย")],10)
        ]),
        new(5,"JavaScript Basics","Technology","เรียนตัวแปร เงื่อนไข ฟังก์ชัน และการจัดการ DOM ผ่านตัวอย่างเว็บเรียนรู้","javascript",
        [
            new(1,"ตัวแปรและชนิดข้อมูล","เกาะตัวแปร","เก็บสถานะผู้เรียนด้วย const และ let และแยกตัวเลขออกจากข้อความ",
            [R("เลือก const หรือ let", "ใช้ const เมื่อไม่ต้องกำหนดค่าให้ตัวแปรใหม่ ใช้ let เมื่อค่าจะเปลี่ยนภายหลัง JavaScript แยกตัวพิมพ์เล็กและใหญ่ และชื่อที่สื่อความหมายช่วยอ่านโค้ด", "const courseName = 'JavaScript';\nlet xp = 0;\nxp = xp + 50;"),
             R("ตัวเลขและข้อความต่างกัน", "ค่าที่อยู่ในเครื่องหมายคำพูดเป็น string ส่วน 50 เป็น number เครื่องหมาย + ระหว่าง string กับ number จะต่อข้อความ ใช้ Number เมื่อจะเปลี่ยนข้อความตัวเลขให้เป็นตัวเลข", "'50' + 10 // '5010'\nNumber('50') + 10 // 60")],
            [Q(1,"ต้องเพิ่มค่า xp ภายหลัง ควรประกาศอย่างไร",2,"let อนุญาตให้กำหนดค่าใหม่","const xp = 0;","fixed xp = 0;","let xp = 0;"),
             Q(2,"ค่า '50' + 10 ได้อะไร",0,"เมื่อข้างหนึ่งเป็น string เครื่องหมาย + จะต่อข้อความ","ข้อความ '5010'","ตัวเลข 60","ตัวเลข 500"),
             Q(3,"Number('50') + 10 ได้ค่าเท่าไร",1,"Number แปลงข้อความ '50' ให้เป็นตัวเลขก่อนบวก","ข้อความ '5010'","ตัวเลข 60","undefined")]),
            new(2,"เงื่อนไขและการเปรียบเทียบ","เกาะทางเลือก","ตัดสินใจว่าควรเปิดบทเรียนหรือแสดงข้อความเตือน โดยใช้ค่าที่มีชนิดตรงกัน",
            [R("ใช้ if เพื่อเลือกเส้นทาง", "เงื่อนไข if ทำงานเมื่อค่าภายในเป็นจริง else ทำงานเมื่อเป็นเท็จ ใช้ === เพื่อตรวจทั้งค่าและชนิดข้อมูล ลดการแปลงชนิดที่ไม่คาดคิด", "if (completed === true) {\n  console.log('เรียนด่านถัดไปได้');\n} else {\n  console.log('เรียนด่านนี้ให้จบก่อน');\n}"),
             R("รวมหลายเงื่อนไข", "&& หมายถึงทุกเงื่อนไขต้องเป็นจริง ส่วน || หมายถึงอย่างน้อยหนึ่งเงื่อนไขเป็นจริง ระวังการใช้ = ซึ่งเป็นการกำหนดค่า ไม่ใช่การเปรียบเทียบ", "const canStart = isLoggedIn && isUnlocked;")],
            [Q(1,"5 === '5' ให้ผลอะไร",1,"=== เปรียบเทียบทั้งชนิดและค่า number ไม่เท่ากับ string","true","false","'5'"),
             Q(2,"true && false ให้ผลอะไร",2,"&& ต้องให้ทั้งสองข้างเป็นจริง","true","undefined","false"),
             Q(3,"เครื่องหมายใดเป็นการกำหนดค่า",0,"= ใช้กำหนดค่า ส่วน === ใช้เปรียบเทียบ","=","===","&&")],10),
            new(3,"ฟังก์ชันและอาร์เรย์","เกาะฟังก์ชัน","แยกงานซ้ำเป็นฟังก์ชันและเก็บรายการบทเรียนในอาร์เรย์",
            [R("รับข้อมูลและคืนผลลัพธ์", "พารามิเตอร์เป็นข้อมูลขาเข้าของฟังก์ชัน return ส่งผลลัพธ์ให้ผู้เรียก หากไม่มี return จะได้ undefined console.log ใช้แสดงผลเพื่อดูข้อมูล ไม่ได้คืนผลแทน return", "function addXp(current, reward) {\n  return current + reward;\n}\nconst total = addXp(50, 20); // 70"),
             R("อาร์เรย์เริ่มตำแหน่งที่ศูนย์", "อาร์เรย์ใช้เก็บรายการ ค่าตำแหน่งแรกมี index 0 ใช้ length ดูจำนวนสมาชิก และ filter สร้างอาร์เรย์ใหม่ที่มีเฉพาะค่าผ่านเงื่อนไข", "const scores = [50, 80, 30];\nconst passed = scores.filter(score => score >= 50); // [50, 80]")],
            [Q(1,"addXp(50, 20) จากตัวอย่างได้อะไร",1,"ฟังก์ชันคืนผลรวมของค่าที่รับเข้า","50","70","undefined"),
             Q(2,"จาก const islands = ['A','B','C']; islands[0] คืออะไร",0,"อาร์เรย์เริ่มนับ index ที่ 0","'A'","'B'","3"),
             Q(3,"filter ทำหน้าที่อะไร",2,"filter คืนอาร์เรย์ใหม่จากสมาชิกที่ผ่านเงื่อนไข","เปลี่ยนทุกค่าเป็นข้อความ","ลบอาร์เรย์เดิมเสมอ","สร้างอาร์เรย์ใหม่จากค่าที่ผ่านเงื่อนไข")],10),
            new(4,"ปุ่มและ DOM","เกาะหน้าเว็บ","เชื่อมปุ่มกับเหตุการณ์ และอัปเดตข้อความบนหน้าเว็บอย่างปลอดภัย",
            [R("เลือกองค์ประกอบและรับเหตุการณ์", "document.querySelector เลือกองค์ประกอบตัวแรกที่ตรงกับ CSS selector และอาจคืน null หากหาไม่พบ addEventListener ลงทะเบียนฟังก์ชันที่จะทำงานเมื่อเกิดเหตุการณ์", "const button = document.querySelector('#continue');\nbutton?.addEventListener('click', () => {\n  console.log('เริ่มบทเรียน');\n});"),
             R("ใส่ข้อความด้วย textContent", "ใช้ textContent เมื่อต้องการแสดงข้อความ โดยเฉพาะข้อความจากผู้ใช้ อย่านำข้อความที่ไม่ไว้ใจไปใส่ innerHTML เพราะอาจถูกตีความเป็น HTML หรือสคริปต์ได้ ข้อมูล XP จริงต้องตรวจและบันทึกที่เซิร์ฟเวอร์", "const label = document.querySelector('#learner-name');\nif (label) label.textContent = learnerName;")],
            [Q(1,"querySelector('#continue') เลือกอะไร",2,"เครื่องหมาย # ใน CSS selector ใช้เลือก id","ทุกปุ่มในเว็บ","องค์ประกอบ class continue","องค์ประกอบแรกที่มี id continue"),
             Q(2,"ต้องการทำงานเมื่อกดปุ่มควรใช้เหตุการณ์ใด",0,"click เป็นเหตุการณ์จากการกดปุ่ม","click","scroll-only","return"),
             Q(3,"แสดงชื่อที่ผู้ใช้กรอกควรใช้ข้อใด",1,"textContent แสดงเป็นข้อความโดยไม่ตีความเป็น HTML","innerHTML = learnerName","textContent = learnerName","eval(learnerName)")],10)
        ])
    ];

    public static LearningCourseDefinition? Find(int id)
    {
        var adminCourse = AdminContentStore.GetCourse(id);
        var predefined = Courses.FirstOrDefault(c => c.Id == id);

        if (adminCourse is null && predefined is null) return null;

        var title = !string.IsNullOrWhiteSpace(adminCourse?.Title) ? adminCourse.Title : (predefined?.Title ?? "คอร์สเรียน");
        var category = !string.IsNullOrWhiteSpace(adminCourse?.Category) ? adminCourse.Category : (predefined?.Category ?? "Technology");
        var description = !string.IsNullOrWhiteSpace(adminCourse?.Description) ? adminCourse.Description : (predefined?.Description ?? "");
        var islandKind = predefined?.IslandKind ?? (category.ToLowerInvariant() switch
        {
            "languages" or "language" => "english",
            "design" => "ux",
            "technology" or "development" => "javascript",
            _ => "destination"
        });

        var adminQuestions = AdminContentStore.GetAllQuestions(id);
        List<LearningLessonDefinition> lessons = new();

        if (predefined is not null && predefined.Lessons.Length > 0)
        {
            lessons = predefined.Lessons.Select(lesson =>
            {
                var lQuestions = adminQuestions.Where(q => q.LessonId == lesson.Id).ToList();
                if (lQuestions.Count > 0)
                {
                    var dynamicQuiz = lQuestions.Select((q, qIdx) => new LearningQuizDefinition(
                        qIdx + 1, q.Prompt, q.Choices.ToArray(), q.CorrectChoice, q.Explanation ?? ""
                    )).ToArray();
                    return new LearningLessonDefinition(lesson.Id, lesson.Title, lesson.IslandName, lesson.Summary,
                        lesson.Reading, dynamicQuiz, lesson.Minutes, lesson.Xp);
                }
                return lesson;
            }).ToList();
        }
        else if (adminCourse?.Lessons is { Count: > 0 })
        {
            lessons = adminCourse.Lessons.Select((l, idx) =>
            {
                var lQuestions = adminQuestions.Where(q => q.LessonId == l.Id).ToList();
                LearningQuizDefinition[] quizDefs;
                if (lQuestions.Count > 0)
                {
                    quizDefs = lQuestions.Select((q, qIdx) => new LearningQuizDefinition(
                        qIdx + 1, q.Prompt, q.Choices.ToArray(), q.CorrectChoice, q.Explanation ?? ""
                    )).ToArray();
                }
                else
                {
                    quizDefs = new[]
                    {
                        new LearningQuizDefinition(1, $"คำถามทดสอบความเข้าใจสำหรับ {l.Title}", new[] { "ตัวเลือกที่ถูกต้อง", "ตัวเลือกอื่น 1", "ตัวเลือกอื่น 2" }, 0, "ยอดเยี่ยม! ตอบถูกต้อง")
                    };
                }

                var reading = new[]
                {
                    new LearningReading(l.Title, $"ยินดีต้อนรับสู่บทเรียน {l.Title} ในคอร์ส {title} เรียนรู้และพัฒนาทักษะไปกับเนื้อหาคุณภาพบน NextSkill", "เริ่มต้นศึกษาเนื้อหาในบทเรียนนี้ได้เลย")
                };

                return new LearningLessonDefinition(l.Id, l.Title, $"เกาะบทเรียน {l.Id}", $"บทเรียนเกี่ยวกับ {l.Title}", reading, quizDefs, l.DurationMinutes > 0 ? l.DurationMinutes : 10, 50);
            }).ToList();
        }
        else
        {
            int units = adminCourse?.Units > 0 ? adminCourse.Units : 4;
            for (int i = 1; i <= units; i++)
            {
                lessons.Add(new LearningLessonDefinition(
                    i,
                    $"บทที่ {i}: พื้นฐาน {title}",
                    $"เกาะที่ {i}",
                    $"เรียนรู้เนื้อหาสำคัญในบทที่ {i}",
                    new[] { new LearningReading($"เนื้อหาบทที่ {i}", $"ศึกษาและทำความเข้าใจเกี่ยวกับ {title} ทีละขั้นตอน เพื่อนำไปประยุกต์ใช้งานจริง", "ฝึกฝนตามคำแนะนำของบทเรียน") },
                    new[] { new LearningQuizDefinition(1, $"แนวคิดหลักของบทที่ {i} คืออะไร", new[] { "การประยุกต์ใช้ทักษะที่ถูกต้อง", "การข้ามขั้นตอน", "การไม่ฝึกฝน" }, 0, "ถูกต้องแล้วครับ!") },
                    10,
                    50
                ));
            }
        }

        return new LearningCourseDefinition(id, title, category, description, islandKind, lessons.ToArray());
    }

    public static IReadOnlyList<LearningCatalogCourse> PublicCatalog() => CourseCatalog.GetCourses().Select(course =>
    {
        var path = Find(course.Id);
        var title = !string.IsNullOrWhiteSpace(course.Title) ? course.Title : (path?.Title ?? "คอร์สเรียน");
        var category = !string.IsNullOrWhiteSpace(course.Category) ? course.Category : (path?.Category ?? "Technology");
        var description = !string.IsNullOrWhiteSpace(course.Description) ? course.Description : (path?.Description ?? "");
        var islandKind = path?.IslandKind ?? "destination";
        var lessons = path?.Lessons ?? Array.Empty<LearningLessonDefinition>();
        return new LearningCatalogCourse(course.Id, title, category, description, islandKind, lessons.Length,
            lessons.Length > 0, lessons.Select((lesson, index) => Summary(lesson, index == 0 ? "current" : "locked")).ToArray());
    }).OrderBy(c => c.Id == 13 ? 0 : c.Id == 1 ? 1 : c.Id == 5 ? 2 : c.Id + 3).ToArray();

    public static LearningLessonSummary Summary(LearningLessonDefinition lesson, string status)
        => new(lesson.Id, lesson.Title, lesson.IslandName, lesson.Xp, lesson.Minutes, status);
    public static LearningLessonContent PublicLesson(int courseId, LearningLessonDefinition lesson, string status)
        => new(courseId, lesson.Id, lesson.Title, lesson.IslandName, lesson.Summary, lesson.Reading,
            lesson.Questions.Select(q => new LearningQuestion(q.Id, q.Prompt, q.Choices)).ToArray(), lesson.Xp, lesson.Minutes, status);
}
