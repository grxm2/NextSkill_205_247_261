(() => {
    'use strict';
    const byId = id => document.getElementById(id);
    const detail = byId('island-detail');
    if (!detail) return;

    const detailDialog = byId('island-detail-dialog');
    const slot = byId('island-detail-slot');
    const current = byId('island-current-card');
    const detailStart = byId('detail-start');
    const sheetToggle = byId('island-sheet-toggle');
    const compact = matchMedia('(max-width: 850px), (max-height: 520px)');
    let launch;
    let selectedIsland;

    function reset() {
        if (detailDialog.open) detailDialog.close();
        detail.hidden = true;
        current.hidden = false;
        slot.append(detail);
    }

    function show(lesson, action, trigger) {
        launch = action;
        selectedIsland = trigger;
        const completed = lesson.status === 'completed';
        byId('detail-number').textContent = `บทที่ ${lesson.id}`;
        byId('detail-title').textContent = lesson.displayTitle || lesson.title;
        byId('detail-meta').textContent = completed ? `${lesson.minutes} นาที` : `${lesson.minutes} นาที · รับ ${lesson.xp} XP เมื่อผ่าน`;
        byId('detail-status').textContent = completed ? 'ผ่านด่านนี้แล้ว กลับมาทบทวนได้ทุกเมื่อ' : 'พร้อมเริ่มบทเรียนและแบบฝึกท้ายบท';
        detailStart.textContent = completed ? 'ทบทวนบทเรียน →' : 'เริ่มเรียน →';
        detail.hidden = false;
        if (compact.matches) {
            detailDialog.append(detail);
            detailDialog.showModal();
        } else {
            current.hidden = true;
            detailStart.focus({ preventScroll: true });
        }
    }

    detailStart.addEventListener('click', () => { reset(); launch?.(); });
    byId('detail-back').addEventListener('click', () => {
        reset();
        selectedIsland?.focus({ preventScroll: true });
    });
    byId('detail-sheet-close').addEventListener('click', () => detailDialog.close());
    detailDialog.addEventListener('close', () => { if (!detailDialog.open) reset(); });
    compact.addEventListener('change', reset);
    window.NextSkillIslandDetails = { show, reset };

    sheetToggle.addEventListener('click', () => {
        sheetToggle.setAttribute('aria-expanded', String(sheetToggle.getAttribute('aria-expanded') === 'false'));
    });
    current.closest('.island-dashboard').addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !compact.matches || sheetToggle.getAttribute('aria-expanded') !== 'true') return;
        sheetToggle.setAttribute('aria-expanded', 'false');
        sheetToggle.focus({ preventScroll: true });
    });
})();
