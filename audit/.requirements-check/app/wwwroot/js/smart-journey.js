(() => {
    'use strict';
    const $ = selector => document.querySelector(selector);
    const $$ = selector => [...document.querySelectorAll(selector)];
    const body = document.body;
    const signedIn = body.dataset.authenticated === 'true';
    const authenticated = signedIn || body.dataset.guestPreview === 'true';
    const dashboard = $('[data-home-dashboard]');
    const islandRoute = $('#lesson-route');
    const islandCourseToggle = $('#island-course-toggle');
    const islandCourseMenu = $('#island-course-menu');
    const islandCourseOptions = $('#island-course-options');
    const lockedHint = 'เรียนด่านก่อนหน้าเพื่อเปิดด่านนี้';
    const stateEndpoint = dashboard || islandRoute ? 'State?includeActivity=true' : 'State';
    const initial = $('#learning-initial-state');
    const boot = initial ? JSON.parse(initial.textContent) : null;
    let state = boot?.state || null;
    let courseId = boot?.course?.courseId || null;
    let catalog = [];
    let catalogRequest;
    let selectionBusy = false;
    let lesson = null;
    let lessonDirty = false;
    let submitting = false;
    let lessonRequest = 0;
    let lessonController;
    let pendingLeave = null;
    let nextLessonId = null;
    let quizOpen = false;
    let dismissQuizHelp;
    let quizHintAnimations = [];
    let quizHintJump;
    let selections = new Map();
    let uncertainAttempt = null;
    let recoveryBusy = false;
    const courseDialog = $('#course-harbor-dialog');
    const lessonDialog = $('#lesson-dialog');
    const lessonPage = !!lessonDialog?.hasAttribute('data-lesson-page');
    const videoPlayer = window.NextSkillLessonVideo;
    const videoLocked = () => !!lesson?.video && !lesson.videoUnlocked;
    const lessonOpen = () => lessonPage || lessonDialog.open;
    const leaveDialog = $('#leave-lesson-dialog');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const guide = $('.map-guide');
    const csrf = $('#smart-antiforgery input')?.value;
    const categoryNames = { 'Development': 'โค้ด', 'Technology': 'เทคโนโลยี', 'Design': 'UX/UI', 'AI': 'การใช้ AI', 'Business': 'ธุรกิจ', 'Language': 'ภาษาอังกฤษ', 'Languages': 'ภาษาอังกฤษ', 'Marketing': 'การตลาด', 'Data': 'ข้อมูล', 'Data Science': 'วิทยาการข้อมูล' };
    const pendingCourseKey = 'nextskill.pending-course';
    const number = value => new Intl.NumberFormat('th-TH').format(value || 0);

    function node(tag, className, text) {
        const result = document.createElement(tag);
        if (className) result.className = className;
        if (text !== undefined) result.textContent = text;
        return result;
    }
    function tell(message) { $('#home-status').textContent = message; }
    function pageError(error) {
        $('#learning-status').hidden = false;
        $('#learning-status-title').textContent = error?.status === 401 ? 'เข้าสู่ระบบเพื่อเรียนต่อ' : 'ยังโหลดความก้าวหน้าไม่ได้';
        showError($('#learning-status-message'), error);
    }
    function showError(target, error) {
        target.replaceChildren(document.createTextNode(error?.message || 'ยังเชื่อมต่อไม่ได้ กรุณาลองอีกครั้ง'));
        if (error?.status === 401) {
            const link = node('a', '', ' เข้าสู่ระบบอีกครั้ง');
            link.href = `/Account/Login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`;
            target.append(link);
        }
        target.hidden = false;
    }
    async function api(path, data, signal, timeout = 10000) {
        const deadline = AbortSignal.timeout(timeout);
        const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
        const response = await fetch(`/Learning/${path}`, {
            method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin',
            headers: data === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
            ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: requestSignal
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
            const error = new Error(result?.message || (response.status === 400 ? 'ข้อมูลหรือสิทธิ์การส่งไม่ครบ กรุณารีเฟรชแล้วลองใหม่' : 'ยังเชื่อมต่อข้อมูลการเรียนไม่ได้ กรุณาลองอีกครั้ง'));
            error.status = response.status;
            error.code = result?.code;
            throw error;
        }
        if (!result) throw new Error('ข้อมูลตอบกลับไม่สมบูรณ์ กรุณาลองเชื่อมต่ออีกครั้ง');
        return result;
    }
    function activeCourse() { return state?.courses.find(course => course.courseId === state.activeCourseId); }
    function viewedCourse() { return state?.courses.find(course => course.courseId === courseId); }
    function targetLesson(course) {
        return course.lessons.find(item => item.id === course.lastLessonId)
            || course.lessons.find(item => item.status === 'current') || course.lessons.at(-1);
    }
    const lessonVoyageKey = id => `nextskill.lesson-voyage.${id}`;
    function nextVoyageStop(course, fromId) {
        if (!course?.completedLessons.includes(fromId)) return;
        const from = course.lessons.findIndex(item => item.id === fromId);
        const next = course.lessons[from + 1];
        if (from >= 0 && next?.status === 'current') return next.id;
    }
    function rememberLessonVoyage(updatedState, courseId, fromId) {
        if (!lessonPage) return;
        const previous = state?.courses.find(course => course.courseId === courseId);
        if (previous?.completedLessons.includes(fromId)) return;
        const toId = nextVoyageStop(updatedState.courses.find(course => course.courseId === courseId), fromId);
        if (toId === undefined) return;
        try { sessionStorage.setItem(lessonVoyageKey(courseId), JSON.stringify({ fromId, toId })); } catch {}
    }
    function resumeLessonVoyage(course) {
        const key = lessonVoyageKey(course.courseId);
        try {
            const saved = sessionStorage.getItem(key);
            if (!saved) return;
            const { fromId, toId } = JSON.parse(saved) || {};
            const clear = () => {
                try { if (sessionStorage.getItem(key) === saved) sessionStorage.removeItem(key); } catch {}
            };
            if (toId === undefined || nextVoyageStop(course, fromId) !== toId) { clear(); return; }
            window.NextSkillArchipelago?.stageLessonVoyage(fromId, toId, clear);
        } catch {}
    }
    function islandArt(id) {
        return id === 1 ? '/images/journey/learning-island-reference-v2.png'
            : `/images/journey/learning-island-stage-${Math.min(id, 6)}.webp`;
    }
    function setState(value) {
        state = value;
        $$('[data-state-xp]').forEach(element => { element.textContent = number(state.xp); });
        $$('[data-state-level]').forEach(element => { element.textContent = number(state.level); });
        $$('.sj-nav-xp').forEach(element => { element.hidden = false; });
        if (courseId) renderIsland();
        renderCourses();
        dashboard?.dispatchEvent(new CustomEvent('nextskill:dashboard-state', { detail: state }));
    }
    function renderIsland() {
        if (!islandRoute) return;
        const course = viewedCourse();
        if (!course) return;
        const current = targetLesson(course);
        const hasProgress = course.completedLessons.length > 0;
        $('#current-island-number').textContent = course.hasFinishedLessons ? `ผ่านครบ ${course.totalLessons} ด่าน` : `บทที่ ${current.id}`;
        $('#current-island-title').textContent = course.isComplete ? 'เรียนจบคอร์สแล้ว' : course.finalQuizReady ? 'พร้อมสอบท้ายคอร์ส' : current.displayTitle || current.title;
        $('#current-lesson-minutes').textContent = `${current.minutes} นาที`;
        $('#current-lesson-time').hidden = course.finalQuizReady;
        const reward = $('#current-lesson-xp');
        reward.textContent = `+${current.xp} XP`;
        reward.parentElement.hidden = course.hasFinishedLessons;
        $('#resume-learning').hidden = course.finalQuizReady;
        $('#island-final-quiz').hidden = !course.finalQuizReady;
        $('#resume-learning-label').textContent = course.isComplete ? 'ทบทวนบทเรียน' : hasProgress ? 'เรียนต่อ' : 'เริ่มเรียน';
        $('#island-stages').replaceChildren(...course.lessons.map(item => {
            const marker = node('li', `island-stage is-${item.status}`);
            const status = item.status === 'completed' ? 'ผ่านแล้ว' : item.status === 'current' ? 'ด่านปัจจุบัน' : 'ล็อกอยู่';
            if (item.status === 'current') marker.setAttribute('aria-current', 'step');
            marker.append(node('span', 'sr-only', `ด่าน ${item.id} ${status}`));
            return marker;
        }));
        renderIslandStats();

        const routeLine = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        routeLine.setAttribute('viewBox', '0 0 600 1000');
        routeLine.setAttribute('preserveAspectRatio', 'none');
        routeLine.setAttribute('aria-hidden', 'true');
        routeLine.classList.add('sj-learning-route-line');
        const routePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        routeLine.append(routePath);
        const stops = course.lessons.map(item => {
            const button = node('button', `sj-lesson-island is-${item.status}`);
            const title = item.displayTitle || item.title;
            button.type = 'button'; button.dataset.lessonId = item.id;
            const locked = item.status === 'locked';
            button.setAttribute('aria-label', `ด่าน ${item.id} ${title} · ${locked ? 'ล็อกอยู่' : item.status === 'completed' ? 'ผ่านแล้ว' : 'ด่านปัจจุบัน'}`);
            button.setAttribute('aria-controls', 'island-detail');
            if (item.status === 'current') button.setAttribute('aria-current', 'step');
            const art = node('img');
            art.src = islandArt(item.id);
            art.alt = '';
            art.width = item.id === 1 ? 1448 : 1104;
            art.height = item.id === 1 ? 1086 : 800;
            if (item.id > 2) art.loading = 'lazy';
            const label = node('h3', '', title);
            const artFrame = node('span', 'island-stop-picture');
            artFrame.append(art, node('span', 'sj-island-index', String(item.id).padStart(2, '0')));
            button.append(artFrame, label);
            if (locked) {
                const lock = node('span', 'icon icon-lock');
                lock.setAttribute('aria-hidden', 'true');
                label.prepend(lock);
            } else {
                button.append(node('span', 'sj-island-status', item.status === 'completed' ? '✓ สำเร็จแล้ว · ทบทวน' : 'ดูรายละเอียดด่าน'));
            }
            button.addEventListener('click', () => guarded(() => {
                const launch = locked ? null : () => openLesson(course.courseId, item.id);
                if (window.NextSkillIslandDetails) window.NextSkillIslandDetails.show(item, launch, button);
                else if (locked) tell(lockedHint);
                else launch();
            }));
            return button;
        });
        const underwaterRoute = islandRoute.querySelector('.island-underwater-route');
        underwaterRoute.replaceChildren(...stops.slice(1));
        underwaterRoute.hidden = stops.length < 2;
        islandRoute.replaceChildren(routeLine, ...stops.slice(0, 1), underwaterRoute);
        resumeLessonVoyage(course);
    }
    function renderIslandStats() {
        const meter = $('#island-level-meter');
        meter.value = state.levelXp;
        $('#island-level-label').textContent = `เลเวล ${number(state.level)}`;
        $('#island-level-xp').textContent = `${number(meter.value)}/${number(meter.max)} XP`;
        meter.title = `ถึงเลเวล ${number(state.level + 1)}`;
        meter.setAttribute('aria-label', `XP ${meter.title}`);
        if (!state.activity) return;

        const streak = $('#island-streak-days');
        streak.textContent = number(state.activity.streakDays);
        streak.parentElement.title = `streak ${streak.textContent} วัน`;
        const goals = state.activity.goals;
        const completed = goals.filter(goal => goal.complete).length;
        const goalTotal = $('#island-goals-total');
        goalTotal.textContent = `${number(completed)}/${number(goals.length)}`;
        goalTotal.parentElement.title = `ภารกิจวันนี้ ${goalTotal.textContent}`;
    }
    function categoryLabel(value) { return categoryNames[value] || value; }
    function courseCard(course) {
        const progress = state?.courses.find(item => item.courseId === course.id);
        const isCurrent = state?.activeCourseId === course.id;
        const card = node('article', `sj-course-card${!course.canStart ? ' is-upcoming' : ''}`);
        card.dataset.kind = course.islandKind;
        const symbols = { english: 'En', ux: 'UX', javascript: 'JS' };
        card.append(node('span', 'sj-course-icon', symbols[course.islandKind] || '+'));
        const info = node('div');
        info.append(node('h3', '', course.title), node('p', 'sj-course-description', course.description));
        const meta = node('div', 'sj-course-small-meta');
        meta.append(node('span', '', categoryLabel(course.category)), node('span', '', course.canStart ? `${course.totalLessons} ด่านเรียนรู้` : 'กำลังเตรียมเส้นทาง'));
        info.append(meta);
        if (progress?.isLocked && progress.prerequisiteCourseTitle) {
            info.append(node('p', 'sj-course-description', `สอบท้ายคอร์ส “${progress.prerequisiteCourseTitle}” ให้ผ่านเพื่อปลดล็อก`));
        }
        card.append(info);
        if (isCurrent) card.append(node('span', 'sj-course-tag', 'คอร์สปัจจุบัน'));
        if (progress?.hasStarted) {
            const wrap = node('div', 'sj-course-progress');
            const caption = node('div'); caption.append(node('span', '', `สำเร็จ ${progress.completedLessons.length}/${progress.totalLessons} ด่าน`), node('strong', '', `${progress.progress}%`));
            const bar = node('progress'); bar.max = progress.totalLessons; bar.value = progress.completedLessons.length; bar.setAttribute('aria-label', `ความก้าวหน้า ${course.title}`);
            wrap.append(caption, bar); card.append(wrap);
        }
        const action = !course.canStart ? 'ยังไม่เปิดให้เรียน' : progress?.isLocked ? 'ล็อกอยู่' : progress?.isComplete ? 'ทบทวน'
            : progress?.finalQuizReady ? 'สอบท้ายคอร์ส' : progress?.hasStarted ? 'เรียนต่อ' : 'ลงทะเบียนและเริ่มเรียน';
        const button = node('button', 'sj-course-action', action);
        button.type = 'button'; button.dataset.selectCourse = course.id;
        button.disabled = !course.canStart || progress?.isLocked === true || selectionBusy;
        button.setAttribute('aria-label', `${button.textContent}: ${course.title}`);
        button.addEventListener('click', () => guarded(() => selectCourse(course.id)));
        card.append(button);
        return card;
    }
    function renderCourses() {
        const query = $('#course-search').value.trim().toLocaleLowerCase();
        const category = $('#course-category').value;
        const sorted = [...catalog].sort((a, b) => Number(b.canStart) - Number(a.canStart));
        $$('[data-course-grid]').forEach(grid => {
            const featured = grid.dataset.courseGrid === 'featured';
            const courses = featured ? sorted.filter(course => course.canStart).slice(0, 3)
                : sorted.filter(course => (category === 'all' || course.category === category) && `${course.title} ${course.description} ${categoryLabel(course.category)}`.toLocaleLowerCase().includes(query));
            grid.replaceChildren(...courses.map(courseCard));
            if (!courses.length) grid.append(node('p', 'sj-course-empty', 'ยังไม่พบคอร์สที่ตรง ลองค้นด้วยคำอื่นหรือเปลี่ยนหมวดหมู่'));
        });
        const active = activeCourse();
        $('#course-picker-current').hidden = !active;
        if (active) $('#course-picker-current').textContent = `กำลังเรียน ${active.title} · ${active.progress}% — เปลี่ยนคอร์สได้ ความก้าวหน้าเดิมยังอยู่`;
    }
    async function loadCatalog() {
        if (catalog.length) return;
        if (catalogRequest) return catalogRequest;
        catalogRequest = api('Catalog').then(result => {
            catalog = result.courses;
            const categories = [...new Set(catalog.map(course => course.category))];
            $('#course-category').replaceChildren(new Option('ทุกทักษะ', 'all'), ...categories.map(category => new Option(categoryLabel(category), category)));
            renderCourses();
        }).catch(error => {
            $$('[data-course-grid]').forEach(grid => {
                const retry = node('button', 'sj-secondary', 'ลองโหลดรายชื่อคอร์สอีกครั้ง'); retry.type = 'button';
                retry.addEventListener('click', () => loadCatalog().catch(() => {}));
                grid.replaceChildren(node('p', 'sj-error', error.message), retry);
            });
            throw error;
        }).finally(() => { catalogRequest = null; });
        return catalogRequest;
    }
    function openDialog(dialog) {
        if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
        window.NextSkillAgent?.refresh();
    }
    function openCourses() {
        $('#course-picker-error').hidden = true;
        openDialog(courseDialog);
        requestAnimationFrame(() => { if (courseDialog.open) courseDialog.dataset.containerOpen = 'true'; });
        loadCatalog().catch(error => showError($('#course-picker-error'), error));
    }
    function setIslandCourseMenu(open, restoreFocus = false) {
        islandCourseMenu.hidden = !open;
        islandCourseToggle.setAttribute('aria-expanded', String(open));
        if (restoreFocus) islandCourseToggle.focus({ preventScroll: true });
    }
    async function loadIslandCourseOptions() {
        islandCourseOptions.replaceChildren(node('li', '', 'กำลังโหลดคอร์ส…'));
        try {
            await loadCatalog();
            const alternatives = catalog.filter(course => course.canStart && course.id !== courseId &&
                !state?.courses.find(progress => progress.courseId === course.id)?.isLocked);
            islandCourseOptions.replaceChildren(...alternatives.map(course => {
                const item = node('li');
                const button = node('button', '', course.title);
                button.type = 'button';
                button.disabled = selectionBusy;
                button.addEventListener('click', () => guarded(() => {
                    setIslandCourseMenu(false, true);
                    selectCourse(course.id);
                }));
                item.append(button);
                return item;
            }));
            if (!alternatives.length) islandCourseOptions.append(node('li', '', 'ยังไม่มีคอร์สอื่นที่เปิดให้เรียน'));
        } catch {
            const retry = node('button', '', 'ลองโหลดรายชื่อคอร์สอีกครั้ง');
            retry.type = 'button';
            retry.addEventListener('click', loadIslandCourseOptions);
            const item = node('li');
            item.append(retry);
            islandCourseOptions.replaceChildren(item);
        }
    }
    async function selectCourse(id) {
        if (selectionBusy) return;
        const selectedCourse = state?.courses.find(course => course.courseId === id);
        if (selectedCourse?.finalQuizReady) {
            location.assign(`/Learning/FinalQuiz?courseId=${id}`);
            return;
        }
        if (!authenticated) {
            try { sessionStorage.setItem(pendingCourseKey, String(id)); } catch {}
            window.NextSkillJourneyTransition?.remember(id);
            location.assign(`/Account/Login?returnUrl=${encodeURIComponent(`/Learning/Island?courseId=${id}`)}`);
            return;
        }
        selectionBusy = true; renderCourses();
        $('#course-picker-error').hidden = true;
        try {
            // Acknowledge the click immediately, even while the server is loading.
            const transition = window.NextSkillJourneyTransition;
            await transition?.begin();
            setState(await api('SelectCourse', { courseId: id }, null, 15000));
            tell('บันทึกคอร์สที่เลือกแล้ว');
            if (window.NextSkillJourneyTransition) await window.NextSkillJourneyTransition.navigate(`/Learning/Island?courseId=${id}`, id);
            else location.assign(`/Learning/Island?courseId=${id}`);
        } catch (error) {
            window.NextSkillJourneyTransition?.cancel();
            openDialog(courseDialog);
            if (error.name === 'TimeoutError') error = new Error('เปิดคอร์สไม่สำเร็จภายใน 15 วินาที กรุณาลองอีกครั้ง');
            showError($('#course-picker-error'), error);
            $('#course-picker-error').setAttribute('role', 'alert');
            tell(error.message);
        }
        finally { selectionBusy = false; renderCourses(); }
    }
    function guarded(action) {
        if (lessonOpen() && lessonDirty && !submitting) {
            pendingLeave = action; openDialog(leaveDialog); return;
        }
        if (submitting) { tell('กำลังบันทึกผล กรุณารอสักครู่'); return; }
        action();
    }
    function closeLesson(navigate = true) {
        lessonDirty = false;
        lessonRequest++;
        lessonController?.abort();
        videoPlayer?.reset();
        uncertainAttempt = null;
        recoveryBusy = false;
        if (lessonDialog.open) lessonDialog.close();
        window.NextSkillAgent?.refresh();
        if (lessonPage && navigate) location.assign(`/Learning/Island?courseId=${courseId}`);
    }
    function clearLesson() {
        dismissQuizHelp?.();
        videoPlayer?.reset();
        lesson = null; lessonDirty = false; nextLessonId = null;
        selections = new Map(); uncertainAttempt = null; quizOpen = false;
        $('#lesson-loading').hidden = false;
        $('#lesson-content').hidden = true;
        $('#lesson-result').hidden = true;
        $('#submission-recovery').hidden = true;
        $('#edit-lesson-answers').hidden = true;
        $('#review-lesson').hidden = true;
        $('#choose-next-course').hidden = true;
        $('#lesson-final-quiz').hidden = true;
        $('#lesson-result-feedback').replaceChildren();
        $('#lesson-error').hidden = true;
        $('#retry-lesson').hidden = true;
        $('#submit-lesson').disabled = false;
        $('#submit-lesson').hidden = true;
        $('#submit-lesson').textContent = 'ตรวจคำตอบ →';
        $('#lesson-title').textContent = 'กำลังเปิดบทเรียน…';
        $('#lesson-summary').textContent = '';
        $('#lesson-questions').replaceChildren();
        $('#lesson-reading').replaceChildren();
    }
    async function openLesson(id, lessonId) {
        if (submitting) return;
        if (!lessonPage || id !== boot?.course?.courseId || lessonId !== boot?.initialLessonId) {
            lessonDirty = false;
            location.assign(`/Learning/Practice?courseId=${id}&lessonId=${lessonId}`);
            return;
        }
        if (courseDialog.open) courseDialog.close();
        const requestId = ++lessonRequest;
        lessonController?.abort(); lessonController = new AbortController();
        const signal = lessonController.signal;
        clearLesson(); openDialog(lessonDialog); lessonDialog.scrollTop = 0;
        $('#retry-lesson').onclick = () => openLesson(id, lessonId);
        try {
            if (state?.activeCourseId !== id || !state?.courses.find(course => course.courseId === id)?.hasStarted) {
                const selected = await api('SelectCourse', { courseId: id }, signal);
                if (requestId !== lessonRequest) return;
                setState(selected);
            }
            const checkpoint = await api('Checkpoint', { courseId: id, lessonId }, signal);
            if (requestId !== lessonRequest) return;
            setState(checkpoint);
            const content = await api(`Lesson?courseId=${id}&lessonId=${lessonId}`, undefined, signal);
            if (requestId !== lessonRequest) return;
            lesson = content;
            mountLessonVideo(content, requestId, signal);
            renderLesson();
        } catch (error) {
            if (error.name === 'AbortError' || requestId !== lessonRequest) return;
            $('#lesson-loading').hidden = true;
            $('#lesson-title').textContent = 'ยังเปิดบทเรียนไม่ได้';
            showError($('#lesson-error'), error);
            $('#retry-lesson').hidden = error.status === 401;
        }
    }
    function mountLessonVideo(content, requestId, signal) {
        if (!content.video) return;
        const watch = { courseId: content.courseId, lessonId: content.id, videoId: content.video.youTubeId };
        videoPlayer?.mount(content, () => api('StartVideo', watch, signal), async ({ positionSeconds, skipVideo }) => {
            const unlocked = await api('CompleteVideo', { ...watch, positionSeconds, skipVideo }, signal);
            if (requestId !== lessonRequest) return;
            lesson = unlocked;
            renderLesson(false);
            showLessonMode(true);
        });
    }
    function stopQuizHintSpeech() {
        quizHintAnimations.forEach(animation => animation.cancel());
        quizHintAnimations = [];
    }
    function stopQuizHintMotion() {
        quizHintJump?.cancel();
        stopQuizHintSpeech();
    }
    function jumpFromQuizButton(slot, trigger) {
        const help = trigger.parentElement;
        const icon = trigger.querySelector('img');
        const button = trigger.getBoundingClientRect();
        const navBottom = $('.ns-navbar')?.getBoundingClientRect().bottom ?? 0;
        const scroll = Math.min(slot.getBoundingClientRect().bottom + 10 - innerHeight, button.top - Math.max(0, navBottom) - 24);
        if (scroll > 0) window.scrollBy({ top: scroll, behavior: 'instant' });

        const from = icon.getBoundingClientRect();
        const to = slot.getBoundingClientRect();
        const x = from.left + (from.width - to.width) / 2 - to.left;
        const y = from.top + (from.height - to.height) / 2 - to.top;
        const scale = from.width / to.width;
        const belowButton = trigger.getBoundingClientRect().bottom - (to.top + to.height / 2) + from.width * .65;
        // Keep the portrait in the icon's column until it clears the button label.
        const pose = (x, y, width, height = width) => `translate(${x}px, ${y}px) scale(${width}, ${height})`;
        const easeOut = getComputedStyle(slot).getPropertyValue('--ease-out').trim();
        help.dataset.nimoEntering = '';
        const animation = slot.animate([
            { transform: pose(x, y, scale) },
            { transform: pose(x, y + 3, scale * 1.08, scale * .92), offset: .14, easing: easeOut },
            { transform: pose(x, y - 15, scale * .96, scale * 1.08), offset: .34 },
            { transform: pose(x * .94, belowButton, scale * 1.05), offset: .61, easing: easeOut },
            { transform: pose(0, 3, 1.04, .96), offset: .84, easing: easeOut },
            { transform: 'none' }
        ], { duration: 400, fill: 'backwards' });
        const flight = { cancel: () => { animation.cancel(); settle(); } };
        function settle() {
            if (quizHintJump !== flight) return;
            quizHintJump = undefined;
            delete help.dataset.nimoEntering;
        }
        quizHintJump = flight;
        animation.finished.then(settle, settle);
        return animation.effect.getTiming().duration;
    }
    function animateQuizHint(slot, event, hop = false) {
        stopQuizHintSpeech();
        if (event.detail === 0 || window.NextSkillMotion?.snapshot({ element: event.currentTarget, kind: 'reaction' }).reactionAllowed !== true) return;
        const face = slot.querySelector('.nimo-speaking-face');
        const mouth = face?.querySelector('.nimo-speaking-mouth');
        if (!face || !mouth) return;
        const speech = { duration: 720, delay: hop ? jumpFromQuizButton(slot, event.currentTarget) : 0 };
        quizHintAnimations.push(
            face.animate([{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 1, offset: .88 }, { opacity: 0 }], speech),
            mouth.animate([.8, .4, 1, .4, .9, .45, 1, .8].map(scale => ({ transform: `scaleY(${scale})` })), speech)
        );
    }
    function createQuizHelp(question, questionNumber) {
        const help = $('#quiz-nimo-help').content.firstElementChild.cloneNode(true);
        const trigger = help.querySelector('.practice-nimo-trigger');
        const reply = help.querySelector('.practice-nimo-reply');
        const slot = help.querySelector('[data-buddy-anchor]');
        const more = help.querySelector('[data-quiz-more]');
        const done = help.querySelector('[data-quiz-done]');
        const extra = help.querySelector('.practice-nimo-extra');
        const hint = question.hint?.trim() || 'ลองสรุปว่าโจทย์ถามหาอะไร แล้วมองหาคำสำคัญในโจทย์นะ';
        const coaching = question.coaching?.trim() || 'ลองตัดตัวเลือกที่ขัดกับเงื่อนไขออกทีละข้อ แล้วอธิบายให้ตัวเองฟังว่าทำไมตัวเลือกที่เหลือจึงเหมาะกับโจทย์';
        reply.id = `quiz-nimo-reply-${questionNumber}`;
        extra.id = `quiz-nimo-extra-${questionNumber}`;
        trigger.setAttribute('aria-label', `ถาม Nimo ข้อที่ ${questionNumber}`);
        trigger.setAttribute('aria-controls', reply.id);
        more.setAttribute('aria-controls', extra.id);
        help.querySelector('[data-quiz-hint]').textContent = hint;
        help.querySelector('[data-quiz-coaching]').textContent = coaching;

        function showExtra(open) {
            extra.hidden = extra.inert = !open;
            more.setAttribute('aria-expanded', String(open));
            more.textContent = open ? 'ซ่อนคำใบ้เพิ่ม' : 'ขอคำใบ้เพิ่ม';
        }
        function close(restoreFocus = false) {
            stopQuizHintMotion();
            trigger.setAttribute('aria-expanded', 'false');
            if (restoreFocus) trigger.focus({ preventScroll: true });
            reply.hidden = reply.inert = true;
            delete slot.dataset.buddyHome;
            dismissQuizHelp = undefined;
            window.NextSkillAgent?.refresh();
        }
        trigger.addEventListener('click', event => {
            if (!reply.hidden) { close(); return; }
            dismissQuizHelp?.();
            showExtra(false);
            reply.hidden = reply.inert = false;
            trigger.setAttribute('aria-expanded', 'true');
            slot.dataset.buddyHome = 'active';
            window.NextSkillAgent?.refresh();
            dismissQuizHelp = close;
            tell(`Nimo ข้อที่ ${questionNumber} ${hint}`);
            animateQuizHint(slot, event, true);
        });
        more.addEventListener('click', event => {
            const open = extra.hidden;
            showExtra(open);
            if (open) {
                tell(`คำใบ้เพิ่ม ${coaching}`);
                animateQuizHint(slot, event);
            } else {
                stopQuizHintSpeech();
                window.NextSkillBuddyMotion?.play('nod', undefined, { motion: event.detail > 0 });
            }
        });
        done.addEventListener('click', event => {
            close(true);
            window.NextSkillBuddyMotion?.play('wave', undefined, { motion: event.detail > 0 });
        });
        help.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || reply.hidden) return;
            event.preventDefault();
            event.stopPropagation();
            close(true);
        });
        return help;
    }
    function renderLesson(focus = true) {
        dismissQuizHelp?.();
        $('#lesson-loading').hidden = true;
        $('#lesson-content').hidden = false;
        $('#lesson-location').textContent = `ด่าน ${lesson.id} · ${lesson.islandName} · ${lesson.minutes} นาที`;
        $('#lesson-title').textContent = lesson.title;
        $('#lesson-summary').textContent = lesson.summary;
        $('#lesson-reading').replaceChildren(...lesson.reading.map(reading => {
            const section = node('section', 'sj-reading-section');
            section.append(node('h3', '', reading.heading), node('p', '', reading.text));
            if (reading.example) section.append(node('pre', 'sj-reading-example', reading.example));
            return section;
        }));
        $('#lesson-questions').replaceChildren(...lesson.questions.map((question, questionIndex) => {
            const field = node('fieldset', 'sj-quiz-question'); field.dataset.questionId = question.id;
            const legend = node('legend', '', `${questionIndex + 1}. ${question.prompt}`); legend.tabIndex = -1;
            field.append(legend);
            if (lessonPage) field.append(createQuizHelp(question, questionIndex + 1));
            question.choices.forEach((choice, index) => {
                const label = node('label', 'sj-quiz-choice');
                const radio = node('input'); radio.type = 'radio'; radio.name = `question-${question.id}`; radio.value = index; radio.required = true;
                radio.checked = selections.get(question.id) === index;
                radio.addEventListener('change', () => { selections.set(question.id, index); lessonDirty = true; updateLessonProgress(); });
                label.append(radio);
                if (lessonPage) label.append(node('span', 'practice-choice-letter', `${String.fromCharCode(65 + index)}.`));
                label.append(node('span', '', choice)); field.append(label);
            });
            return field;
        }));
        $('#lesson-reading-again').textContent = lesson.video ? 'ดูวิดีโออีกครั้ง' : 'กลับไปอ่านบทเรียน';
        if (lessonPage) {
            $('#practice-question-steps').replaceChildren(...lesson.questions.map(() => node('span')));
            const tip = $('#practice-study-tip');
            tip.textContent = lesson.video ? 'เปิดวิดีโอแล้วเลื่อนไปช่วงท้าย หรือกดข้ามเพื่อเริ่มข้อสอบ' : 'ลองทำตามตัวอย่างในบทอ่านก่อนเริ่มแบบทดสอบ';
            tip.hidden = false;
        }
        showLessonMode(false, false);
        if (focus) {
            $('#lesson-title').focus({ preventScroll: true });
            window.NextSkillBuddyMotion?.play('read');
        }
    }
    function showLessonMode(openQuiz, focus = true) {
        if (!lesson) return;
        const total = lesson.questionCount ?? lesson.questions.length;
        quizOpen = openQuiz && !videoLocked() && lesson.questions.length > 0;
        if (!quizOpen) dismissQuizHelp?.();
        $('#lesson-result').hidden = true;
        $('#lesson-content').hidden = false;
        $('#lesson-reading').hidden = quizOpen || !lesson.reading.length;
        videoPlayer?.setVisible(!quizOpen);
        $('#lesson-questions').hidden = !quizOpen;
        $('#practice-question-steps').hidden = !quizOpen;
        $('#lesson-reading-again').hidden = !quizOpen;
        $('#lesson-step-next').hidden = quizOpen;
        $('#lesson-step-next').disabled = videoLocked();
        $('#lesson-step-next').textContent = `เริ่มแบบทดสอบ ${total} ข้อ →`;
        $('#submit-lesson').hidden = !quizOpen;
        $('#lesson-nimo-message').textContent = videoLocked() ? 'เปิดวิดีโอก่อนนะ จะเลื่อนไปช่วงท้ายหรือกดข้ามก็ได้'
            : quizOpen ? 'ตอบให้ครบทุกข้อ เปลี่ยนคำตอบก่อนส่งได้เสมอ' : 'พร้อมแล้วเริ่มทำแบบทดสอบได้เลย';
        updateLessonProgress();
        lessonDialog.scrollTop = 0;
        if (lessonPage) {
            const studyHeading = lesson.video ? 'วิดีโอบทเรียน' : 'บทอ่าน';
            $('#lesson-page-heading').textContent = quizOpen ? 'แบบทดสอบท้ายบท' : studyHeading;
            $('#practice-breadcrumb-current').textContent = $('#lesson-page-heading').textContent;
            $('#lesson-summary').hidden = quizOpen;
            if (focus) positionPractice();
        }
        if (focus) (quizOpen ? $('#lesson-questions legend') : $('#lesson-title')).focus({preventScroll:true});
    }
    function positionPractice() {
        if (innerWidth > 800) window.scrollTo({top:0,behavior:'instant'});
        else $('#practice-panel').scrollIntoView({behavior:'instant',block:'start'});
    }
    function updateLessonProgress() {
        const total = lesson.questionCount ?? lesson.questions.length;
        $('#lesson-step-caption').textContent = quizOpen ? `ตอบแล้ว ${selections.size} / ${total} ข้อ` : `แบบทดสอบ ${total} ข้อ`;
        $('#lesson-step-progress').max = total;
        $('#lesson-step-progress').value = selections.size;
        if (!lessonPage) return;
        const required = lesson.requiredCorrect ?? total;
        $('#practice-answered-count').textContent = `${selections.size} / ${total}`;
        $('#practice-answer-progress').max = total;
        $('#practice-answer-progress').value = selections.size;
        $('#practice-question-count').textContent = `${total} ข้อ`;
        $('#practice-total-score').textContent = `${total} คะแนน`;
        $('#practice-pass-rule').textContent = required === total ? 'ตอบถูกทุกข้อ' : `ถูกอย่างน้อย ${required} จาก ${total} ข้อ`;
        $$('#practice-question-steps span').forEach((segment,index) => {
            segment.classList.toggle('is-answered', selections.has(lesson.questions[index].id));
        });
    }
    function setSubmissionBusy(busy) {
        submitting = busy;
        $$('#lesson-questions input').forEach(input => { input.disabled = busy; });
        ['submit-lesson','close-lesson','lesson-step-next','lesson-reading-again','check-save-status','retry-submission','leave-unconfirmed'].forEach(id => { $('#'+id).disabled = busy; });
        $('#submit-lesson').textContent = busy ? 'กำลังตรวจและบันทึกผล…' : 'ตรวจคำตอบ →';
        $('#lesson-quiz').setAttribute('aria-busy', String(busy));
        if (!busy) $('#lesson-step-next').disabled = videoLocked();
    }
    function setLessonResultActions(course, passed) {
        nextLessonId = passed && !course.hasFinishedLessons ? targetLesson(course).id : null;
        $('#next-island').hidden = !nextLessonId;
        $('#choose-next-course').hidden = !(passed && course.isComplete);
        const finalQuiz = $('#lesson-final-quiz');
        finalQuiz.hidden = !(passed && course.finalQuizReady);
        if (!finalQuiz.hidden) finalQuiz.href = `/Learning/FinalQuiz?courseId=${course.courseId}`;
    }
    function renderResult(result, wasCourseComplete) {
        dismissQuizHelp?.();
        const hadFirstLessonAward = state?.achievements.includes('first-lesson') === true;
        const hadCourseAward = state?.achievements.includes(`course-${lesson.courseId}`) === true;
        lessonDirty = false; uncertainAttempt = null;
        if (result.passed && !result.alreadyCompleted) rememberLessonVoyage(result.state, lesson.courseId, lesson.id);
        setState(result.state);
        $('#submission-recovery').hidden = true;
        $('#lesson-error').hidden = true;
        $('#lesson-content').hidden = true;
        videoPlayer?.setVisible(false);
        const panel = $('#lesson-result'); panel.hidden = false; panel.dataset.passed = String(result.passed);
        if (lessonPage) { $('#lesson-page-heading').textContent = 'ผลแบบทดสอบ'; $('#lesson-summary').hidden = true; }
        $('.sj-result-symbol').textContent = result.passed ? '✓' : '↻';
        $('#lesson-result-eyebrow').textContent = `${result.score} / ${result.totalQuestions} ข้อ · ผ่านเมื่อถูก ${result.requiredCorrect} ข้อ`;
        $('#lesson-result-title').textContent = result.passed ? (result.alreadyCompleted ? 'ทบทวนเรียบร้อยแล้ว' : 'ทำได้แล้ว อีกด่านที่คุณผ่าน!') : 'อีกนิดเดียว ลองใช้คำแนะนำดูนะ';
        $('#lesson-result-message').textContent = result.passed && result.alreadyCompleted
            ? 'ผลการเรียนเดิมอยู่ครบ บทเรียนนี้รับรางวัลแล้ว จึงไม่เพิ่ม XP ซ้ำ' : result.reward;
        $('#lesson-result-feedback').replaceChildren(...result.feedback.map(item => {
            const box = node('article', 'lesson-feedback-item'); box.dataset.correct = String(item.correct);
            const question = lesson.questions.find(q => q.id === item.questionId);
            box.append(node('strong', '', `${item.correct ? '✓' : 'ลองอีกครั้ง'} · ${question?.prompt || 'คำถาม'}`),node('p','',item.explanation));
            return box;
        }));
        const saveCopy = signedIn ? 'บันทึกกับบัญชีแล้ว' : 'บันทึกในโหมดทดลองของเซสชันนี้';
        $('#lesson-reward').textContent = result.awardedXp ? `+${result.awardedXp} XP · ${saveCopy}`
            : result.passed ? `ทบทวนแล้ว · ${saveCopy}` : 'ยังไม่ได้รับ XP ในรอบนี้';
        const progress = viewedCourse();
        setLessonResultActions(progress, result.passed);
        $('#edit-lesson-answers').hidden = result.passed;
        $('#review-lesson').hidden = result.passed;
        $('#finish-learning').textContent = result.passed ? 'กลับไปแผนที่เกาะ' : 'พักไว้ แล้วลองอีกครั้งภายหลัง';
        $('#lesson-nimo-message').textContent = result.passed ? (result.alreadyCompleted ? 'ได้ฝึกอีกครั้งแล้ว เก่งขึ้นทีละก้าวนะ' : 'เห็นความตั้งใจของคุณแล้ว ไปด้วยกันต่อได้เลย') : 'ลองดูคำอธิบาย เราค่อย ๆ แก้ไปด้วยกันนะ';
        if (!result.passed) window.NextSkillBuddyMotion?.play('retry');
        else if (!result.alreadyCompleted) window.NextSkillBuddyMotion?.play(progress.isComplete && !wasCourseComplete ? 'proud' : 'celebrate');
        else window.NextSkillBuddyMotion?.play('nod');
        tell(result.passed ? `ยืนยันผลแล้ว ${saveCopy}` : `ตอบถูก ${result.score} ข้อ ${result.reward}`);
        $('#lesson-result-title').focus({preventScroll:true});
        if (lessonPage) positionPractice();
        else panel.scrollIntoView({behavior:'instant',block:'nearest'});
        window.NextSkillCourseAward?.show(result, lesson.courseId, hadCourseAward, hadFirstLessonAward);
    }
    async function submitLesson(event) {
        event.preventDefault();
        if (submitting || recoveryBusy || !quizOpen || videoLocked()) return;
        const firstUnanswered = lesson.questions.findIndex(question => !selections.has(question.id));
        if (firstUnanswered !== -1) {
            const input = $$('#lesson-questions fieldset')[firstUnanswered].querySelector('input');
            input.focus();
            input.reportValidity();
            tell(`กรุณาเลือกคำตอบข้อที่ ${firstUnanswered + 1} ก่อนส่ง`);
            return;
        }
        await submitAttempt({courseId:lesson.courseId,lessonId:lesson.id,quizVersion:lesson.quizVersion,
            answers:lesson.questions.map(q=>selections.get(q.id))});
    }
    async function submitAttempt(attempt) {
        if (submitting || !lesson) return;
        const requestId = lessonRequest;
        const snapshot = Object.freeze({...attempt,answers:Object.freeze([...attempt.answers])});
        const wasCourseComplete = viewedCourse()?.isComplete;
        setSubmissionBusy(true);
        $('#lesson-error').hidden = true;
        $('#submission-recovery').hidden = true;
        $('#lesson-nimo-message').textContent = 'กำลังตรวจคำตอบและยืนยันการบันทึกให้นะ';
        window.NextSkillBuddyMotion?.play('think');
        try {
            const result = await api('CompleteLesson', snapshot, null, 15000);
            if (requestId !== lessonRequest) return;
            renderResult(result, wasCourseComplete);
        } catch (error) {
            if (requestId !== lessonRequest) return;
            const unknown = !error.status || error.status >= 500;
            if (unknown) {
                uncertainAttempt = snapshot;
                showError($('#lesson-error'), new Error('ยังยืนยันผลการบันทึกไม่ได้ คำตอบของคุณยังอยู่ในหน้านี้'));
                $('#submission-recovery').hidden = false;
            } else {
                showError($('#lesson-error'), error);
                if (error.code === 'video_required' || error.code === 'quiz_changed') {
                    if (error.code === 'video_required') lesson.videoUnlocked = false;
                    $('#submit-lesson').hidden = true;
                    $('#retry-lesson').hidden = false;
                }
            }
            $('#lesson-nimo-message').textContent = error.code === 'quiz_changed'
                ? 'เปิดบทเรียนอีกครั้งเพื่อดูคำถามชุดใหม่'
                : 'ไม่ต้องเริ่มใหม่ คำตอบยังอยู่ เราลองเชื่อมต่ออีกครั้งได้';
        }
        finally {
            if (requestId === lessonRequest) setSubmissionBusy(false);
        }
    }
    async function checkSaveStatus() {
        if (!uncertainAttempt || submitting || recoveryBusy) return;
        const requestId = lessonRequest, attempt = uncertainAttempt;
        recoveryBusy = true; $('#check-save-status').disabled = true;
        try {
            const latest = await api('State', undefined, null, 10000);
            if (requestId !== lessonRequest) return;
            const hadCourseAward = state?.achievements.includes(`course-${attempt.courseId}`) === true;
            const hadFirstLessonAward = state?.achievements.includes('first-lesson') === true;
            rememberLessonVoyage(latest, attempt.courseId, attempt.lessonId);
            setState(latest);
            const course = latest.courses.find(c=>c.courseId===attempt.courseId);
            if (course?.completedLessons.includes(attempt.lessonId)) {
                dismissQuizHelp?.();
                lessonDirty = false;
                $('#lesson-error').hidden = true;
                $('#lesson-content').hidden = true;
                $('#lesson-result').hidden = false;
                $('.sj-result-symbol').textContent = '✓';
                $('#lesson-result-title').textContent = 'ยืนยันแล้วว่าบทเรียนนี้ผ่าน';
                $('#lesson-result-eyebrow').textContent = 'ตรวจสอบจากความก้าวหน้าล่าสุด';
                $('#lesson-result-message').textContent = 'ความก้าวหน้าบันทึกแล้ว หากต้องการคำอธิบายของคำตอบรอบนี้ สามารถส่งคำตอบเดิมอีกครั้งได้ โดยไม่รับ XP ซ้ำ';
                $('#lesson-reward').textContent = `XP สะสมปัจจุบัน ${number(latest.xp)} · ${signedIn?'ข้อมูลบัญชี':'โหมดทดลองของเซสชันนี้'}`;
                $('#lesson-result-feedback').replaceChildren();
                $('#edit-lesson-answers').hidden = true;
                $('#review-lesson').hidden = true;
                setLessonResultActions(course, true);
                $('#lesson-result-title').focus({preventScroll:true});
                window.NextSkillCourseAward?.show({ passed: true, state: latest }, attempt.courseId, hadCourseAward, hadFirstLessonAward);
            } else showError($('#lesson-error'),new Error('ยังไม่พบผลผ่านของบทเรียนนี้ ส่งคำตอบเดิมอีกครั้งเพื่อยืนยันผลได้'));
        } catch(error) { if(requestId===lessonRequest) showError($('#lesson-error'),error); }
        finally { if(requestId===lessonRequest) { recoveryBusy=false; $('#check-save-status').disabled=false; } }
    }
    function resumeLesson() {
        const course = viewedCourse() || activeCourse();
        if (!course) { openCourses(); return; }
        if (course.finalQuizReady) { location.assign(`/Learning/FinalQuiz?courseId=${course.courseId}`); return; }
        if (!courseId) { location.assign(`/Learning/Island?courseId=${course.courseId}`); return; }
        openLesson(course.courseId, targetLesson(course).id);
    }

    $$('[data-smart-action="choose-course"]').forEach(button => button.addEventListener('click', () => guarded(() => {
        if (islandCourseMenu?.contains(button)) setIslandCourseMenu(false, true);
        openCourses();
    })));
    if (islandCourseToggle) {
        const switcher = islandCourseToggle.closest('.island-course-switch');
        islandCourseToggle.addEventListener('click', () => {
            const open = islandCourseMenu.hidden;
            setIslandCourseMenu(open);
            if (open) loadIslandCourseOptions();
        });
        switcher.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || islandCourseMenu.hidden) return;
            setIslandCourseMenu(false, true);
            event.preventDefault();
        });
        switcher.addEventListener('focusout', event => {
            if (!islandCourseMenu.hidden && event.relatedTarget && !switcher.contains(event.relatedTarget)) setIslandCourseMenu(false);
        });
        document.addEventListener('click', event => {
            if (!islandCourseMenu.hidden && !switcher.contains(event.target)) setIslandCourseMenu(false);
        });
        const videoDialog = $('#island-course-video-modal');
        const embed = videoDialog?.querySelector('iframe[data-src]');
        $('#island-video-open')?.addEventListener('click', () => {
            setIslandCourseMenu(false, true);
            if (embed) embed.src = embed.dataset.src;
            videoDialog.showModal();
        });
        videoDialog?.addEventListener('close', () => {
            if (videoDialog.open) return;
            embed?.removeAttribute('src');
            videoDialog.querySelector('video')?.pause();
        });
    }
    $('#course-search').addEventListener('input', renderCourses);
    $('#course-category').addEventListener('change', renderCourses);
    $$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog)?.close()));
    courseDialog.addEventListener('close', () => { delete courseDialog.dataset.containerOpen; window.NextSkillAgent?.refresh(); });
    $('#resume-learning')?.addEventListener('click', () => guarded(resumeLesson));
    $('#close-lesson').addEventListener('click', () => guarded(closeLesson));
    $('#finish-learning').addEventListener('click', () => guarded(closeLesson));
    lessonDialog.addEventListener('cancel', event => { event.preventDefault(); guarded(closeLesson); });
    lessonDialog.addEventListener('close', () => { lessonDirty = false; window.NextSkillAgent?.refresh(); });
    $('#lesson-quiz').addEventListener('change', () => { lessonDirty = true; });
    $('#lesson-quiz').addEventListener('submit', submitLesson);
    $('#lesson-step-next').addEventListener('click', () => showLessonMode(true));
    $('#lesson-reading-again').addEventListener('click', () => showLessonMode(false));
    $('#edit-lesson-answers').addEventListener('click', () => {
        if (!lesson || videoLocked()) return;
        selections.clear();
        $$('#lesson-questions input').forEach(input => { input.checked = false; });
        lessonDirty = false;
        showLessonMode(true);
    });
    $('#review-lesson').addEventListener('click', async event => {
        if (!lesson) return;
        if (!lesson.video) {
            selections.clear();
            lessonDirty = false;
            renderLesson();
            if (lessonPage) positionPractice();
            return;
        }
        const button = event.currentTarget;
        const retake = $('#edit-lesson-answers');
        const requestId = lessonRequest;
        const signal = lessonController.signal;
        button.disabled = retake.disabled = true;
        $('#lesson-error').hidden = true;
        try {
            const restarted = await api('RestartVideo', {
                courseId: lesson.courseId, lessonId: lesson.id, videoId: lesson.video.youTubeId
            }, signal);
            if (requestId !== lessonRequest) return;
            lesson = restarted;
            selections.clear();
            lessonDirty = false;
            mountLessonVideo(lesson, requestId, signal);
            renderLesson();
        } catch (error) {
            if (requestId === lessonRequest) showError($('#lesson-error'), error);
        } finally {
            button.disabled = retake.disabled = false;
        }
    });
    $('#check-save-status').addEventListener('click',checkSaveStatus);
    $('#retry-submission').addEventListener('click',()=> { if(uncertainAttempt&&!recoveryBusy) submitAttempt(uncertainAttempt); });
    $('#leave-unconfirmed').addEventListener('click',()=>guarded(closeLesson));
    $('#choose-next-course').addEventListener('click',()=> { closeLesson(false); openCourses(); });
    async function refreshState() {
        setState(await api(stateEndpoint));
        $('#learning-status').hidden = true;
    }
    $('#retry-learning-state').addEventListener('click',async()=> {
        const button=$('#retry-learning-state'); button.disabled=true;
        try { await refreshState(); }
        catch(error) { pageError(error); }
        finally { button.disabled=false; }
    });
    $('#journey-help-dialog ol li:last-child p').textContent = signedIn ? 'ความก้าวหน้าผูกกับบัญชีของคุณ กลับมาเรียนต่อได้ทุกอุปกรณ์' : 'โหมดทดลองบันทึกแยกในเซสชันนี้ และไม่ย้ายผลเข้าบัญชีอัตโนมัติ';
    $('[data-stay-lesson]').addEventListener('click', () => { pendingLeave = null; leaveDialog.close(); });
    $('[data-confirm-leave]').addEventListener('click', () => {
        const action = pendingLeave; pendingLeave = null; lessonDirty = false; leaveDialog.close(); closeLesson(false); action?.();
    });
    leaveDialog.addEventListener('cancel', () => { pendingLeave = null; });
    $('#next-island').addEventListener('click', async () => { const destination=nextLessonId; if (!destination) return; if(lessonPage){closeLesson();return;} closeLesson(); if(window.NextSkillArchipelago) await window.NextSkillArchipelago.sail(destination); else openLesson(courseId,destination); });
    $('#niko-practice-start').addEventListener('click', () => guarded(resumeLesson));
    $('#buddy-tour-start').addEventListener('click', () => guarded(() => openDialog($('#journey-help-dialog'))));
    $('#locate-current')?.addEventListener('click', event => { window.NextSkillIslandDetails?.reset(); const target = $('#lesson-route .is-current'); if (target && window.NextSkillUnderwater) window.NextSkillUnderwater.goTo(target.dataset.lessonId, !!event.detail && motionAllowed()); else (target || $('#lesson-route')).scrollIntoView({ behavior: event.detail && motionAllowed() ? 'smooth' : 'instant', block: 'center' }); });
    document.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
        if (lessonOpen() && lessonDirty) {
            event.preventDefault(); guarded(() => location.assign(link.href)); return;
        }
        if (link.origin === location.origin && link.pathname === location.pathname && link.hash) {
            const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
            if (target) { event.preventDefault(); target.scrollIntoView({ behavior: event.detail && motionAllowed() ? 'smooth' : 'instant' }); history.replaceState(null, '', link.hash); }
        }
    });
    window.addEventListener('beforeunload', event => {
        if (lessonOpen() && (lessonDirty || submitting)) { event.preventDefault(); event.returnValue = ''; }
    });
    document.addEventListener('nextskill:buddy-pose', event => window.NextSkillBuddyMotion?.play(event.detail.pose, undefined, { motion: event.detail.motion }));

    // Scroll movement is optional; the same controls stay usable without it.
    const layers = $$('[data-parallax-depth]');
    const offsets = new WeakMap();
    let frame = 0;
    let sceneSlot = $('[data-buddy-anchor="arrival"]');
    let paused = false;
    try { paused = JSON.parse(localStorage.getItem('nextskill.agent.v1'))?.paused === true; } catch {}
    function motionAllowed() { return window.NextSkillMotion ? window.NextSkillMotion.snapshot().reactionAllowed : !reduce.matches && !paused && !document.hidden; }
    function syncMotion() {
        if (window.NextSkillMotion) paused=window.NextSkillMotion.snapshot().paused;
        const mode = reduce.matches ? 'reduced' : paused ? 'paused' : 'active';
        if (guide.dataset.motion !== mode) guide.dataset.motion = mode;
        if (body.dataset.motion !== mode) body.dataset.motion = mode;
        const control = $('#sj-motion');
        const pressed = String(!motionAllowed());
        const label = reduce.matches ? 'ลดการเคลื่อนไหวตามอุปกรณ์' : paused ? 'เปิดการเคลื่อนไหว' : 'พักการเคลื่อนไหว';
        if (control.getAttribute('aria-pressed') !== pressed) control.setAttribute('aria-pressed', pressed);
        if (control.textContent !== label) control.textContent = label;
        if (!motionAllowed()) layers.forEach(layer => { layer.style.transform = ''; offsets.delete(layer); });
    }
    function sceneFrame() {
        frame = 0; syncMotion();
        if (motionAllowed()) {
            const measurements = layers.map(layer => ({ layer, rect: layer.getBoundingClientRect(), previous: offsets.get(layer) || 0 }));
            measurements.forEach(({ layer, rect, previous }) => {
                const center = rect.top - previous + rect.height / 2;
                const shift = Math.max(-60, Math.min(60, (innerHeight / 2 - center) * Number(layer.dataset.parallaxDepth)));
                layer.style.transform = `translate3d(0,${shift.toFixed(2)}px,0)`; offsets.set(layer, shift);
            });
        }
        if (body.dataset.journeyMode === 'home' && !document.querySelector('dialog[open]')) {
            const candidates = $$('[data-scene] .sj-mascot-anchor').map(slot => ({ slot, rect: slot.getBoundingClientRect() }));
            const visible = candidates.filter(({ rect }) => rect.bottom > 60 && rect.top < innerHeight - 40);
            const best = visible.sort((a, b) => Math.abs(a.rect.top + a.rect.height / 2 - innerHeight * .58) - Math.abs(b.rect.top + b.rect.height / 2 - innerHeight * .58))[0]?.slot;
            if (best && best !== sceneSlot) {
                if (sceneSlot) sceneSlot.dataset.buddyAnchor = 'harbor';
                best.dataset.buddyAnchor = 'arrival'; sceneSlot = best; window.NextSkillAgent?.refresh();
            }
        }
    }
    function queueScene() { if (!frame) frame = requestAnimationFrame(sceneFrame); }
    $('#buddy-motion').addEventListener('click', () => { if(window.NextSkillMotion) window.NextSkillMotion.togglePaused(); else paused = !paused; syncMotion(); queueScene(); });
    $('#sj-motion').addEventListener('click', () => $('#buddy-motion').click());
    reduce.addEventListener('change', () => { syncMotion(); queueScene(); });
    // The ocean has its own scroll timeline and explicitly owns Nimo's slot.
    // Only run this older parallax/anchor tracker when its elements exist.
    if (layers.length || (body.dataset.journeyMode === 'home' && $('[data-scene] .sj-mascot-anchor'))) {
        window.addEventListener('scroll', queueScene, { passive: true });
    }
    window.addEventListener('resize', queueScene, { passive: true });
    document.addEventListener('visibilitychange', queueScene);
    window.addEventListener('pageshow', queueScene);
    if ((dashboard || islandRoute) && authenticated) {
        window.addEventListener('pageshow', event => {
            if (event.persisted) refreshState().catch(pageError);
        });
    }
    syncMotion(); queueScene();
    window.NextSkillMotion?.subscribe(() => { syncMotion(); queueScene(); });
    if (lessonPage) {
        window.NextSkillMotion?.subscribe(({ reactionAllowed }) => {
            if (!reactionAllowed) stopQuizHintMotion();
        }, { element: lessonDialog, kind: 'reaction' });
        window.addEventListener('resize', stopQuizHintMotion, { passive: true });
    }

    async function start() {
        let failed = false;
        const catalogWork = loadCatalog().catch(error => { failed=true; pageError(error); });
        if (state) setState(state);
        if (authenticated && !state) {
            try { setState(await api(stateEndpoint)); }
            catch (error) { failed=true; pageError(error); tell(error.message); }
        }
        let pending = null;
        try { pending = Number(sessionStorage.getItem(pendingCourseKey)); } catch {}
        if (courseId && pending === courseId && authenticated) {
            try {
                setState(await api('SelectCourse', { courseId }));
                try { sessionStorage.removeItem(pendingCourseKey); } catch {}
                if (!window.NextSkillJourneyTransition?.isArriving && !viewedCourse().finalQuizReady) await openLesson(courseId, targetLesson(viewedCourse()).id);
            } catch (error) { failed=true; pageError(error); }
        } else if (boot?.initialLessonId && authenticated) {
            await openLesson(courseId, boot.initialLessonId);
        } else if (islandRoute && new URLSearchParams(location.search).get('resume') === 'true' && !window.NextSkillArchipelago?.hasLessonVoyage()) {
            const course = viewedCourse();
            const stop = course && !course.finalQuizReady && islandRoute.querySelector(`[data-lesson-id="${targetLesson(course).id}"]`);
            if (stop) {
                stop.scrollIntoView({ block: 'center', behavior: 'instant' });
                stop.click();
            }
        } else if (new URLSearchParams(location.search).get('chooseCourse') === 'true') openCourses();
        await catalogWork;
        return failed ? 'error' : 'ready';
    }
    start().then(status=>document.dispatchEvent(new CustomEvent('nextskill:learning-settled',{detail:{status}})))
        .catch(error=> { pageError(error); tell(error.message); document.dispatchEvent(new CustomEvent('nextskill:learning-settled',{detail:{status:'error'}})); })
        .finally(()=>document.dispatchEvent(new Event('nextskill:learning-ready')));
})();
