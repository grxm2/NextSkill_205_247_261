(() => {
    'use strict';
    const buddy = createBuddy();
    document.querySelectorAll('[data-open-dialog]').forEach(button => {
        button.addEventListener('click', event => {
            const dialog = document.getElementById(button.dataset.openDialog);
            if (!dialog) return;
            if (button.dataset.lessonTitle) {
                dialog.querySelector('h2').textContent = button.dataset.lessonTitle;
                const feedback = button.dataset.lessonTitle.toLowerCase() === 'feedback patterns';
                dialog.querySelector('.lesson-example').hidden = !feedback;
                dialog.querySelector('h2 + p').textContent = feedback
                    ? 'ฝึกสื่อสารความคิดเห็นอย่างสร้างสรรค์ในที่ทำงาน ผ่านบทเรียนสั้น 10–15 นาที'
                    : 'คุณเรียนหัวข้อนี้จบแล้ว สามารถกลับมาทบทวนเพื่อเสริมความมั่นใจได้';
            }
            dialog.showModal();
            if (dialog.id === 'lesson-dialog') {
                buddy.react(button.dataset.lessonTitle?.toLowerCase() === 'feedback patterns' ? 'lesson' : 'review', event.detail > 0);
            } else if (dialog.id === 'reward-dialog') {
                buddy.react('reward', event.detail > 0);
            }
        });
    });
    document.querySelectorAll('.home-dialog').forEach(dialog => {
        dialog.addEventListener('click', event => {
            if (event.target !== dialog) return;
            const b = dialog.getBoundingClientRect();
            if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) dialog.close();
        });
    });
    const equip = document.getElementById('equip-freeze');
    equip?.addEventListener('click', event => {
        const equipped = equip.getAttribute('aria-pressed') !== 'true';
        equip.setAttribute('aria-pressed', String(equipped));
        equip.textContent = equipped ? 'ใช้แล้ว ✓' : 'ใช้เกราะ';
        document.getElementById('freeze-title').textContent = equipped ? 'เปิดเกราะรักษาสถิติแล้ว' : 'ตัวช่วยรักษาสถิติ';
        document.getElementById('freeze-description').textContent = equipped ? 'ตัวอย่าง ยังไม่บันทึกข้อมูล' : 'มีเกราะป้องกัน 1 ครั้ง';
        document.getElementById('home-status').textContent = equipped ? 'เปิดใช้งาน Streak freeze ในตัวอย่างแล้ว ยังไม่มีการบันทึกข้อมูล' : 'ปิดใช้งาน Streak freeze ในตัวอย่างแล้ว';
        if (equipped) buddy.react('protected', event.detail > 0);
    });

    function createBuddy() {
        const guide = document.querySelector('.map-guide');
        const greet = document.getElementById('buddy-greet');
        const control = document.getElementById('buddy-motion');
        if (!guide || !greet || !control) return { react() {} };

        const heading = guide.querySelector('.guide-message strong');
        const message = guide.querySelector('.guide-message > span');
        const status = document.getElementById('buddy-status');
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
        let paused = window.NextSkillAgent?.isPaused() || false;
        let greeting = 0;
        guide.dataset.buddyState = 'idle';

        function react(kind, motion = true) {
            const name = guide.dataset.learner || 'friend';
            const replies = {
                hello: [
                    [`สวัสดี ${name}`, 'ลองด่านสีฟ้า แล้วไปทีละก้าวด้วยกัน'],
                    ['ทีละก้าวก็ไปได้ไกล', 'เรียนอีกบทวันนี้ เพื่อรักษาสถิติต่อเนื่อง'],
                    ['มีรางวัลรออยู่', 'อีก 2 บทเรียนก็ถึงรางวัลถัดไป']
                ][greeting % 3],
                lesson: ['มาเริ่มกันเลย', 'ฝึกอีกนิด เพื่อความมั่นใจที่มากขึ้น'],
                review: ['ทบทวนอีกครั้งก็ดีนะ', 'ทบทวนเพื่อให้ใช้ทักษะได้คล่องขึ้น'],
                reward: ['ใกล้ถึงรางวัลแล้ว', 'เรียนอีก 2 บทเพื่อปลดล็อกรางวัล'],
                protected: ['เปิดเกราะรักษาสถิติแล้ว.', 'ลองใช้เกราะตัวอย่าง แล้วไปเรียนต่อกัน']
            };
            const reply = replies[kind] || replies.hello;
            if (kind === 'hello') greeting++;
            guide.dataset.buddyState = kind;
            heading.textContent = reply[0];
            message.textContent = reply[1];
            const greetingLine = document.getElementById("buddy-greeting");
            if (greetingLine) greetingLine.textContent = reply[1];
            if (status) status.textContent = reply.join(' ');
            document.dispatchEvent(new CustomEvent('nextskill:buddy-reacted', { detail: { kind, motion } }));
            const poses = { lesson: 'read', review: 'read', hello: 'wave', reward: 'surprise', protected: 'cheer' };
            if (motion) window.NextSkillBuddyMotion?.play(poses[kind] || 'curious');
        }

        function syncMotionPreference() {
            guide.dataset.motion = reduce.matches ? 'reduced' : paused ? 'paused' : 'active';
            control.disabled = reduce.matches;
            control.textContent = reduce.matches ? 'ลดการเคลื่อนไหวแล้ว' : paused ? 'ขยับต่อ' : 'พักการเคลื่อนไหว';
            control.setAttribute('aria-label', reduce.matches ? 'ลดการเคลื่อนไหวตามอุปกรณ์' : paused ? 'ให้คู่หูขยับต่อ' : 'พักการเคลื่อนไหวคู่หู');
            control.setAttribute('aria-pressed', String(paused || reduce.matches));
            window.NextSkillBuddyMotion?.refresh();
        }

        greet.addEventListener('click', event => react('hello', event.detail > 0));
        document.addEventListener('nextskill:buddy-action', event => {
            const kind = event.detail?.kind;
            if (['hello', 'lesson', 'review', 'reward', 'protected'].includes(kind)) {
                react(kind, event.detail.motion === true);
            }
        });
        document.addEventListener('nextskill:buddy-pose', event => {
            if (event.detail?.motion !== true) return;
            window.NextSkillBuddyMotion?.play(event.detail.pose);
        });
        control.addEventListener('click', () => {
            paused = !paused;
            syncMotionPreference();
            if (status) status.textContent = paused ? 'พักคู่หูแล้ว' : 'คู่หูขยับต่อแล้ว';
        });
        reduce.addEventListener('change', syncMotionPreference);
        syncMotionPreference();
        return { react };
    }
})();
