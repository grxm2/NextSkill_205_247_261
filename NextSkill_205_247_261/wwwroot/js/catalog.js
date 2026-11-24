/* Public course pages enhance normal MVC links. LearningController remains the
   only authority for progress, selection, locks and rewards. No local completion. */
(() => {
    'use strict';
    const page = document.querySelector('[data-course-page]');
    if (!page) return;
    const status = page.querySelector('[data-catalog-status]');
    const eligible = page.dataset.progressEligible === 'true';
    const details = page.hasAttribute('data-course-details');
    const catalogLaunchKey = 'nextskill.catalog-course-launch.v1';
    let loading = false;
    let selecting = false;
    let latestState;

    function message(text, retry, retryLabel = 'ลองโหลดอีกครั้ง') {
        status.replaceChildren(document.createTextNode(text));
        status.classList.toggle('ns-status--error', Boolean(retry));
        status.hidden = !text;
        if (retry) {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'ns-button ns-button--compact ns-button--secondary';
            button.textContent = retryLabel; button.addEventListener('click', retry);
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
                label.textContent = course.finalQuizReady ? 'พร้อมสอบท้ายคอร์ส'
                    : course.hasStarted ? `ผ่าน ${course.completedLessons.length}/${course.totalLessons} เกาะ` : 'ยังไม่เริ่ม';
                ring.style.setProperty('--cj-progress', `${bar.value}%`);
                ring.querySelector('[data-progress-percent]').textContent = `${bar.value}%`;
            } else {
                label.textContent = course.hasStarted
                    ? `ผ่านแล้ว ${course.completedLessons.length} จาก ${course.totalLessons} เกาะ · ${bar.value}%` : 'ยังไม่ได้เริ่มเส้นทางนี้';
            }
        });
        page.querySelectorAll('[data-course-start]').forEach(link => {
            const saved = state.courses.find(item => item.courseId === Number(link.dataset.courseId));
            if (!saved || selecting) return;
            const label = link.querySelector('[data-course-action-label]') || link;
            link.hidden = saved.isLocked;
            link.href = saved.finalQuizReady ? `/Learning/FinalQuiz?courseId=${saved.courseId}` : link.dataset.islandUrl;
            label.textContent = saved.isComplete ? 'ทบทวนบทเรียน' : saved.finalQuizReady ? 'ทำแบบทดสอบท้ายคอร์ส'
                : saved.hasStarted ? 'เรียนต่อจากเกาะเดิม' : 'ลงทะเบียนและเริ่มเรียน';
            const note = page.querySelector('[data-course-lock-note]');
            if (!note) return;
            note.hidden = !saved.isLocked;
            if (note.hidden) return;

            let previous = note.querySelector('[data-course-prerequisite]');
            // A page rendered before the lock notice markup changed may still be open.
            if (!previous) {
                note.textContent = 'สอบท้ายคอร์สก่อนหน้าให้ผ่านเพื่อปลดล็อกคอร์สนี้';
                previous = document.createElement('a');
                previous.dataset.coursePrerequisite = '';
                note.append(' ', previous);
            }
            previous.hidden = !(saved.prerequisiteCourseId && saved.prerequisiteCourseTitle);
            if (!previous.hidden) {
                previous.href = `/Home/Details/${saved.prerequisiteCourseId}`;
                previous.textContent = `ดูคอร์ส ${saved.prerequisiteCourseTitle}`;
            }
        });
        const course = state.courses.find(item => item.courseId === Number(page.dataset.courseId));
        if (!course) return;
        page.querySelectorAll('[data-learning-lesson-id]').forEach(row => {
            const lesson = course.lessons.find(item => item.id === Number(row.dataset.learningLessonId));
            if (!lesson) return;
            row.dataset.status = lesson.status;
            if (lesson.status === 'current') row.setAttribute('aria-current', 'step');
            else row.removeAttribute('aria-current');
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
            message(error.name === 'TimeoutError' ? 'โหลดความก้าวหน้านานกว่าปกติ ลองอีกครั้งได้โดยไม่เริ่มใหม่' : error.message || 'ยังโหลดความก้าวหน้าไม่ได้', loadProgress);
        } finally { loading = false; page.removeAttribute('aria-busy'); }
    }

    function rememberIslandArrival(value, courseId) {
        const motion = window.NextSkillMotion?.snapshot();
        if (matchMedia('(prefers-reduced-motion: reduce)').matches || motion?.paused || document.hidden) return;
        const island = new URL(value, location.href);
        try {
            sessionStorage.setItem('nextskill.journey-arrival', JSON.stringify({
                courseId,
                url: island.pathname + island.search,
                at: Date.now(),
                source: details ? 'details' : 'catalog'
            }));
        } catch {}
    }

    function saveCatalogLaunch(start, needsSelection) {
        if (!start.dataset.catalogUrl) return null;
        const catalog = new URL(start.dataset.catalogUrl, location.href);
        try {
            sessionStorage.setItem(catalogLaunchKey, JSON.stringify({
                catalogUrl: catalog.pathname + catalog.search,
                islandUrl: start.dataset.islandUrl,
                courseId: Number(start.dataset.courseId),
                needsSelection,
                at: Date.now()
            }));
            return catalog;
        } catch {
            return null;
        }
    }

    function launchAfterLogin(start, courseId) {
        const catalog = saveCatalogLaunch(start, true);
        const login = new URL(start.dataset.loginUrl, location.href);
        if (catalog) login.searchParams.set('returnUrl', catalog.pathname + catalog.search);
        else rememberIslandArrival(start.dataset.islandUrl, courseId);
        location.assign(login.href);
    }

    function readCatalogLaunch() {
        try {
            const launch = JSON.parse(sessionStorage.getItem(catalogLaunchKey));
            sessionStorage.removeItem(catalogLaunchKey);
            if (!launch || launch.catalogUrl !== location.pathname + location.search) return null;
            const age = Date.now() - launch.at;
            const lifetime = launch.needsSelection ? 900000 : 30000;
            const island = new URL(launch.islandUrl, location.href);
            if (age >= 0 && age < lifetime && island.origin === location.origin
                && /\/learning\/island\/?$/i.test(island.pathname)
                && Number.isSafeInteger(launch.courseId) && launch.courseId > 0
                && Number(island.searchParams.get('courseId')) === launch.courseId) return launch;
        } catch {}
        return null;
    }

    async function selectCourse(courseId) {
        const response = await fetch('/Learning/SelectCourse', {
            method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(15000),
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('#catalog-antiforgery input')?.value || '' },
            body: JSON.stringify({ courseId })
        });
        if (response.status === 401) return null;
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.message || 'ยังเปิดเส้นทางไม่ได้ กรุณาลองอีกครั้ง');
        if (!Array.isArray(result?.courses) || !result.courses.some(item => item.courseId === courseId && item.hasStarted))
            throw new Error('ยังยืนยันคอร์สที่เลือกไม่ได้ กรุณาลองอีกครั้ง');
        return result;
    }

    async function openIsland(islandUrl, courseId, trigger) {
        if (window.NextSkillCourseVoyage) {
            await window.NextSkillCourseVoyage.navigate(islandUrl, courseId, trigger);
        } else {
            rememberIslandArrival(islandUrl, courseId);
            location.assign(islandUrl);
        }
    }

    function showLaunchError(error, retry) {
        message(error.name === 'TimeoutError' ? 'การเปิดเส้นทางใช้เวลานาน ลองอีกครั้งได้ ข้อมูลเดิมยังอยู่' : error.message || 'ยังเปิดเส้นทางไม่ได้',
            retry, 'ลองเดินทางอีกครั้ง');
        status.classList.add('ns-status--error');
        status.tabIndex = -1;
        status.focus();
    }

    async function launchFromCatalog(launch) {
        if (selecting) return;
        selecting = true;
        message('กำลังเตรียมเส้นทาง…');
        try {
            if (launch.needsSelection) {
                const state = eligible && await selectCourse(launch.courseId);
                if (!state) throw new Error('กรุณาเข้าสู่ระบบเพื่อเปิดเส้นทางของคอร์สนี้');
                launch.needsSelection = false;
                displayProgress(state);
            }
            message('');
            await openIsland(launch.islandUrl, launch.courseId, document.getElementById('catalog-title'));
        } catch (error) {
            selecting = false;
            showLaunchError(error, eligible ? () => launchFromCatalog(launch) : undefined);
        }
    }

    function launchAfterCatalogPaint(launch) {
        if (document.hidden) return launchFromCatalog(launch);
        let frame;
        function depart() {
            cancelAnimationFrame(frame);
            document.removeEventListener('visibilitychange', depart);
            launchFromCatalog(launch);
        }
        document.addEventListener('visibilitychange', depart, { once: true });
        // Give the harbor a visible frame before Nimo sails out of it.
        frame = requestAnimationFrame(() => { frame = requestAnimationFrame(depart); });
    }

    page.addEventListener('click', async event => {
        const start=event.target.closest('[data-course-start]');
        if(!start||!page.contains(start))return;
        const courseId = Number(start.dataset.courseId);
        const progress = latestState?.courses.find(course => course.courseId === courseId);
        if (progress?.isLocked) { event.preventDefault(); return; }
        if (progress?.finalQuizReady) return;
        if (selecting) { event.preventDefault(); return; }
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        selecting = true;
        let leaving = false;
        const text=start.querySelector('[data-course-action-label]')||start;
        const label = text.textContent;
        start.setAttribute('aria-disabled', 'true'); start.setAttribute('aria-busy', 'true'); text.textContent = 'กำลังเตรียมเส้นทาง…';
        try {
            const state = eligible && await selectCourse(courseId);
            if (!state) {
                launchAfterLogin(start, courseId);
            } else {
                displayProgress(state);
                const catalog = saveCatalogLaunch(start, false);
                if (catalog) location.assign(catalog.href);
                else await openIsland(start.dataset.islandUrl, courseId, start);
            }
            leaving = true;
        } catch (error) {
            showLaunchError(error);
        } finally {
            selecting = leaving;
            start.removeAttribute('aria-disabled'); start.removeAttribute('aria-busy'); text.textContent = label;
            if (!leaving && latestState) displayProgress(latestState);
        }
    });

    window.addEventListener('pageshow', event => {
        if (!event.persisted) return;
        selecting = false;
        loadProgress();
    });

    // The deferred voyage script must be ready before launching from the new document.
    document.addEventListener('DOMContentLoaded', () => {
        const launch = page.hasAttribute('data-catalog-ocean') && readCatalogLaunch();
        if (launch) launchAfterCatalogPaint(launch);
        else loadProgress();
    }, { once: true });
})();
