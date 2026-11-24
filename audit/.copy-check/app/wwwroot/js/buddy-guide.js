(() => {
    'use strict';
    const panel = document.getElementById('buddy-coach');
    const start = document.getElementById('buddy-tour-start');
    if (!panel || !start) return;
    const robot = document.querySelector('#nextskill-agent .skill-buddy');
    const next = document.getElementById('coach-next');
    const back = document.getElementById('coach-back');
    const voiceButton = document.getElementById('coach-voice');
    const replay = document.getElementById('coach-replay');
    const audioStatus = document.getElementById('coach-audio-status');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const guide = document.querySelector('.map-guide');
    const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
    const supportsVoice = synth && 'SpeechSynthesisUtterance' in window;
    let index = 0;
    let voiceEnabled = false;
    let speechToken = 0;
    let utterance;
    let gestureTimer;
    let highlight;
    let travelAnimation;
    let speechWatchdog;
    let awaitingVoice = false;
    let voiceWaitTimer;

    function steps() {
        const name = panel.querySelector('[data-buddy-name]').textContent;
        const learner = guide?.dataset.learner || 'เพื่อน';
        const lesson = document.querySelector('.journey-step.current [data-lesson-title]')?.dataset.lessonTitle || 'บทเรียนถัดไป';
        return [
            { target: '#learning-path', title: `สวัสดี ${learner}! ฉัน ${name}`, text: 'ฉันจะพาดูว่าเริ่มตรงไหน วันนี้ไม่ต้องทำทุกอย่าง ลองเรียนรู้สิ่งเล็ก ๆ สักหนึ่งอย่างก็พอ', english: `Hi ${learner}, I’m ${name}, your study guide. Let me show you where to start. One small step is enough for today.` },
            { target: '.journey-step.current', title: `ลองเริ่มที่ ${lesson}`, text: 'ด่านสีฟ้าคือบทเรียนถัดไปของคุณ เราจะฝึกเสนอความคิดเห็นอย่างสุภาพ ลองเริ่มด้วย “Could we try…” แล้วค่อยดูตัวอย่างไปด้วยกัน', english: `The blue level is your next lesson, ${lesson}. We’ll practise making a polite suggestion. Try starting with, Could we try? Then explore the examples at your own pace.` },
            { target: '#daily-quests', title: 'เป้าหมายเล็ก ๆ ที่ทำได้วันนี้', text: 'แค่ลองเรียนหนึ่งบทก็เป็นก้าวที่ดีแล้ว ถ้ายังไม่มั่นใจ กลับมาทบทวนหรือพักก่อนได้ เมื่อพร้อม เรามาเปิดตัวอย่างบทเรียนกัน', english: 'One lesson is a good small goal. You can always review or take a break. When you’re ready, let’s open your next lesson preview.' }
        ];
    }
    function stopSpeech() {
        speechToken++;
        clearTimeout(speechWatchdog);
        clearTimeout(voiceWaitTimer);
        awaitingVoice = false;
        if (synth) synth.cancel();
        utterance = null;
        delete robot.dataset.speaking;
    }
    function syncVoiceButtons() {
        voiceButton.setAttribute('aria-pressed', String(voiceEnabled));
        voiceButton.textContent = voiceEnabled ? 'หยุดเสียงบรรยาย' : 'เปิดเสียงบรรยาย';
        replay.hidden = !voiceEnabled;
    }
    function speak() {
        stopSpeech();
        if (!voiceEnabled || panel.hidden) return;
        if (!supportsVoice) {
            voiceEnabled = false; syncVoiceButtons();
            audioStatus.textContent = 'เบราว์เซอร์นี้ยังไม่มีระบบเสียง อ่านคำแนะนำด้านบนได้เลย';
            return;
        }
        const voices = synth.getVoices();
        if (!voices.length) {
            awaitingVoice = true;
            audioStatus.textContent = 'กำลังตรวจเสียงที่อุปกรณ์รองรับ…';
            voiceWaitTimer = setTimeout(() => {
                if (!awaitingVoice) return;
                awaitingVoice = false; voiceEnabled = false; syncVoiceButtons();
                audioStatus.textContent = 'ยังไม่พบเสียงบนอุปกรณ์นี้ อ่านข้อความหรือกดเปิดเสียงเพื่อลองใหม่ได้';
            }, 2200);
            return;
        }
        const thai = voices.filter(voice => /^th(?:-|$)/i.test(voice.lang));
        const english = voices.filter(voice => /^en(?:-|$)/i.test(voice.lang));
        const selected = thai.find(voice => voice.localService) || thai[0] || english.find(voice => voice.localService) || english[0];
        if (!selected) {
            voiceEnabled = false; syncVoiceButtons();
            audioStatus.textContent = 'ยังไม่มีเสียงภาษาไทยหรืออังกฤษที่ใช้ได้บนอุปกรณ์นี้ อ่านคำแนะนำแทนได้เลย';
            return;
        }
        const token = speechToken;
        const step = steps()[index];
        utterance = new SpeechSynthesisUtterance(thai.length ? `${step.title} ${step.text}` : step.english);
        utterance.voice = selected; utterance.lang = selected.lang; utterance.rate = .95; utterance.pitch = 1.06;
        utterance.onstart = () => {
            if (token !== speechToken || panel.hidden) return;
            if (!reduce.matches && guide?.dataset.motion === 'active') robot.dataset.speaking = 'true';
            audioStatus.textContent = thai.length ? 'กำลังบรรยาย · เสียงจากอุปกรณ์ของคุณ' : 'กำลังบรรยายภาษาอังกฤษ · เครื่องนี้ยังไม่มีเสียงภาษาไทย';
        };
        utterance.onend = () => {
            if (token !== speechToken) return;
            clearTimeout(speechWatchdog); delete robot.dataset.speaking;
            audioStatus.textContent = 'จบคำแนะนำแล้ว กดถัดไปเมื่อพร้อม';
        };
        utterance.onerror = () => {
            if (token !== speechToken) return;
            clearTimeout(speechWatchdog); delete robot.dataset.speaking;
            voiceEnabled = false; syncVoiceButtons();
            audioStatus.textContent = 'เปิดเสียงไม่สำเร็จ อ่านคำแนะนำแล้วกดถัดไปได้เลย';
        };
        // Some engines fail without delivering an error callback. Keep the text tour usable.
        speechWatchdog = setTimeout(() => {
            if (token !== speechToken) return;
            stopSpeech(); voiceEnabled = false; syncVoiceButtons();
            audioStatus.textContent = 'เสียงหยุดตอบสนอง อ่านคำแนะนำต่อได้เลย';
        }, 60000);
        synth.speak(utterance);
    }
    function position(motion) {
        const oldLeft = panel.getBoundingClientRect().left;
        travelAnimation?.cancel();
        const width = panel.getBoundingClientRect().width;
        const mobile = innerWidth <= 600;
        const desired = mobile ? 12 : index === 1 ? innerWidth - width - 18 : index === 2 ? (innerWidth - width) / 2 : 18;
        panel.style.left = `${Math.max(12, desired)}px`;
        if (motion && !reduce.matches && guide?.dataset.motion === 'active') {
            gestureTimer = setTimeout(() => { if (!panel.hidden) window.NextSkillBuddyMotion?.play(index === 1 ? 'point' : index === 2 ? 'cheer' : 'wave', robot); }, 900);
        }
    }
    function showStep(motion) {
        clearTimeout(gestureTimer);
        stopSpeech();
        highlight?.classList.remove('buddy-tour-target');
        const step = steps()[index];
        document.getElementById('coach-title').textContent = step.title;
        document.getElementById('coach-caption').textContent = step.text;
        document.getElementById('coach-count').textContent = `${index + 1} / 3`;
        back.disabled = index === 0;
        next.textContent = index === 2 ? 'เปิดตัวอย่างบทเรียน →' : 'ถัดไป →';
        highlight = document.querySelector(step.target);
        highlight?.classList.add('buddy-tour-target');
        highlight?.scrollIntoView({ block: 'center', behavior: motion && !reduce.matches ? 'smooth' : 'instant' });
        panel.hidden = false;
        position(motion);
        window.NextSkillAgent?.visit('coach', { motion });
        window.NextSkillBuddyMotion?.refresh();
        audioStatus.textContent = 'อ่านคำแนะนำได้เลย หรือเปิดเสียงเพื่อฟัง';
        if (voiceEnabled) speak();
    }
    function close(restoreFocus = true) {
        clearTimeout(gestureTimer); travelAnimation?.cancel();
        stopSpeech(); voiceEnabled = false; syncVoiceButtons();
        panel.hidden = true; highlight?.classList.remove('buddy-tour-target');
        window.NextSkillAgent?.resume();
        window.NextSkillBuddyMotion?.refresh();
        if (restoreFocus) start.focus({preventScroll:true});
    }
    start.addEventListener('click', event => { index = 0; showStep(event.detail > 0); next.focus({preventScroll:true}); });
    next.addEventListener('click', event => {
        if (index < 2) { index++; showStep(event.detail > 0); }
        else {
            close(false);
            const lesson = document.querySelector('.journey-step.current [data-lesson-title]');
            lesson?.click();
        }
    });
    back.addEventListener('click', event => { if (index > 0) { index--; showStep(event.detail > 0); } });
    document.getElementById('coach-close').addEventListener('click', () => close());
    voiceButton.addEventListener('click', () => {
        voiceEnabled = !voiceEnabled; syncVoiceButtons();
        if (voiceEnabled) speak(); else { stopSpeech(); audioStatus.textContent = 'ปิดเสียงแล้ว อ่านคำแนะนำต่อได้เลย'; }
    });
    replay.addEventListener('click', speak);
    synth?.addEventListener('voiceschanged', () => { if (awaitingVoice && voiceEnabled && !panel.hidden) speak(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); close(); } });
    document.addEventListener('nextskill:agent-rest', () => { if (!panel.hidden) close(false); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !panel.hidden) { stopSpeech(); voiceEnabled = false; syncVoiceButtons(); audioStatus.textContent = 'พักเสียงไว้แล้ว กดเปิดเสียงอีกครั้งเมื่อพร้อม'; } });
    document.querySelectorAll('[data-open-dialog]').forEach(button => button.addEventListener('click', () => { if (!panel.hidden) close(false); }));
    window.addEventListener('resize', () => { if (!panel.hidden) position(false); });
    reduce.addEventListener('change', () => { if (reduce.matches) { travelAnimation?.cancel(); clearTimeout(gestureTimer); delete robot.dataset.speaking; } });
    if (guide) new MutationObserver(() => { if (guide.dataset.motion !== 'active') { travelAnimation?.cancel(); clearTimeout(gestureTimer); delete robot.dataset.speaking; } }).observe(guide, { attributes:true, attributeFilter:['data-motion'] });
    window.addEventListener('pagehide', () => close(false));
})();
