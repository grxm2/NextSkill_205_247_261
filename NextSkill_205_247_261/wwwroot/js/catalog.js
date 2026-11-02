/* Public course pages enhance normal MVC links. LearningController remains the
   only authority for progress, selection, locks and rewards. No local completion. */
(() => {
    'use strict';
    const page = document.querySelector('[data-course-page]');
    if (!page) return;
    const status = page.querySelector('[data-catalog-status]');
    const eligible = page.dataset.progressEligible === 'true';
    let loading = false;
    let selecting = false;

    function message(text, retry = false) {
        status.replaceChildren(document.createTextNode(text));
        status.classList.toggle('ns-status--error', retry);
        status.hidden = !text;
        if (retry) {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'ns-button ns-button--compact ns-button--secondary';
            button.textContent = 'ลองโหลดอีกครั้ง'; button.addEventListener('click', loadProgress);
            status.append(button);
        }
    }
    function displayProgress(state) {
        page.querySelectorAll('[data-course-progress]').forEach(wrap => {
            const owner = wrap.closest('[data-course-id]');
            const course = state.courses.find(item => item.courseId === Number(owner.dataset.courseId));
            if (!course) { wrap.hidden = true; return; }
            wrap.hidden = false;
            wrap.querySelector('[data-progress-label]').textContent = course.hasStarted
                ? `ผ่านแล้ว ${course.completedLessons.length} จาก ${course.totalLessons} เกาะ · ${course.progress}%` : 'ยังไม่ได้เริ่มเส้นทางนี้';
            const bar = wrap.querySelector('progress'); bar.value = course.progress;
        });
        const course = state.courses.find(item => item.courseId === Number(page.dataset.courseId));
        if (!course) return;
        const start = page.querySelector('[data-course-start]');
        if (start && !selecting) start.textContent = `${course.isComplete ? 'ทบทวนบทเรียน' : course.hasStarted ? 'เรียนต่อจากเกาะเดิม' : 'เริ่มเรียนเกาะแรก'} →`;
        page.querySelectorAll('[data-learning-lesson-id]').forEach(row => {
            const lesson = course.lessons.find(item => item.id === Number(row.dataset.learningLessonId));
            if (!lesson) return;
            const label = row.querySelector('[data-lesson-state]');
            label.dataset.status = lesson.status;
            label.textContent = lesson.status === 'completed' ? '✓ ผ่านแล้ว · ทบทวนได้' : lesson.status === 'locked' ? 'ยังไม่ปลดล็อก' : 'เกาะถัดไปของคุณ';
        });
    }
    async function loadProgress() {
        if (!eligible || loading) return;
        loading = true; page.setAttribute('aria-busy', 'true');
        message('กำลังโหลดความก้าวหน้าจากระบบการเรียน…');
        try {
            const response = await fetch('/Learning/State', { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
            if (!response.ok) throw new Error(response.status === 401 ? 'เซสชันหมดอายุ เข้าสู่ระบบอีกครั้งเพื่อดูความก้าวหน้า' : 'ยังโหลดความก้าวหน้าไม่ได้ ข้อมูลเดิมยังไม่ถูกเปลี่ยน');
            const state = await response.json();
            if (!Array.isArray(state.courses)) throw new Error('ยังโหลดความก้าวหน้าไม่ได้');
            displayProgress(state); message('');
        } catch (error) {
            message(error.name === 'TimeoutError' ? 'โหลดความก้าวหน้านานกว่าปกติ ลองอีกครั้งได้โดยไม่เริ่มใหม่' : error.message || 'ยังโหลดความก้าวหน้าไม่ได้', true);
        } finally { loading = false; page.removeAttribute('aria-busy'); }
    }
    const start = page.querySelector('[data-course-start]');
    start?.addEventListener('click', async event => {
        if (selecting) { event.preventDefault(); return; }
        // Anonymous production links use the existing login ReturnUrl directly.
        if (!eligible || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        selecting = true;
        const label = start.textContent;
        start.setAttribute('aria-disabled', 'true'); start.setAttribute('aria-busy', 'true'); start.textContent = 'กำลังเตรียมเส้นทาง…';
        try {
            const response = await fetch('/Learning/SelectCourse', {
                method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(15000),
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('#catalog-antiforgery input')?.value || '' },
                body: JSON.stringify({ courseId: Number(start.dataset.courseId) })
            });
            if (response.status === 401) {
                location.assign(`/Account/Login?returnUrl=${encodeURIComponent(start.dataset.islandUrl)}`); return;
            }
            const result = await response.json().catch(() => null);
            if (!response.ok) throw new Error(result?.message || 'ยังเปิดเส้นทางไม่ได้ กรุณาลองอีกครั้ง');
            location.assign(start.dataset.islandUrl);
        } catch (error) {
            message(error.name === 'TimeoutError' ? 'การเปิดเส้นทางใช้เวลานาน ลองกดเริ่มอีกครั้งได้ ข้อมูลเดิมยังอยู่' : error.message || 'ยังเปิดเส้นทางไม่ได้');
            status.classList.add('ns-status--error');
        } finally {
            selecting = false; start.removeAttribute('aria-disabled'); start.removeAttribute('aria-busy'); start.textContent = label;
        }
    });
    loadProgress();
})();
