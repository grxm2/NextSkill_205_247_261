(() => {
    'use strict';
    const page = document.querySelector('.enrollment-page');
    if (!page) return;
    const tabs = [...document.querySelectorAll('[data-course-tab]')];
    const panels = [...document.querySelectorAll('.course-tab-panel')];
    const message = document.getElementById('course-coach-message');
    const robot = document.querySelector('.skill-buddy');
    const help = document.getElementById('niko-course-help');
    const enroll = document.getElementById('enroll-course');
    const next = document.getElementById('enrollment-continue');
    const note = document.getElementById('enrollment-save-note');
    const heading = document.getElementById('enrollment-start-title');
    const storageKey = `nextskill.enrollment.${page.dataset.courseId}.v1`;
    const guidance = {
        overview: 'เริ่มทีละบท แล้วค่อยเก่งขึ้นด้วยกันนะ',
        syllabus: 'เลือกยูนิต แล้วเปิดดูบทเรียนข้างในได้เลย'
    };
    let enrolled = false;
    let storageAvailable = true;
    let helpStep = 0;
    let activeTab = 'overview';
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        enrolled = saved?.version === 1 && saved.courseId === page.dataset.courseId && saved.enrolled === true;
    } catch {}

    function pose(name, event) {
        window.NextSkillBuddyMotion?.play(name, robot, { motion: event?.detail > 0 });
    }
    function say(text, name, event) {
        message.textContent = text;
        if (name) pose(name, event);
    }
    function selectTab(name, { focus = false, updateUrl = true, event } = {}) {
        if (!Object.hasOwn(guidance, name)) name = 'overview';
        activeTab = name;
        tabs.forEach(tab => {
            const active = tab.dataset.courseTab === name;
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            if (active && focus) tab.focus({ preventScroll: true });
        });
        panels.forEach(panel => { panel.hidden = panel.id !== `course-panel-${name}`; });
        if (updateUrl) history.replaceState(null, '', `#${name}`);
        say(guidance[name], event ? 'point' : null, event);
    }
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', event => selectTab(tab.dataset.courseTab, { event }));
        tab.addEventListener('keydown', event => {
            let target;
            if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
            if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
            if (event.key === 'Home') target = 0;
            if (event.key === 'End') target = tabs.length - 1;
            if (target === undefined) return;
            event.preventDefault();
            selectTab(tabs[target].dataset.courseTab, { focus: true });
        });
    });
    window.addEventListener('hashchange', () => selectTab(location.hash.slice(1), { updateUrl: false }));

    help.addEventListener('click', event => {
        document.getElementById('course-coach-tools').open = true;
        if (helpStep % 2 === 0) {
            say('ถ้าอ่านประโยคพื้นฐานได้ และอยากสื่อสารกับทีมอย่างมั่นใจ คอร์สนี้เป็นจุดเริ่มที่ดี ลองฝึก 1 นาทีก่อนก็ได้นะ', 'think', event);
            help.firstChild.textContent = 'เริ่มจากตรงไหนดี? ';
        } else {
            selectTab('syllabus', { event });
            document.getElementById('course-unit-1').open = true;
            say('เริ่มที่ Everyday introductions ในยูนิต 1 ก่อน แล้วค่อยไปถึง Feedback patterns ฉันมีแบบฝึกสั้นให้ลองด้วยนะ', 'point', event);
            help.firstChild.textContent = 'คอร์สนี้เหมาะกับฉันไหม? ';
        }
        helpStep++;
    });
    function renderEnrollment() {
        enroll.hidden = enrolled;
        next.hidden = !enrolled;
        heading.textContent = enrolled ? 'พร้อมเรียนแล้ว' : 'เริ่มเมื่อคุณพร้อม';
        note.textContent = !storageAvailable ? 'บันทึกในเบราว์เซอร์ไม่ได้ · สถานะนี้อยู่ชั่วคราว'
            : enrolled ? 'ลงทะเบียนตัวอย่างแล้ว · เฉพาะเบราว์เซอร์นี้' : 'ลงทะเบียนตัวอย่าง · บันทึกในเบราว์เซอร์นี้';
    }
    enroll.addEventListener('click', event => {
        enrolled = true;
        try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, courseId: page.dataset.courseId, enrolled: true })); }
        catch { storageAvailable = false; }
        renderEnrollment();
        say('พร้อมแล้ว! เส้นทาง 16 ด่านรออยู่ กดไปเส้นทางเรียน แล้วเริ่มทีละบทด้วยกันนะ', 'celebrate', event);
        next.focus({ preventScroll: true });
    });
    window.addEventListener('storage', event => {
        if (event.key !== storageKey && event.key !== null) return;
        try { const saved = JSON.parse(localStorage.getItem(storageKey)); enrolled = saved?.version === 1 && saved.courseId === page.dataset.courseId && saved.enrolled === true; }
        catch { enrolled = false; }
        renderEnrollment();
        say(enrolled ? 'พร้อมแล้ว ไปเส้นทางเพื่อเริ่มบทเรียนกันนะ' : guidance[activeTab]);
    });
    document.getElementById('course-preview-practice').addEventListener('click', () => {
        document.getElementById('course-preview-dialog').close();
        document.getElementById('niko-practice-start').click();
    });
    renderEnrollment();
    selectTab(location.hash.slice(1) || 'overview', { updateUrl: false });
    if (enrolled) say('พร้อมแล้ว ไปเส้นทางเพื่อเริ่มบทเรียนกันนะ');
})();
