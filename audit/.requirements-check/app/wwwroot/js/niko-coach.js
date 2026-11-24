(() => {
    'use strict';
    const dialog = document.getElementById('niko-practice-dialog');
    const start = document.getElementById('niko-practice-start');
    if (!dialog || !start) return;
    const questions = [
        {
            id: 'notice-strength',
            title: 'เพื่อนทำสไลด์ได้ดี แต่ยังมีจุดที่อยากให้ปรับ คุณจะเริ่มคุยอย่างไร?',
            hint: 'เริ่มจากสิ่งที่ทำได้ดี เพื่อให้อีกฝ่ายเปิดรับฟีดแบ็ก ก่อนค่อยเสนอจุดปรับปรุง',
            options: ['This is wrong. Do it again.', 'One thing that worked well was…', 'I don’t care about this.'],
            correct: 1,
            explanation: 'เริ่มด้วยจุดที่ทำได้ดี ช่วยให้เพื่อนเห็นว่าเรารับรู้ความตั้งใจของเขา ก่อนคุยเรื่องที่อยากให้ปรับ',
            retry: ['ประโยคนี้ตัดสินงานทันที ลองเปิดด้วยสิ่งที่เพื่อนทำได้ดีก่อน', '', 'ประโยคนี้ทำให้อีกฝ่ายรู้สึกว่าเราไม่ใส่ใจ ลองแสดงว่าเรามองเห็นความตั้งใจของเขา']
        },
        {
            id: 'offer-alternative',
            title: 'คุณอยากเสนอวิธีใหม่ให้ทีม ลองเลือกประโยคที่ชวนให้ช่วยกันคิด',
            hint: 'ลองใช้คำถามที่ชวนทำร่วมกัน แทนการสั่งให้ทุกคนทำตามวิธีของเรา',
            options: ['Could we try a different approach?', 'We must do it my way.', 'You never get this right.'],
            correct: 0,
            explanation: '“Could we…” เป็นคำถามที่สุภาพ และเปิดให้ทีมพิจารณาทางเลือกด้วยกัน',
            retry: ['', 'ประโยคนี้บังคับให้ทีมทำตาม ลองใช้คำถามที่เปิดให้ช่วยกันตัดสินใจ', 'ประโยคนี้โจมตีตัวบุคคล ลองพูดถึงวิธีทำงานและทางเลือกใหม่แทน']
        },
        {
            id: 'invite-response',
            title: 'หลังเสนอทางเลือกแล้ว คุณจะชวนให้เพื่อนแสดงความคิดเห็นกลับมาอย่างไร?',
            hint: 'ปิดท้ายด้วยคำถามเปิด ให้อีกฝ่ายมีส่วนร่วม ไม่ใช่จบการคุยฝ่ายเดียว',
            options: ['That’s all. Don’t ask.', 'You should know this already.', 'How does that sound to you?'],
            correct: 2,
            explanation: 'คำถามนี้เปิดให้เพื่อนบอกมุมมองหรือข้อกังวล เพื่อหาทางเลือกที่เหมาะร่วมกัน',
            retry: ['ประโยคนี้ปิดโอกาสพูดคุย ลองถามความเห็นของอีกฝ่ายด้วย', 'ประโยคนี้อาจทำให้เพื่อนไม่กล้าถาม ลองชวนให้เขาแบ่งปันมุมมอง', '']
        }
    ];
    const storageKey = 'nextskill.practice.feedback.v1';
    const ids = new Set(questions.map(question => question.id));
    let learned = new Set();
    let storageAvailable = true;
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        if (saved?.version === 1 && Array.isArray(saved.completed)) learned = new Set(saved.completed.filter(id => ids.has(id)));
    } catch {}
    const panel = document.getElementById('niko-question-panel');
    const heading = document.getElementById('niko-question-title');
    const options = document.getElementById('niko-answer-options');
    const hint = document.getElementById('niko-hint');
    const feedback = document.getElementById('niko-practice-feedback');
    const feedbackTitle = document.getElementById('niko-feedback-title');
    const feedbackText = document.getElementById('niko-feedback-text');
    const next = document.getElementById('niko-next-question');
    const listen = document.getElementById('niko-listen');
    const actions = dialog.querySelector('.niko-question-actions');
    const summary = document.getElementById('niko-practice-summary');
    const progress = document.getElementById('niko-question-progress');
    const count = document.getElementById('niko-question-count');
    const audioStatus = document.getElementById('niko-audio-status');
    const robot = document.querySelector('.skill-buddy');
    const synth = window.speechSynthesis;
    let index = 0;
    let answered = false;
    let utterance = null;
    let speechToken = 0;
    let speechWatchdog;
    let opener = start;

    function save() {
        try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, completed: [...learned] })); }
        catch {
            storageAvailable = false;
            dialog.querySelector('.niko-practice-note').textContent = 'เบราว์เซอร์นี้บันทึกความก้าวหน้าไม่ได้ · แบบฝึกไม่คิด XP และไม่ใช้หัวใจ';
        }
    }
    function pose(name, event) { window.NextSkillBuddyMotion?.play(name, robot, { motion: event?.detail > 0 }); }
    function renderHome() {
        const total = learned.size;
        const counter = document.getElementById('niko-home-progress');
        counter.textContent = `${total} / 3`;
        counter.setAttribute('aria-label', `ฝึกแล้ว ${total} จาก 3 สถานการณ์`);
        start.firstChild.textContent = total === 3 ? 'ทบทวน 3 ประโยค ' : total ? 'ฝึกต่ออีกนิด ' : 'ฝึก 1 นาที ';
        document.querySelectorAll('[data-sea-practice-label]').forEach(label => {
            label.textContent = total === 3 ? 'ทบทวนภารกิจ' : total ? 'ทำภารกิจต่อ' : 'เริ่มภารกิจ';
        });
        document.getElementById('buddy-greeting').textContent = [
            'ลองเริ่มฟีดแบ็กจากจุดที่ทำได้ดี ฝึกกับฉันสักข้อไหม?',
            'เริ่มคุยได้แล้ว ต่อไปลองเสนอทางเลือกอย่างสุภาพกัน',
            'เหลืออีกข้อเดียว ลองชวนอีกฝ่ายออกความเห็นด้วยกัน',
            'ฝึกครบ 3 ประโยคแล้ว พร้อมเปิดบทเรียนไปใช้ต่อได้เลย'
        ][total];
    }
    function stopSpeech() {
        speechToken++;
        clearTimeout(speechWatchdog);
        if (utterance && synth) synth.cancel();
        utterance = null;
        delete robot.dataset.speaking;
        listen.setAttribute('aria-pressed', 'false');
        listen.textContent = 'ฟังประโยคแล้วลองพูดตาม';
    }
    function renderQuestion(focus = false) {
        stopSpeech();
        answered = false;
        const question = questions[index];
        panel.hidden = false; summary.hidden = true; actions.hidden = false;
        feedback.hidden = true; hint.hidden = true; next.hidden = true; listen.hidden = true;
        audioStatus.textContent = '';
        count.textContent = `สถานการณ์ ${index + 1} / 3`;
        progress.value = index; progress.textContent = `${index} / 3`;
        heading.textContent = question.title;
        options.replaceChildren();
        question.options.forEach((text, choice) => {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'niko-answer-option'; button.dataset.choice = String(choice);
            button.setAttribute('aria-pressed', 'false');
            const letter = document.createElement('span');
            letter.className = 'niko-answer-letter'; letter.textContent = String.fromCharCode(65 + choice); letter.setAttribute('aria-hidden', 'true');
            const label = document.createElement('span'); label.textContent = text; label.lang = 'en';
            button.append(letter, label);
            button.addEventListener('click', event => answer(choice, button, event));
            options.append(button);
        });
        dialog.scrollTop = 0;
        if (focus) heading.focus({ preventScroll: true });
    }
    function answer(choice, selected, event) {
        if (answered) return;
        stopSpeech();
        const question = questions[index];
        const correct = choice === question.correct;
        options.querySelectorAll('button').forEach(button => {
            button.classList.remove('is-retry');
            button.setAttribute('aria-pressed', String(button === selected));
            if (correct) button.disabled = true;
        });
        selected.classList.add(correct ? 'is-correct' : 'is-retry');
        feedback.hidden = false; feedback.dataset.kind = correct ? 'correct' : 'retry';
        feedbackTitle.textContent = correct ? 'ใช่เลย ประโยคนี้ชวนให้คุยต่อ' : 'ลองอีกมุมหนึ่งนะ';
        feedbackText.textContent = correct ? question.explanation : question.retry[choice];
        if (correct) {
            answered = true; learned.add(question.id); save(); renderHome();
            progress.value = index + 1; progress.textContent = `${index + 1} / 3`;
            next.hidden = false; listen.hidden = false;
            next.textContent = index === 2 ? 'สรุปสิ่งที่ได้ฝึก →' : 'สถานการณ์ถัดไป →';
            pose('nod', event);
        } else {
            pose('retry', event);
        }
    }
    function showSummary(focus = false, event) {
        stopSpeech();
        panel.hidden = true; feedback.hidden = true; actions.hidden = true; summary.hidden = false;
        audioStatus.textContent = '';
        count.textContent = 'ฝึกครบ 3 สถานการณ์'; progress.value = 3; progress.textContent = '3 / 3';
        dialog.scrollTop = 0;
        if (focus) document.getElementById('niko-summary-title').focus({ preventScroll: true });
        pose('proud', event);
    }
    function openPractice(event) {
        opener = document.activeElement;
        const coach = document.getElementById('buddy-coach');
        if (coach && !coach.hidden) document.getElementById('coach-close').click();
        document.querySelectorAll('dialog[open]').forEach(open => open.close());
        index = questions.findIndex(question => !learned.has(question.id));
        if (index < 0) { index = 0; showSummary(false, event); }
        else renderQuestion();
        dialog.showModal();
        dialog.scrollTop = 0;
        window.NextSkillAgent?.refresh();
        if (summary.hidden) { heading.focus({ preventScroll: true }); pose('read', event); }
        else document.getElementById('niko-summary-title').focus({ preventScroll: true });
    }
    [start, ...document.querySelectorAll('[data-sea-practice]')].forEach(button => {
        button.addEventListener('click', openPractice);
    });
    document.getElementById('niko-show-hint').addEventListener('click', event => {
        hint.textContent = questions[index].hint; hint.hidden = false;
        pose('think', event);
    });
    next.addEventListener('click', event => {
        if (!answered) return;
        if (index === questions.length - 1) showSummary(true, event);
        else { index++; renderQuestion(true); pose('read', event); }
    });
    document.getElementById('niko-restart-practice').addEventListener('click', event => {
        index = 0; renderQuestion(true); pose('read', event);
    });
    document.getElementById('niko-continue-lesson').addEventListener('click', () => {
        dialog.close();
        document.querySelector('.resume-button')?.click();
    });
    listen.addEventListener('click', event => {
        if (utterance) { stopSpeech(); audioStatus.textContent = 'หยุดเสียงแล้ว ลองอ่านประโยคตามได้เลย'; return; }
        if (!answered || !synth || typeof SpeechSynthesisUtterance === 'undefined') {
            audioStatus.textContent = 'อุปกรณ์นี้ยังไม่มีเสียงอ่าน ลองอ่านตามประโยคที่เลือกได้เลย'; return;
        }
        const voices = synth.getVoices().filter(voice => /^en(?:-|$)/i.test(voice.lang));
        const voice = voices.find(item => /^en-US$/i.test(item.lang) && item.localService) || voices.find(item => /^en-US$/i.test(item.lang)) || voices[0];
        if (!voice) { audioStatus.textContent = 'ยังไม่พบเสียงภาษาอังกฤษบนเครื่องนี้ ลองอ่านตามประโยคด้านบนได้เลย'; return; }
        stopSpeech();
        const token = speechToken;
        utterance = new SpeechSynthesisUtterance(questions[index].options[questions[index].correct]);
        utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = .88; utterance.pitch = 1.04;
        utterance.onstart = () => {
            if (token !== speechToken || !dialog.open) return;
            if (window.NextSkillAgent?.motionAllowed()) robot.dataset.speaking = 'true';
            listen.setAttribute('aria-pressed', 'true'); listen.textContent = 'หยุดเสียงอ่าน';
            audioStatus.textContent = 'ฟังหนึ่งรอบ แล้วลองพูดตามด้วยจังหวะของคุณ';
        };
        utterance.onend = () => {
            if (token !== speechToken) return;
            clearTimeout(speechWatchdog); utterance = null; delete robot.dataset.speaking;
            listen.setAttribute('aria-pressed', 'false'); listen.textContent = 'ฟังประโยคแล้วลองพูดตาม';
            audioStatus.textContent = 'ลองพูดประโยคนี้อีกครั้ง แล้วไปสถานการณ์ถัดไปเมื่อพร้อม';
        };
        utterance.onerror = () => {
            if (token !== speechToken) return;
            stopSpeech(); audioStatus.textContent = 'เปิดเสียงไม่สำเร็จ ลองอ่านประโยคตามได้เลย';
        };
        speechWatchdog = setTimeout(() => {
            if (token !== speechToken) return;
            stopSpeech(); audioStatus.textContent = 'เสียงอ่านหยุดตอบสนอง อ่านประโยคแล้วฝึกต่อได้เลย';
        }, 15000);
        pose('read', event);
        try { synth.speak(utterance); }
        catch { stopSpeech(); audioStatus.textContent = 'เปิดเสียงไม่สำเร็จ ลองอ่านประโยคตามได้เลย'; }
    });
    dialog.addEventListener('cancel', stopSpeech);
    dialog.querySelector('form[method="dialog"]').addEventListener('submit', stopSpeech);
    dialog.addEventListener('close', () => {
        stopSpeech(); renderHome();
        if (!storageAvailable) dialog.querySelector('.niko-practice-note').textContent = 'เบราว์เซอร์นี้บันทึกความก้าวหน้าไม่ได้ · แบบฝึกไม่คิด XP และไม่ใช้หัวใจ';
        if (!document.querySelector('dialog[open]')) {
            const box = opener?.getBoundingClientRect();
            const visible = box && box.width > 0 && box.height > 0 && box.top >= 0 && box.bottom < innerHeight;
            const fallback = innerWidth < 880 ? document.querySelector('.mobile-nav [data-open-dialog="companion-dialog"]') : document.querySelector('.desktop-nav [data-open-dialog="companion-dialog"]');
            (visible ? opener : fallback)?.focus({ preventScroll: true });
        }
    });
    document.getElementById('buddy-tour-start')?.addEventListener('click', () => { if (dialog.open) dialog.close(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopSpeech(); });
    window.addEventListener('pagehide', stopSpeech);
    renderHome();
})();
