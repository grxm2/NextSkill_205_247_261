(() => {
    'use strict';
    const byId = id => document.getElementById(id);
    const detail = byId('island-detail');
    if (!detail) return;

    const detailDialog = byId('island-detail-dialog');
    const slot = byId('island-detail-slot');
    const current = byId('island-current-card');
    const detailTitle = byId('detail-title');
    const detailStart = byId('detail-start');
    const compact = matchMedia('(width < 1024px), (height < 480px)');
    let launch;
    let selectedIsland;

    function reset(restoreFocus = false) {
        if (detailDialog.open) detailDialog.close();
        detail.hidden = true;
        current.hidden = false;
        slot.append(detail);
        if (restoreFocus) selectedIsland?.focus({ preventScroll: true });
    }

    function show(lesson, action, trigger) {
        launch = action;
        selectedIsland = trigger;
        const completed = lesson.status === 'completed';
        const locked = lesson.status === 'locked';
        byId('detail-number').textContent = `บทที่ ${lesson.id}`;
        detailTitle.textContent = lesson.displayTitle || lesson.title;
        byId('detail-meta').textContent = completed ? `${lesson.minutes} นาที` : `${lesson.minutes} นาที · รับ ${lesson.xp} XP เมื่อผ่าน`;
        byId('detail-status').textContent = locked ? 'ผ่านด่านก่อนหน้าเพื่อปลดล็อกด่านนี้'
            : completed ? 'ผ่านด่านนี้แล้ว กลับมาทบทวนได้ทุกเมื่อ' : 'พร้อมเริ่มบทเรียนและแบบฝึกท้ายบท';
        detailStart.hidden = locked;
        detailStart.textContent = completed ? 'ทบทวนบทเรียน →' : 'เริ่มเรียน →';
        detail.hidden = false;
        if (compact.matches) {
            detailDialog.append(detail);
            detailDialog.showModal();
        } else {
            current.hidden = true;
        }
        detailTitle.focus({ preventScroll: true });
    }

    detailStart.addEventListener('click', () => { reset(); launch?.(); });
    byId('detail-back').addEventListener('click', () => reset(true));
    byId('detail-sheet-close').addEventListener('click', () => detailDialog.close());
    detailDialog.addEventListener('close', () => { if (!detailDialog.open && !detail.hidden) reset(true); });
    compact.addEventListener('change', () => { if (!detail.hidden) reset(true); });
    window.NextSkillIslandDetails = { show, reset };
})();
