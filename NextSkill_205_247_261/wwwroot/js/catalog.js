/* Public course pages enhance normal MVC links. LearningController remains the
   only authority for progress, selection, locks and rewards. No local completion. */
(() => {
    'use strict';
    const page = document.querySelector('[data-course-page]');
    if (!page) return;
    const status = page.querySelector('[data-catalog-status]');
    const eligible = page.dataset.progressEligible === 'true';
    const details = page.hasAttribute('data-course-details');
    let loading = false;
    let selecting = false;
    let latestState;

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
        latestState=state;
        page.querySelectorAll('[data-course-progress]').forEach(wrap => {
            const owner = wrap.closest('[data-course-id]');
            const course = state.courses.find(item => item.courseId === Number(owner.dataset.courseId));
            if (!course) { wrap.hidden = true; return; }
            wrap.hidden = page.hasAttribute('data-catalog-ocean') && !course.hasStarted;
            const ring = wrap.querySelector('[data-progress-ring]');
            const bar = wrap.querySelector('progress');
            bar.value = course.progress;
            bar.hidden = false;
            const label = wrap.querySelector('[data-progress-label]');
            if (ring) {
                label.textContent = course.hasStarted ? `ผ่าน ${course.completedLessons.length}/${course.totalLessons} เกาะ` : 'ยังไม่เริ่ม';
                ring.style.setProperty('--cj-progress', `${bar.value}%`);
                ring.querySelector('[data-progress-percent]').textContent = `${bar.value}%`;
            } else {
                label.textContent = course.hasStarted
                    ? `ผ่านแล้ว ${course.completedLessons.length} จาก ${course.totalLessons} เกาะ · ${bar.value}%` : 'ยังไม่ได้เริ่มเส้นทางนี้';
            }
        });
        page.querySelectorAll('[data-course-start]').forEach(link => {
            const saved=state.courses.find(item=>item.courseId===Number(link.dataset.courseId));
            if(saved&&!selecting)(link.querySelector('[data-course-action-label]')||link).textContent=`${saved.isComplete?'ทบทวนบทเรียน':saved.hasStarted?'เรียนต่อจากเกาะเดิม':page.hasAttribute('data-catalog-ocean')?'เลือกคอร์สนี้':'เริ่มเรียนเกาะแรก'}`;
        });
        const course = state.courses.find(item => item.courseId === Number(page.dataset.courseId));
        if (!course) return;
        page.querySelectorAll('[data-learning-lesson-id]').forEach(row => {
            const lesson = course.lessons.find(item => item.id === Number(row.dataset.learningLessonId));
            if (!lesson) return;
            const label = row.querySelector('[data-lesson-state]');
            row.dataset.status = lesson.status;
            if (lesson.status === 'current') row.setAttribute('aria-current', 'step');
            else row.removeAttribute('aria-current');
            label.textContent = lesson.status === 'completed' ? 'ผ่านแล้ว' : lesson.status === 'locked' ? 'ล็อกอยู่' : course.completedLessons.length ? 'เรียนต่อที่นี่' : 'เริ่มที่นี่';
        });
    }
    async function loadProgress() {
        if (!eligible || loading || page.dataset.canStart === 'false') return;
        loading = true; page.setAttribute('aria-busy', 'true');
        if (!details) message('กำลังโหลดความก้าวหน้าจากระบบการเรียน…');
        try {
            const response = await fetch('/Learning/State', { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
            if (!response.ok) throw new Error(response.status === 401 ? 'เซสชันหมดอายุ เข้าสู่ระบบอีกครั้งเพื่อดูความก้าวหน้า' : 'ยังโหลดความก้าวหน้าไม่ได้ ข้อมูลเดิมยังไม่ถูกเปลี่ยน');
            const state = await response.json();
            if (!Array.isArray(state.courses)) throw new Error('ยังโหลดความก้าวหน้าไม่ได้');
            if(!selecting){displayProgress(state);message('');}
        } catch (error) {
            const progressLabel = details && page.querySelector('[data-progress-label]');
            if (progressLabel && !latestState) progressLabel.textContent = 'ยังแสดงความคืบหน้าไม่ได้';
            message(error.name === 'TimeoutError' ? 'โหลดความก้าวหน้านานกว่าปกติ ลองอีกครั้งได้โดยไม่เริ่มใหม่' : error.message || 'ยังโหลดความก้าวหน้าไม่ได้', true);
        } finally { loading = false; page.removeAttribute('aria-busy'); }
    }
    page.addEventListener('click', async event => {
        const start=event.target.closest('[data-course-start]');
        if(!start||!page.contains(start))return;
        if (selecting) { event.preventDefault(); return; }
        // Anonymous production links use the existing login ReturnUrl directly.
        if (!eligible || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        selecting = true;
        const text=start.querySelector('[data-course-action-label]')||start;
        const label = text.textContent;
        start.setAttribute('aria-disabled', 'true'); start.setAttribute('aria-busy', 'true'); text.textContent = 'กำลังเตรียมเส้นทาง…';
        const voyage=window.NextSkillCourseVoyage;
        voyage?.begin(start);
        try {
            const response = await fetch('/Learning/SelectCourse', {
                method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(15000),
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('#catalog-antiforgery input')?.value || '' },
                body: JSON.stringify({ courseId: Number(start.dataset.courseId) })
            });
            if (response.status === 401) {
                voyage?.cancel();
                location.assign(`/Account/Login?returnUrl=${encodeURIComponent(start.dataset.islandUrl)}`); return;
            }
            const result = await response.json().catch(() => null);
            if (!response.ok) throw new Error(result?.message || 'ยังเปิดเส้นทางไม่ได้ กรุณาลองอีกครั้ง');
            if(!Array.isArray(result?.courses)||!result.courses.some(item=>item.courseId===Number(start.dataset.courseId)&&item.hasStarted))throw new Error('ยังยืนยันคอร์สที่เลือกไม่ได้ กรุณาลองอีกครั้ง');
            displayProgress(result);
            if(voyage)await voyage.navigate(start.dataset.islandUrl,Number(start.dataset.courseId));
            else location.assign(start.dataset.islandUrl);
        } catch (error) {
            voyage?.cancel();
            message(error.name === 'TimeoutError' ? 'การเปิดเส้นทางใช้เวลานาน ลองกดเริ่มอีกครั้งได้ ข้อมูลเดิมยังอยู่' : error.message || 'ยังเปิดเส้นทางไม่ได้');
            status.classList.add('ns-status--error');
            status.setAttribute('tabindex','-1');status.focus();
        } finally {
            selecting = false; start.removeAttribute('aria-disabled'); start.removeAttribute('aria-busy'); text.textContent = label;
            if(latestState)displayProgress(latestState);
        }
    });
    loadProgress();
})();
