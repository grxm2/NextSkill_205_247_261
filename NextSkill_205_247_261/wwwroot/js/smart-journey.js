(() => {
    'use strict';
    const $ = selector => document.querySelector(selector);
    const $$ = selector => [...document.querySelectorAll(selector)];
    const body = document.body;
    const authenticated = body.dataset.authenticated === 'true' || body.dataset.guestPreview === 'true';
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
    const courseDialog = $('#course-harbor-dialog');
    const lessonDialog = $('#lesson-dialog');
    const leaveDialog = $('#leave-lesson-dialog');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const guide = $('.map-guide');
    const csrf = $('#smart-antiforgery input')?.value;
    const categoryNames = { 'Development': 'พัฒนาเว็บไซต์', 'Technology': 'เทคโนโลยี', 'Design': 'ออกแบบ', 'Business': 'ธุรกิจ', 'Language': 'ภาษา', 'Languages': 'ภาษา', 'Marketing': 'การตลาด', 'Data': 'ข้อมูล', 'Data Science': 'วิทยาการข้อมูล' };
    const pendingCourseKey = 'nextskill.pending-course';
    const number = value => new Intl.NumberFormat('th-TH').format(value || 0);

    function node(tag, className, text) {
        const result = document.createElement(tag);
        if (className) result.className = className;
        if (text !== undefined) result.textContent = text;
        return result;
    }
    function tell(message) { $('#home-status').textContent = message; }
    function showError(target, error) {
        target.replaceChildren(document.createTextNode(error?.message || 'ยังเชื่อมต่อไม่ได้ กรุณาลองอีกครั้ง'));
        if (error?.status === 401) {
            const link = node('a', '', ' เข้าสู่ระบบอีกครั้ง');
            link.href = `/Account/Login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`;
            target.append(link);
        }
        target.hidden = false;
    }
    async function api(path, data, signal) {
        const response = await fetch(`/Learning/${path}`, {
            method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin',
            headers: data === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
            ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
            const error = new Error(result?.message || (response.status === 400 ? 'ข้อมูลหรือสิทธิ์การส่งไม่ครบ กรุณารีเฟรชแล้วลองใหม่' : 'ยังเชื่อมต่อข้อมูลการเรียนไม่ได้ กรุณาลองอีกครั้ง'));
            error.status = response.status;
            throw error;
        }
        return result;
    }
    function activeCourse() { return state?.courses.find(course => course.courseId === state.activeCourseId); }
    function viewedCourse() { return state?.courses.find(course => course.courseId === courseId); }
    function targetLesson(course) {
        return course.lessons.find(item => item.id === course.lastLessonId)
            || course.lessons.find(item => item.status === 'current') || course.lessons.at(-1);
    }
    function islandArt(id) {
        return `/images/journey/${id === 2 ? 'rocky-island' : id === 3 ? 'meeting-island' : id >= 4 ? 'presentation-island' : 'destination-island-detailed'}.svg`;
    }
    function setState(value) {
        state = value;
        $$('[data-state-xp]').forEach(element => { element.textContent = number(state.xp); });
        $$('[data-state-level]').forEach(element => { element.textContent = number(state.level); });
        $$('.sj-nav-xp').forEach(element => { element.hidden = false; });
        const active = activeCourse();
        if ($('#home-resume') && active) {
            $('#home-resume').hidden = false;
            $('#home-resume').href = `/Learning/Island?courseId=${active.courseId}`;
            $('#home-resume-title').textContent = `${active.title} · ${active.isComplete ? 'เรียนครบแล้ว พร้อมทบทวน' : `เกาะ ${active.currentIslandId}`}`;
        }
        if (courseId) renderIsland();
        renderCourses();
    }
    function renderIsland() {
        const course = viewedCourse();
        if (!course) return;
        const current = targetLesson(course);
        $('#current-course-title').textContent = course.title;
        $('#current-island-number').textContent = `เกาะ ${course.currentIslandId} / ${course.totalLessons}`;
        $('#current-island-title').textContent = course.isComplete ? 'ครบทุกเกาะแล้ว เก่งขึ้นอีกขั้น!' : current.title;
        $('.sj-island-scene>img').src = islandArt(course.currentIslandId);
        $('#current-island-description').textContent = course.isComplete
            ? 'ทบทวนบทเรียนที่อยากฝึกเพิ่ม หรือเปิดตู้เลือกเส้นทางใหม่ได้ทุกเมื่อ'
            : course.hasStarted ? 'บทเรียนที่ค้างไว้พร้อมแล้ว เรียนต่อได้เลย ไม่ต้องเริ่มการเดินทางใหม่'
                : course.description;
        $('#learner-greeting').textContent = `${course.hasStarted ? 'ยินดีต้อนรับกลับ' : 'พร้อมเริ่มเส้นทางใหม่ไหม'}, ${boot?.learnerName || 'ผู้เรียน'}`;
        $('#current-lesson-minutes').textContent = `${current.minutes} นาที · มีแบบฝึกท้ายบท`;
        $('#current-lesson-xp').textContent = course.isComplete ? 'ทบทวนได้ ไม่เพิ่ม XP ซ้ำ' : `ผ่านบทเรียน รับ ${current.xp} XP`;
        $('#resume-learning').replaceChildren(document.createTextNode(course.isComplete ? 'ทบทวนบทเรียน' : course.hasStarted ? 'เรียนต่อ' : 'เริ่มเรียนเกาะแรก'), node('span', '', '→'));
        $('#course-progress-caption').textContent = `สำเร็จ ${course.completedLessons.length} จาก ${course.totalLessons} เกาะ`;
        $('#course-progress-value').textContent = `${course.progress}%`;
        $('#course-progress').value = course.completedLessons.length;
        $('#course-progress').max = course.totalLessons;
        $('#island-status-tag').replaceChildren(node('i'), document.createTextNode(course.isComplete ? 'สำรวจครบทุกเกาะแล้ว' : `เกาะ ${course.currentIslandId} · ${current.islandName}`));
        $('#niko-learning-message').textContent = course.isComplete ? 'ทำได้แล้ว! จะพักหรือไปเส้นทางใหม่ ฉันไปด้วยนะ' : course.hasStarted ? 'ฉันจำเกาะเดิมได้ พร้อมเมื่อไรก็ไปต่อกันนะ' : 'เริ่มจากบทสั้น ๆ แล้วค่อยไปเกาะถัดไปด้วยกัน';
        $('#achievement-count').textContent = number(state.achievements.length);
        const achievementNames = { 'first-lesson': 'สำเร็จบทเรียนแรก', 'course-13': 'จบเส้นทางอังกฤษเพื่อการทำงาน', 'course-1': 'จบเส้นทาง UX Research', 'course-5': 'จบเส้นทาง JavaScript' };
        $('#achievement-description').textContent = state.achievements.length ? state.achievements.map(id => achievementNames[id] || 'ความสำเร็จใหม่').join(' · ') : 'ผ่านบทเรียนแรก เพื่อรับความสำเร็จแรกของคุณ';
        const route = $('#lesson-route');
        const routeLine = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        routeLine.setAttribute('viewBox', '0 0 600 1000');
        routeLine.setAttribute('preserveAspectRatio', 'none');
        routeLine.setAttribute('aria-hidden', 'true');
        routeLine.classList.add('sj-learning-route-line');
        const routePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        routePath.setAttribute('d', 'M430 105C500 220 100 230 170 355S500 480 430 605 100 740 170 855');
        routeLine.append(routePath);
        route.replaceChildren(...course.lessons.map(item => {
            const button = node('button', `sj-lesson-island is-${item.status}`);
            button.type = 'button'; button.dataset.lessonId = item.id;
            button.disabled = item.status === 'locked';
            button.setAttribute('aria-label', `เกาะ ${item.id}: ${item.title} — ${item.status === 'locked' ? 'ยังไม่ปลดล็อก' : item.status === 'completed' ? 'สำเร็จแล้ว กดทบทวน' : 'กดเริ่มเรียน'}`);
            if (item.status === 'current') button.setAttribute('aria-current', 'step');
            const art = node('img'); art.src = islandArt(item.id); art.alt = ''; art.width = 640; art.height = 440;
            button.append(node('span', 'sj-island-index', String(item.id).padStart(2, '0')), art, node('h3', '', item.title), node('span', 'sj-island-status', item.status === 'locked' ? '🔒 เรียนด่านก่อนหน้าเพื่อเปิดเกาะ' : item.status === 'completed' ? '✓ สำเร็จแล้ว · ทบทวน' : 'เริ่มเกาะนี้ →'));
            button.addEventListener('click', () => guarded(() => window.NextSkillIslandDetails ? window.NextSkillIslandDetails.show(item, course.courseId, () => openLesson(course.courseId, item.id)) : openLesson(course.courseId, item.id)));
            return button;
        }));
        route.prepend(routeLine);
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
        meta.append(node('span', '', categoryLabel(course.category)), node('span', '', course.canStart ? `${course.totalLessons} เกาะเรียนรู้` : 'กำลังเตรียมเส้นทาง'));
        info.append(meta); card.append(info);
        if (isCurrent) card.append(node('span', 'sj-course-tag', 'คอร์สปัจจุบัน'));
        if (progress?.hasStarted) {
            const wrap = node('div', 'sj-course-progress');
            const caption = node('div'); caption.append(node('span', '', `สำเร็จ ${progress.completedLessons.length}/${progress.totalLessons} เกาะ`), node('strong', '', `${progress.progress}%`));
            const bar = node('progress'); bar.max = progress.totalLessons; bar.value = progress.completedLessons.length; bar.setAttribute('aria-label', `ความก้าวหน้า ${course.title}`);
            wrap.append(caption, bar); card.append(wrap);
        }
        const button = node('button', 'sj-course-action', !course.canStart ? 'เร็ว ๆ นี้' : progress?.isComplete ? 'ทบทวน' : progress?.hasStarted ? 'เรียนต่อ' : 'เริ่มเรียน');
        button.type = 'button'; button.dataset.selectCourse = course.id;
        button.disabled = !course.canStart || selectionBusy;
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
        if (!dialog.open) dialog.showModal();
        window.NextSkillAgent?.refresh();
    }
    function openCourses() {
        $('#course-picker-error').hidden = true;
        openDialog(courseDialog);
        requestAnimationFrame(() => { if (courseDialog.open) courseDialog.dataset.containerOpen = 'true'; });
        loadCatalog().catch(error => showError($('#course-picker-error'), error));
    }
    async function selectCourse(id) {
        if (selectionBusy) return;
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
            setState(await api('SelectCourse', { courseId: id }, AbortSignal.timeout(15000)));
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
        if (lessonDialog.open && lessonDirty && !submitting) {
            pendingLeave = action; openDialog(leaveDialog); return;
        }
        if (submitting) { tell('กำลังบันทึกผล กรุณารอสักครู่'); return; }
        action();
    }
    function closeLesson() {
        lessonDirty = false;
        lessonRequest++;
        lessonController?.abort();
        if (lessonDialog.open) lessonDialog.close();
        window.NextSkillAgent?.refresh();
    }
    function clearLesson() {
        lesson = null; lessonDirty = false; nextLessonId = null;
        $('#lesson-loading').hidden = false;
        $('#lesson-content').hidden = true;
        $('#lesson-result').hidden = true;
        $('#lesson-error').hidden = true;
        $('#retry-lesson').hidden = true;
        $('#submit-lesson').disabled = false;
        $('#submit-lesson').hidden = false;
        $('#submit-lesson').textContent = 'ส่งคำตอบ →';
        $('#lesson-title').textContent = 'กำลังเปิดบทเรียน…';
        $('#lesson-summary').textContent = '';
        $('#lesson-questions').replaceChildren();
        $('#lesson-reading').replaceChildren();
    }
    async function openLesson(id, lessonId) {
        if (submitting) return;
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
            lesson = content; renderLesson();
        } catch (error) {
            if (error.name === 'AbortError' || requestId !== lessonRequest) return;
            $('#lesson-loading').hidden = true;
            $('#lesson-title').textContent = 'ยังเปิดบทเรียนไม่ได้';
            showError($('#lesson-error'), error);
            $('#retry-lesson').hidden = error.status === 401;
        }
    }
    function renderLesson() {
        $('#lesson-loading').hidden = true;
        $('#lesson-content').hidden = false;
        $('#lesson-location').textContent = `เกาะ ${lesson.id} · ${lesson.islandName} · ${lesson.minutes} นาที`;
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
            field.append(node('legend', '', `${questionIndex + 1}. ${question.prompt}`));
            question.choices.forEach((choice, index) => {
                const label = node('label', 'sj-quiz-choice');
                const radio = node('input'); radio.type = 'radio'; radio.name = `question-${question.id}`; radio.value = index; radio.required = true;
                label.append(radio, node('span', '', choice)); field.append(label);
            });
            return field;
        }));
        $('#lesson-title').focus({ preventScroll: true });
        window.NextSkillBuddyMotion?.play('read');
    }
    async function submitLesson(event) {
        event.preventDefault();
        if (submitting || !lesson || !$('#lesson-quiz').reportValidity()) return;
        const requestId = lessonRequest;
        const answers = lesson.questions.map(question => Number($(`input[name="question-${question.id}"]:checked`).value));
        submitting = true;
        $$('#lesson-questions input').forEach(input => { input.disabled = true; });
        $('#submit-lesson').disabled = true;
        $('#submit-lesson').textContent = 'กำลังตรวจและบันทึกผล…';
        $('#close-lesson').disabled = true;
        $('#lesson-error').hidden = true;
        try {
            const result = await api('CompleteLesson', { courseId: lesson.courseId, lessonId: lesson.id, answers });
            if (requestId !== lessonRequest) return;
            lessonDirty = false;
            setState(result.state);
            result.feedback.forEach(feedback => {
                const field = $(`#lesson-questions [data-question-id="${feedback.questionId}"]`);
                field.dataset.correct = String(feedback.correct);
                field.querySelector('.sj-question-feedback')?.remove();
                field.append(node('p', 'sj-question-feedback', `${feedback.correct ? '✓' : 'ลองอีกครั้ง'} ${feedback.explanation}`));
            });
            const panel = $('#lesson-result'); panel.hidden = false; panel.dataset.passed = String(result.passed);
            $('.sj-result-symbol').textContent = result.passed ? '✓' : '↻';
            $('#lesson-result-eyebrow').textContent = `${result.score} / ${result.totalQuestions} ข้อ · ผ่านเมื่อถูก ${result.requiredCorrect} ข้อ`;
            $('#lesson-result-title').textContent = result.passed ? (result.alreadyCompleted ? 'ทบทวนเรียบร้อยแล้ว' : 'ทำได้แล้ว อีกเกาะที่คุณผ่าน!') : 'อีกนิดเดียว ลองใช้คำแนะนำดูนะ';
            $('#lesson-result-message').textContent = result.passed ? (result.alreadyCompleted ? 'ผลการเรียนเดิมอยู่ครบ บทเรียนนี้รับรางวัลไปแล้ว จึงไม่เพิ่ม XP ซ้ำ' : result.reward) : 'อ่านคำอธิบายใต้แต่ละข้อ แล้วแก้คำตอบและส่งใหม่ได้ ยังไม่หักคะแนนหรือรีเซ็ตเส้นทาง';
            $('#lesson-reward').textContent = result.awardedXp ? `+${result.awardedXp} XP · บันทึกกับบัญชีแล้ว` : result.passed ? 'ความก้าวหน้าบันทึกไว้แล้ว' : 'ยังไม่ได้รับ XP';
            $('#finish-learning').textContent = result.passed ? 'พักไว้ แล้วกลับมาเรียนต่อ' : 'พักไว้ แล้วลองอีกครั้งภายหลัง';
            const progress = viewedCourse();
            nextLessonId = result.passed && !progress.isComplete ? targetLesson(progress).id : null;
            $('#next-island').hidden = !nextLessonId;
            $('#submit-lesson').hidden = result.passed;
            if (result.passed) {
                $$('#lesson-questions input').forEach(input => { input.disabled = true; });
                window.NextSkillBuddyMotion?.play('celebrate');
            }
            tell(result.passed ? `บันทึกผลแล้ว ได้รับ ${result.awardedXp} XP` : `ตอบถูก ${result.score} ข้อ ลองแก้คำตอบแล้วส่งใหม่ได้`);
            panel.scrollIntoView({ behavior: motionAllowed() ? 'smooth' : 'instant', block: 'nearest' });
        } catch (error) { showError($('#lesson-error'), error); }
        finally {
            submitting = false;
            if (!$('#submit-lesson').hidden) $$('#lesson-questions input').forEach(input => { input.disabled = false; });
            $('#close-lesson').disabled = false;
            $('#submit-lesson').disabled = false;
            $('#submit-lesson').textContent = 'ส่งคำตอบ →';
        }
    }
    function resumeLesson() {
        const course = viewedCourse() || activeCourse();
        if (!course) { openCourses(); return; }
        if (!courseId) { location.assign(`/Learning/Island?courseId=${course.courseId}`); return; }
        openLesson(course.courseId, targetLesson(course).id);
    }

    $$('[data-smart-action="choose-course"]').forEach(button => button.addEventListener('click', () => guarded(openCourses)));
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
    $('[data-stay-lesson]').addEventListener('click', () => { pendingLeave = null; leaveDialog.close(); });
    $('[data-confirm-leave]').addEventListener('click', () => {
        const action = pendingLeave; pendingLeave = null; lessonDirty = false; leaveDialog.close(); closeLesson(); action?.();
    });
    leaveDialog.addEventListener('cancel', () => { pendingLeave = null; });
    $('#next-island').addEventListener('click', async () => { const destination=nextLessonId; if (!destination) return; closeLesson(); if(window.NextSkillArchipelago) await window.NextSkillArchipelago.sail(destination); else openLesson(courseId,destination); });
    $('#niko-practice-start').addEventListener('click', () => guarded(resumeLesson));
    $('#buddy-tour-start').addEventListener('click', () => guarded(() => openDialog($('#journey-help-dialog'))));
    $('#locate-current')?.addEventListener('click', event => (window.NextSkillIslandDetails?.reset(), ($('#lesson-route .is-current') || $('#lesson-route')).scrollIntoView({ behavior: event.detail && motionAllowed() ? 'smooth' : 'instant', block: 'center' })));
    document.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
        if (lessonDialog.open && lessonDirty) {
            event.preventDefault(); guarded(() => location.assign(link.href)); return;
        }
        if (link.origin === location.origin && link.pathname === location.pathname && link.hash) {
            const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
            if (target) { event.preventDefault(); target.scrollIntoView({ behavior: event.detail && motionAllowed() ? 'smooth' : 'instant' }); history.replaceState(null, '', link.hash); }
        }
    });
    window.addEventListener('beforeunload', event => {
        if (lessonDialog.open && (lessonDirty || submitting)) { event.preventDefault(); event.returnValue = ''; }
    });
    document.addEventListener('nextskill:buddy-pose', event => window.NextSkillBuddyMotion?.play(event.detail.pose, undefined, { motion: event.detail.motion }));

    // Scroll movement is optional; the same controls stay usable without it.
    const layers = $$('[data-parallax-depth]');
    const offsets = new WeakMap();
    let frame = 0;
    let sceneSlot = $('[data-buddy-anchor="arrival"]');
    let paused = false;
    try { paused = JSON.parse(localStorage.getItem('nextskill.agent.v1'))?.paused === true; } catch {}
    function motionAllowed() { return !reduce.matches && !paused && !document.hidden; }
    function syncMotion() {
        const mode = reduce.matches ? 'reduced' : paused ? 'paused' : 'active';
        if (guide.dataset.motion !== mode) guide.dataset.motion = mode;
        body.dataset.motion = mode;
        $('#sj-motion').setAttribute('aria-pressed', String(!motionAllowed()));
        $('#sj-motion').textContent = reduce.matches ? 'ลดการเคลื่อนไหวตามอุปกรณ์' : paused ? 'เปิดการเคลื่อนไหว' : 'พักการเคลื่อนไหว';
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
    $('#buddy-motion').addEventListener('click', () => { paused = !paused; syncMotion(); queueScene(); });
    $('#sj-motion').addEventListener('click', () => $('#buddy-motion').click());
    reduce.addEventListener('change', () => { syncMotion(); queueScene(); });
    window.addEventListener('scroll', queueScene, { passive: true });
    window.addEventListener('resize', queueScene, { passive: true });
    document.addEventListener('visibilitychange', queueScene);
    window.addEventListener('pageshow', queueScene);
    syncMotion(); queueScene();

    async function start() {
        loadCatalog().catch(() => {});
        if (state) setState(state);
        if (authenticated && !state) {
            try { setState(await api('State')); }
            catch (error) { showError($('#course-picker-error'), error); tell(error.message); }
        }
        let pending = null;
        try { pending = Number(sessionStorage.getItem(pendingCourseKey)); } catch {}
        if (courseId && pending === courseId && authenticated) {
            try {
                setState(await api('SelectCourse', { courseId }));
                try { sessionStorage.removeItem(pendingCourseKey); } catch {}
                if (!window.NextSkillJourneyTransition?.isArriving) await openLesson(courseId, targetLesson(viewedCourse()).id);
            } catch (error) { showError($('#lesson-error'), error); }
        } else if (boot?.initialLessonId && authenticated) {
            await openLesson(courseId, boot.initialLessonId);
        } else if (new URLSearchParams(location.search).get('chooseCourse') === 'true') openCourses();
    }
    start().catch(error => tell(error.message)).finally(() => document.dispatchEvent(new Event('nextskill:learning-ready')));
})();
