(() => {
    // ==========================================
    // State & Initial Data
    // ==========================================
    let courses = [];
    let questions = [];

    async function postAdminContent(url, payload) {
        const token = document.querySelector('#admin-antiforgery input')?.value;
        if (!token) throw new Error('กรุณาเปิดหน้านี้ใหม่ก่อนบันทึกข้อมูล');

        const headers = { 'X-CSRF-TOKEN': token };
        const isForm = payload instanceof FormData;
        if (!isForm) headers['Content-Type'] = 'application/json';
        let response;
        try {
            response = await fetch(url, {
                method: 'POST', credentials: 'same-origin', headers,
                body: isForm ? payload : JSON.stringify(payload)
            });
        } catch {
            throw new Error('เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง');
        }

        const data = await response.json().catch(() => null);
        if (!response.ok || data?.success !== true) {
            throw new Error(data?.message || 'ทำรายการไม่สำเร็จ กรุณาเปิดหน้านี้ใหม่แล้วลองอีกครั้ง');
        }
        return data;
    }

    function normalizeCourse(c) {
        if (!c) return null;
        return {
            id: c.id ?? c.Id ?? 0,
            title: c.title ?? c.Title ?? '',
            category: c.category ?? c.Category ?? 'Technology',
            level: c.level ?? c.Level ?? 'Beginner',
            instructor: c.instructor ?? c.Instructor ?? '',
            units: c.units ?? c.Units ?? (c.lessons ? c.lessons.length : (c.Lessons ? c.Lessons.length : 4)),
            description: c.description ?? c.Description ?? '',
            videoUrl: c.videoUrl ?? c.VideoUrl ?? '',
            skills: c.skills ?? c.Skills ?? [],
            featured: c.featured ?? c.Featured ?? false,
            lessons: c.lessons ?? c.Lessons ?? []
        };
    }

    function normalizeQuestion(q) {
        if (!q) return null;
        return {
            id: q.id ?? q.Id ?? '',
            courseId: q.courseId ?? q.CourseId ?? 0,
            courseTitle: q.courseTitle ?? q.CourseTitle ?? '',
            lessonId: q.lessonId ?? q.LessonId ?? 0,
            lessonTitle: q.lessonTitle ?? q.LessonTitle ?? '',
            prompt: q.prompt ?? q.Prompt ?? '',
            choices: q.choices ?? q.Choices ?? [],
            correctChoice: q.correctChoice ?? q.CorrectChoice ?? 0,
            explanation: q.explanation ?? q.Explanation ?? '',
            hint: q.hint ?? q.Hint ?? '',
            coaching: q.coaching ?? q.Coaching ?? '',
            updatedAt: q.updatedAt ?? q.UpdatedAt ?? ''
        };
    }

    try {
        const coursesElem = document.getElementById('admin-courses-data');
        if (coursesElem) {
            const raw = JSON.parse(coursesElem.textContent || '[]');
            courses = raw.map(normalizeCourse).filter(Boolean);
        }
        const questionsElem = document.getElementById('admin-questions-data');
        if (questionsElem) {
            const raw = JSON.parse(questionsElem.textContent || '[]');
            questions = raw.map(normalizeQuestion).filter(Boolean);
        }
    } catch (e) {
        console.error('Error parsing admin seed data', e);
    }

    // ==========================================
    // Navigation & Tab Switching
    // ==========================================
    const panels = [...document.querySelectorAll('.admin-panel')];
    const links = [...document.querySelectorAll('.admin-nav a')];
    const title = document.getElementById('page-title');

    function navigate() {
        const id = location.hash.slice(1) || 'dashboard';
        const active = panels.find(panel => panel.id === id) || panels[0];
        panels.forEach(panel => { panel.hidden = panel !== active; });
        links.forEach(link => {
            const selected = link.hash === '#' + active.id;
            link.classList.toggle('active', selected);
            if (selected) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        if (title && active.dataset.title) {
            title.textContent = active.dataset.title;
            document.title = `${active.dataset.title} | NextSkill Admin`;
        }
    }

    navigate();
    window.addEventListener('hashchange', () => {
        navigate();
        const main = document.getElementById('main-content');
        if (main) main.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'instant' });
    });

    // Quick Hero Buttons
    document.getElementById('hero-btn-new-course')?.addEventListener('click', () => {
        openCourseModal();
    });
    document.getElementById('btn-chart-add-deal')?.addEventListener('click', () => {
        openCourseModal();
    });
    document.getElementById('hero-btn-upload-course')?.addEventListener('click', () => {
        document.getElementById('course-upload-modal')?.showModal();
    });
    document.getElementById('hero-btn-new-question')?.addEventListener('click', () => {
        openQuestionModal();
    });

    // Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close-modal');
            const modal = document.getElementById(modalId);
            if (modal) modal.close();
        });
    });

    // ==========================================
    // Course Management
    // ==========================================
    const courseModal = document.getElementById('course-modal');
    const courseForm = document.getElementById('course-form');
    const courseTableBody = document.getElementById('courses-table-body');
    const courseSearchInput = document.getElementById('course-search-input');
    const courseCategoryFilter = document.getElementById('course-category-filter');

    document.getElementById('btn-open-course-modal')?.addEventListener('click', () => openCourseModal());
    document.getElementById('btn-open-upload-modal')?.addEventListener('click', () => {
        document.getElementById('course-upload-modal')?.showModal();
    });

    function openCourseModal(courseToEdit = null) {
        const c = courseToEdit ? normalizeCourse(courseToEdit) : null;
        document.getElementById('course-modal-title').textContent = c ? 'แก้ไขข้อมูลคอร์สเรียน' : 'สร้างคอร์สเรียนใหม่';
        document.getElementById('course-id').value = c ? c.id : 0;
        document.getElementById('course-title').value = c ? c.title : '';
        document.getElementById('course-category').value = c ? c.category : 'Technology';
        document.getElementById('course-level').value = c ? c.level : 'Beginner';
        document.getElementById('course-instructor').value = c ? c.instructor : '';
        document.getElementById('course-units').value = c ? (c.units || (c.lessons ? c.lessons.length : 4)) : 4;
        document.getElementById('course-description').value = c ? c.description : '';
        document.getElementById('course-skills').value = c && c.skills ? c.skills.join(', ') : '';
        const videoInput = document.getElementById('course-video-url');
        if (videoInput) videoInput.value = c ? (c.videoUrl || '') : '';
        document.getElementById('course-featured').checked = c ? !!c.featured : false;
        courseModal.showModal();
    }

    courseForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const id = parseInt(document.getElementById('course-id').value, 10) || 0;
        const skillsRaw = document.getElementById('course-skills').value;
        const skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);

        const coursePayload = {
            id,
            title: document.getElementById('course-title').value.trim(),
            category: document.getElementById('course-category').value,
            level: document.getElementById('course-level').value,
            instructor: document.getElementById('course-instructor').value.trim(),
            units: parseInt(document.getElementById('course-units').value, 10) || 4,
            description: document.getElementById('course-description').value.trim(),
            videoUrl: (document.getElementById('course-video-url')?.value || '').trim(),
            skills,
            featured: document.getElementById('course-featured').checked
        };

        try {
            await postAdminContent('/Account/AdminSaveCourse', coursePayload);
            courseModal.close();
            alert('บันทึกข้อมูลคอร์สแล้ว');
            reloadDashboard();
        } catch (err) {
            alert(err.message);
        }
    });

    function attachCourseActions() {
        document.querySelectorAll('.btn-edit-course').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.dataset.id, 10);
                const course = courses.find(c => c.id === id);
                if (course) openCourseModal(course);
                else alert('ไม่พบคอร์สที่ต้องการแก้ไข ID: ' + id);
            };
        });

        document.querySelectorAll('.btn-delete-course').forEach(btn => {
            btn.onclick = async () => {
                const id = parseInt(btn.dataset.id, 10);
                const title = btn.dataset.title || 'คอร์สนี้';
                if (!confirm(`นำ “${title}” ออกจากคลังคอร์สใช่ไหม? ประวัติการเรียนจะยังอยู่`)) return;

                try {
                    await postAdminContent('/Account/AdminDeleteCourse', { id });
                    alert('นำคอร์สออกจากคลังแล้ว');
                    reloadDashboard();
                } catch (e) {
                    alert(e.message);
                }
            };
        });
    }

    function renderCoursesTable() {
        if (!courseTableBody) return;
        const q = (courseSearchInput?.value || '').trim().toLowerCase();
        const cat = courseCategoryFilter?.value || '';

        const filtered = courses.filter(c => {
            const matchesQ = !q || (c.title && c.title.toLowerCase().includes(q)) || (c.instructor && c.instructor.toLowerCase().includes(q)) || (c.category && c.category.toLowerCase().includes(q));
            const matchesCat = !cat || c.category.toLowerCase() === cat.toLowerCase();
            return matchesQ && matchesCat;
        });

        courseTableBody.innerHTML = filtered.map(c => `
            <tr data-course-row data-id="${c.id}">
                <td><span class="status-badge">#${c.id}</span></td>
                <td>
                    <strong style="font-size: 14px; color: var(--nimo-navy);">${escapeHtml(c.title)}</strong>
                    ${c.videoUrl ? '<span class="status-badge" style="background: rgba(14, 165, 233, 0.15); color: #0284c7; border: 1px solid #bae6fd; font-size: 11px; margin-left: 6px;" title="มีสื่อวิดีโอการเรียนรู้">▶ มีวิดีโอ</span>' : ''}
                    <p style="margin: 3px 0 0; font-size: 12px; color: var(--nimo-muted); max-width: 320px; white-space: normal;">${escapeHtml(c.description || '')}</p>
                </td>
                <td><span class="status-badge published">${escapeHtml(c.category || '')}</span></td>
                <td>${escapeHtml(c.level || '')}</td>
                <td>${c.lessons ? c.lessons.length : (c.units || 0)} ด่าน</td>
                <td>${escapeHtml(c.instructor || '')}</td>
                <td>${c.featured ? '<span class="status-badge yellow">แนะนำ</span>' : '<span style="color: var(--nimo-muted); font-size: 12px;">ทั่วไป</span>'}</td>
                <td style="text-align: right; white-space: nowrap;">
                    <a href="/Home/Details/${c.id}" target="_blank" class="ns-button ns-button--secondary ns-button--compact" title="เปิดดูหน้ารายละเอียดคอร์สนี้ในมุมมองของผู้เรียน" style="text-decoration: none;">ดูหน้าจริง</a>
                    <button type="button" class="ns-button ns-button--secondary ns-button--compact btn-edit-course" data-id="${c.id}">แก้ไข</button>
                    <button type="button" class="ns-button ns-button--danger ns-button--compact btn-delete-course" data-id="${c.id}" data-title="${escapeHtml(c.title)}">ลบ</button>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="8" class="empty-message">ไม่พบคอร์สที่ตรงกับเงื่อนไขการค้นหา</td></tr>`;

        attachCourseActions();
    }

    courseSearchInput?.addEventListener('input', renderCoursesTable);
    courseCategoryFilter?.addEventListener('change', renderCoursesTable);
    attachCourseActions();

    // Upload Course Form
    const uploadForm = document.getElementById('course-upload-form');
    uploadForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const fileInput = document.getElementById('upload-file-input');
        const jsonText = document.getElementById('upload-json-text').value.trim();
        const feedback = document.getElementById('upload-feedback');

        const formData = new FormData();
        if (fileInput?.files?.length) {
            formData.append('file', fileInput.files[0]);
        }
        if (jsonText) {
            formData.append('jsonText', jsonText);
        }

        try {
            feedback.style.display = 'block';
            feedback.style.background = '#e0f2fe';
            feedback.style.color = '#0369a1';
            feedback.textContent = 'กำลังประมวลผลการอัปโหลด...';

            const data = await postAdminContent('/Account/AdminUploadCourses', formData);
            feedback.style.background = '#ecfdf5';
            feedback.style.color = '#047857';
            feedback.textContent = data.message;
            setTimeout(reloadDashboard, 1000);
        } catch (e) {
            feedback.style.display = 'block';
            feedback.style.background = '#fef2f2';
            feedback.style.color = '#dc2626';
            feedback.textContent = e.message;
        }
    });

    // ==========================================
    // Question & Quiz Studio
    // ==========================================
    const questionModal = document.getElementById('question-modal');
    const questionForm = document.getElementById('question-form');
    const questionsContainer = document.getElementById('questions-container');
    const questionCourseFilter = document.getElementById('question-course-filter');
    const questionSearchInput = document.getElementById('question-search-input');
    const questionCourse = document.getElementById('q-course-id');
    const questionLesson = document.getElementById('q-lesson-id');
    const questionChoices = [...(questionForm?.querySelectorAll('input[id^="q-choice-"]') || [])];
    const questionTemplate = document.getElementById('admin-question-card-template');
    const choiceTemplate = document.getElementById('admin-question-choice-template');

    document.getElementById('btn-open-question-modal')?.addEventListener('click', () => openQuestionModal());

    function updateQuestionLessonOptions(selectedLesson) {
        const course = courses.find(c => c.id === Number(questionCourse.value));
        const lessons = course?.lessons || [];
        questionLesson.replaceChildren(...lessons.map(lesson =>
            new Option(lesson.title ?? lesson.Title, lesson.id ?? lesson.Id)
        ));
        if (selectedLesson != null && Array.from(questionLesson.options).some(option => option.value === String(selectedLesson))) {
            questionLesson.value = String(selectedLesson);
        }
        if (!lessons.length) questionLesson.add(new Option('คอร์สนี้ยังไม่มีบทเรียน', ''));
    }

    questionCourse?.addEventListener('change', () => updateQuestionLessonOptions());

    function openQuestionModal(qToEdit = null) {
        document.getElementById('question-modal-title').textContent = qToEdit ? 'แก้ไขคำถามแบบฝึกหัด' : 'เพิ่มคำถามแบบฝึกหัดใหม่';
        document.getElementById('question-id').value = qToEdit?.id || '';
        if (qToEdit) questionCourse.value = String(qToEdit.courseId);
        updateQuestionLessonOptions(qToEdit?.lessonId);
        document.getElementById('q-prompt').value = qToEdit?.prompt || '';

        questionChoices.forEach((input, index) => { input.value = qToEdit?.choices[index] || ''; });
        questionForm.querySelectorAll('input[name="q-correct"]').forEach((radio, index) => {
            radio.checked = index === (qToEdit?.correctChoice ?? 0);
        });

        document.getElementById('q-explanation').value = qToEdit?.explanation || '';
        document.getElementById('q-hint').value = qToEdit?.hint || '';
        document.getElementById('q-coaching').value = qToEdit?.coaching || '';
        questionModal.showModal();
    }

    questionForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const selected = questionForm.querySelector('input[name="q-correct"]:checked');
        const entered = questionChoices
            .map((input, slot) => ({ slot, text: input.value.trim() }))
            .filter(choice => choice.text);
        const correctChoice = selected ? entered.findIndex(choice => choice.slot === Number(selected.value)) : -1;

        if (correctChoice < 0) {
            alert('เลือกเฉลยจากตัวเลือกที่กรอกข้อความแล้ว');
            return;
        }

        const payload = {
            id: document.getElementById('question-id').value,
            courseId: Number(questionCourse.value),
            lessonId: Number(questionLesson.value),
            prompt: document.getElementById('q-prompt').value.trim(),
            choices: entered.map(choice => choice.text),
            correctChoice,
            explanation: document.getElementById('q-explanation').value.trim(),
            hint: document.getElementById('q-hint').value.trim(),
            coaching: document.getElementById('q-coaching').value.trim()
        };

        try {
            await postAdminContent('/Account/AdminSaveQuestion', payload);
            questionModal.close();
            alert('บันทึกข้อมูลคำถามแล้ว');
            reloadDashboard();
        } catch (error) {
            alert(error.message);
        }
    });

    questionsContainer?.addEventListener('click', async event => {
        const button = event.target.closest('button[data-question-action]');
        const card = button?.closest('[data-question-card]');
        const question = questions.find(item => item.id === card?.dataset.id);
        if (!question) return;

        switch (button.dataset.questionAction) {
            case 'test':
                openQuizTester(question);
                break;
            case 'edit':
                openQuestionModal(question);
                break;
            case 'delete':
                if (!confirm('คุณต้องการลบคำถามข้อนี้ใช่ไหม?')) return;
                try {
                    await postAdminContent('/Account/AdminDeleteQuestion', { id: question.id });
                    alert('ลบคำถามแล้ว');
                    reloadDashboard();
                } catch (error) {
                    alert(error.message);
                }
                break;
        }
    });

    function renderQuestionCard(question) {
        const card = questionTemplate.content.firstElementChild.cloneNode(true);
        card.dataset.id = question.id;
        card.querySelector('[data-question-course]').textContent = question.courseTitle + ' · บทที่ ' + question.lessonId;
        card.querySelector('[data-question-id]').textContent = 'รหัส: ' + question.id;
        card.querySelector('[data-question-prompt]').textContent = question.prompt;

        const choices = card.querySelector('[data-question-choices]');
        question.choices.forEach((text, index) => {
            const choice = choiceTemplate.content.firstElementChild.cloneNode(true);
            const correct = index === question.correctChoice;
            choice.classList.toggle('correct', correct);
            choice.querySelector('.choice-letter').textContent = String.fromCharCode(65 + index);
            choice.querySelector('[data-choice-text]').textContent = text;
            choice.querySelector('[data-choice-correct]').hidden = !correct;
            choices.append(choice);
        });

        const explanation = card.querySelector('[data-question-explanation]');
        explanation.hidden = !question.explanation;
        explanation.querySelector('span').textContent = question.explanation;
        const hint = card.querySelector('[data-question-hint]');
        hint.hidden = !question.hint;
        hint.querySelector('span').textContent = question.hint;
        return card;
    }

    function renderQuestionsGrid() {
        if (!questionsContainer) return;
        const search = (questionSearchInput?.value || '').trim().toLowerCase();
        const courseId = Number(questionCourseFilter?.value);
        const filtered = questions.filter(question =>
            (!courseId || question.courseId === courseId) &&
            (!search || [question.prompt, question.explanation, question.courseTitle].some(text => text.toLowerCase().includes(search)))
        );

        questionsContainer.replaceChildren(...filtered.map(renderQuestionCard));
        document.getElementById('questions-empty').hidden = filtered.length > 0;
    }

    questionSearchInput?.addEventListener('input', renderQuestionsGrid);
    questionCourseFilter?.addEventListener('change', renderQuestionsGrid);
    renderQuestionsGrid();

    // ==========================================
    // Interactive Quiz Tester with Nimo
    // ==========================================
    const testerModal = document.getElementById('quiz-tester-modal');
    function openQuizTester(q) {
        document.getElementById('tester-prompt').textContent = q.prompt;
        const bubble = document.getElementById('tester-nimo-bubble');
        if (bubble) bubble.textContent = 'ลองเลือกคำตอบที่ถูกต้องได้เลย';

        const feedback = document.getElementById('tester-feedback');
        feedback.style.display = 'none';

        const choicesContainer = document.getElementById('tester-choices');
        choicesContainer.innerHTML = (q.choices || []).map((choice, i) => `
            <button type="button" class="ns-button ns-button--secondary ns-button--compact tester-choice-btn" data-choice-index="${i}" style="width: 100%; justify-content: flex-start; padding: 12px 16px; font-size: 14px; border-radius: 12px;">
                <span style="font-weight: 700; width: 24px; color: var(--nimo-blue);">${String.fromCharCode(65 + i)}.</span>
                <span>${escapeHtml(choice)}</span>
            </button>
        `).join('');

        choicesContainer.querySelectorAll('.tester-choice-btn').forEach(btn => {
            btn.onclick = () => {
                const selected = parseInt(btn.dataset.choiceIndex, 10);
                const isCorrect = selected === q.correctChoice;

                choicesContainer.querySelectorAll('.tester-choice-btn').forEach((b, idx) => {
                    b.disabled = true;
                    if (idx === q.correctChoice) {
                        b.style.background = '#ecfdf5';
                        b.style.borderColor = '#10b981';
                        b.style.color = '#047857';
                    } else if (idx === selected && !isCorrect) {
                        b.style.background = '#fef2f2';
                        b.style.borderColor = '#ef4444';
                        b.style.color = '#b91c1c';
                    }
                });

                feedback.style.display = 'block';
                if (isCorrect) {
                    feedback.style.background = '#ecfdf5';
                    feedback.style.border = '1px solid #a7f3d0';
                    feedback.style.color = '#047857';
                    document.getElementById('tester-feedback-title').textContent = 'ถูกต้องแล้ว ยอดเยี่ยมมาก';
                    document.getElementById('tester-feedback-text').textContent = q.explanation || 'ทำความเข้าใจจุดสำคัญนี้ได้ดีมาก!';
                    if (bubble) bubble.textContent = 'เก่งมาก ถูกต้องแล้วครับ';
                } else {
                    feedback.style.background = '#fef2f2';
                    feedback.style.border = '1px solid #fecaca';
                    feedback.style.color = '#b91c1c';
                    document.getElementById('tester-feedback-title').textContent = 'ยังไม่ถูกต้อง ลองทบทวนข้อนี้ดูนะ';
                    document.getElementById('tester-feedback-text').textContent = (q.explanation ? q.explanation + ' ' : '') + (q.hint ? `(คำใบ้: ${q.hint})` : '');
                    if (bubble) bubble.textContent = 'ไม่เป็นไรนะ ลองดูคำอธิบายแล้วค่อย ๆ ฝึกไปด้วยกันครับ';
                }
            };
        });

        testerModal.showModal();
    }

    // ==========================================
    // Member Search & Local Time Formatting
    // ==========================================
    const memberSearch = document.getElementById('member-search');
    const memberRole = document.getElementById('member-role');

    function filterMembers() {
        const query = (memberSearch?.value || '').trim().toLowerCase();
        const roleVal = memberRole?.value || 'all';
        let count = 0;
        document.querySelectorAll('[data-member]').forEach(row => {
            const matchesQuery = !query || row.textContent.toLowerCase().includes(query);
            const matchesRole = roleVal === 'all' || row.dataset.role === roleVal;
            const visible = matchesQuery && matchesRole;
            row.hidden = !visible;
            if (visible) count++;
        });
        const noMembers = document.getElementById('no-members');
        if (noMembers) noMembers.hidden = count > 0;
        const countLabel = document.getElementById('member-count');
        if (countLabel) countLabel.textContent = `แสดง ${count} บัญชี`;
    }

    memberSearch?.addEventListener('input', filterMembers);
    memberRole?.addEventListener('change', filterMembers);

    // ==========================================
    // Utility Helpers
    // ==========================================
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function bindDonutHover() {
        const donutCenterVal = document.getElementById('donut-center-num');
        if (!donutCenterVal) return;
        const total = donutCenterVal.textContent;
        document.querySelectorAll('.donut-segment').forEach(seg => {
            seg.onmouseenter = () => {
                donutCenterVal.textContent = seg.dataset.shareLabel;
            };
            seg.onmouseleave = () => {
                donutCenterVal.textContent = total;
            };
        });
    }

    const dashboardFilterIds = [
        'global-admin-search', 'course-search-input', 'course-category-filter',
        'question-search-input', 'question-course-filter', 'member-search', 'member-role'
    ];
    const dashboardRefreshKey = 'nextskill.admin-refresh';

    function reloadDashboard() {
        try {
            const filters = dashboardFilterIds.map(id => document.getElementById(id)?.value);
            const period = document.querySelector('.chart-period-btn.active')?.dataset.period;
            sessionStorage.setItem(dashboardRefreshKey, JSON.stringify({ filters, period }));
        } catch {
            // Saving still refreshes the server data if storage is disabled.
        }
        location.reload();
    }

    function restoreDashboardFilters() {
        let state;
        try {
            state = JSON.parse(sessionStorage.getItem(dashboardRefreshKey) || 'null');
            sessionStorage.removeItem(dashboardRefreshKey);
        } catch {
            return;
        }
        if (!Array.isArray(state?.filters)) return;

        dashboardFilterIds.forEach((id, index) => {
            const field = document.getElementById(id);
            const value = state.filters[index];
            if (!field || typeof value !== 'string') return;
            if (field instanceof HTMLSelectElement && ![...field.options].some(option => option.value === value)) return;
            field.value = value;
        });

        if (courseSearchInput.value || courseCategoryFilter.value) renderCoursesTable();
        if (questionSearchInput.value || questionCourseFilter.value !== '0') renderQuestionsGrid();
        if (memberSearch.value || memberRole.value !== 'all') filterMembers();
        [...periodButtons].find(button => button.dataset.period === state.period && !button.classList.contains('active'))?.click();
    }

    // ==========================================
    // Interactive Bar Chart Period Switcher (Real Server Data)
    // ==========================================
    const periodButtons = document.querySelectorAll('.chart-period-btn');
    const barsContainer = document.getElementById('chart-bars-container');
    const chartSubText = document.getElementById('chart-sub-text');
    const chartYAxis = document.getElementById('chart-y-axis');

    let serverTrends = null;
    try {
        const trendsElem = document.getElementById('admin-trends-data');
        if (trendsElem) {
            serverTrends = JSON.parse(trendsElem.textContent || 'null');
        }
    } catch (e) {
        console.error('Error parsing admin trends data', e);
    }

    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const data = serverTrends?.[btn.dataset.period];
            if (!data || !barsContainer) return;
            periodButtons.forEach(button => {
                button.classList.toggle('active', button === btn);
                button.setAttribute('aria-pressed', String(button === btn));
            });

            if (chartSubText) chartSubText.textContent = data.sub;

            if (chartYAxis && Array.isArray(data.yTicks)) {
                chartYAxis.innerHTML = data.yTicks.map(t => `<span>${escapeHtml(t)}</span>`).join('');
            }

            barsContainer.innerHTML = data.bars.map(b => `
                <div class="chart-bar-col ${b.highlighted ? 'highlighted' : ''}" data-month="${escapeHtml(b.month)}" data-count="${b.count}" data-val="${escapeHtml(b.val)}">
                    ${b.highlighted ? `<div class="bar-highlight-tooltip">${escapeHtml(b.val)}</div>` : ''}
                    <div class="bar-pill" style="height: ${b.height}%;"></div>
                </div>
            `).join('');

            const xLabels = document.querySelector('.chart-x-labels');
            if (xLabels) {
                xLabels.innerHTML = data.labels.map(l => `<span>${escapeHtml(l)}</span>`).join('');
            }

            attachBarInteractions();
        });
    });

    function attachBarInteractions() {
        document.querySelectorAll('.chart-bar-col').forEach(col => {
            col.addEventListener('mouseenter', () => {
                const val = col.getAttribute('data-val');
                let tt = col.querySelector('.bar-highlight-tooltip');
                if (!tt) {
                    tt = document.createElement('div');
                    tt.className = 'bar-highlight-tooltip';
                    tt.textContent = val;
                    col.appendChild(tt);
                }
            });
            col.addEventListener('mouseleave', () => {
                if (!col.classList.contains('highlighted')) {
                    const tt = col.querySelector('.bar-highlight-tooltip');
                    if (tt) tt.remove();
                }
            });
        });
    }
    attachBarInteractions();

    // ==========================================
    // Interactive Donut Chart Segment Hover
    // ==========================================
    bindDonutHover();
    restoreDashboardFilters();

    // ==========================================
    // Global Search Shortcut (Ctrl+K)
    // ==========================================
    const globalSearch = document.getElementById('global-admin-search');
    window.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            globalSearch?.focus();
        }
    });

    globalSearch?.addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        if (courseSearchInput) {
            courseSearchInput.value = q;
            renderCoursesTable();
        }
        if (questionSearchInput) {
            questionSearchInput.value = q;
            renderQuestionsGrid();
        }
        if (memberSearch) {
            memberSearch.value = q;
            filterMembers();
        }
    });

    // ==========================================
    // Notification Bell Click Interaction
    // ==========================================
    const bellBtn = document.getElementById('topbar-bell-btn');
    bellBtn?.addEventListener('click', () => {
        const { courseCount, lessonCount, questionCount, accountCount } = bellBtn.dataset;
        alert(`สรุปข้อมูลระบบ NextSkill Admin (ข้อมูลจริง):\n• คอร์สเรียนในระบบ ${courseCount} คอร์ส (${lessonCount} ด่าน)\n• แบบฝึกหัดในคลัง ${questionCount} ข้อ\n• บัญชีสมาชิกในระบบ ${accountCount} บัญชี\n• ระบบฐานข้อมูล LocalDB ทำงานปกติ`);
    });

    document.getElementById('btn-quick-activity')?.addEventListener('click', (e) => {
        e.preventDefault();
        const actSection = document.querySelector('.activity-section');
        if (actSection) {
            actSection.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // ==========================================
    // Dark / Light Mode Theme System
    // ==========================================
    const THEME_STORAGE_KEY = 'nextskill.theme.v1';
    const docRoot = document.documentElement;

    // Ensure toggle button exists in DOM (dynamic fallback if view was cached)
    let toggleBtn = document.querySelector('[data-theme-toggle]');
    if (!toggleBtn) {
        const topbarActions = document.querySelector('.topbar-actions');
        if (topbarActions) {
            toggleBtn = document.createElement('button');
            toggleBtn.className = 'journey-theme-toggle admin-theme-toggle';
            toggleBtn.type = 'button';
            toggleBtn.setAttribute('data-theme-toggle', '');
            toggleBtn.setAttribute('aria-label', 'สลับธีมกลางคืน/กลางวัน');
            toggleBtn.setAttribute('aria-pressed', 'false');
            toggleBtn.title = 'เปิดธีมกลางคืน';
            toggleBtn.innerHTML = '<svg class="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><svg class="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.5 13.3A8.5 8.5 0 0 1 10.7 3.5a8.5 8.5 0 1 0 9.8 9.8Z"/></svg>';
            const mascotBtn = topbarActions.querySelector('#topbar-mascot-toggle');
            if (mascotBtn) {
                topbarActions.insertBefore(toggleBtn, mascotBtn);
            } else {
                topbarActions.appendChild(toggleBtn);
            }
        }
    }

    function applyAdminTheme(theme) {
        const isDark = theme === 'dark';
        docRoot.dataset.theme = isDark ? 'dark' : 'light';

        const btn = document.querySelector('[data-theme-toggle]');
        if (btn) {
            btn.setAttribute('aria-pressed', String(isDark));
            const label = isDark ? 'เปิดธีมกลางวัน (Light Mode)' : 'เปิดธีมกลางคืน (Dark Mode)';
            btn.title = label;
            btn.setAttribute('aria-label', label);
        }

        try {
            localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
        } catch {}

        document.dispatchEvent(new CustomEvent('nextskill:theme-change', { detail: { theme: docRoot.dataset.theme } }));
    }

    // Initialize theme from storage (defaults to 'light')
    let savedTheme = 'light';
    try {
        savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    } catch {}
    applyAdminTheme(savedTheme);

    // Bind theme toggle buttons
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const current = docRoot.dataset.theme === 'dark' ? 'dark' : 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            applyAdminTheme(next);

            btn.classList.remove('theme-toggle-bounce');
            void btn.offsetWidth;
            btn.classList.add('theme-toggle-bounce');
        });
    });

    // Synchronize if user changes theme on another tab
    window.addEventListener('storage', (e) => {
        if (e.key === THEME_STORAGE_KEY && e.newValue) {
            applyAdminTheme(e.newValue);
        }
    });

    // ==========================================
    // Sidebar Brand Logo Hydration (Matches Login Navbar Brand)
    // ==========================================
    function initAdminBrandLogo() {
        const brand = document.querySelector('.sidebar .brand');
        if (!brand) return;

        // Ensure modern brand logo matches login/home navbar
        if (brand.querySelector('.brand-mascot-badge') || !brand.querySelector('.admin-brand-logo-img')) {
            brand.className = 'brand admin-brand';
            brand.innerHTML = `
                <img src="/images/nextskill-navbar-logo.webp" alt="NextSkill" class="admin-brand-logo-img" width="46" height="46" />
                <div class="admin-brand-content">
                    <div class="admin-brand-wordmark-row">
                        <span class="ns-navbar__wordmark admin-brand-wordmark" aria-hidden="true">
                            <svg class="ns-wordmark-art" viewBox="0 0 8114.20 1840.00" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
                                <g transform="translate(50 1640.00) scale(1 -1)">
                                    <g class="ns-wordmark-next">
                                        <path transform="translate(0.00 0)" d="M140.00 69.72L140.00 1370.28Q140.00 1440.00 209.72 1440.00L269.48 1440.00Q339.20 1440.00 377.79 1381.94L1020.72 414.63Q1065.00 348.00 1065.00 428.00L1065.00 1370.28Q1065.00 1440.00 1134.72 1440.00L1194.48 1440.00Q1264.20 1440.00 1264.20 1370.28L1264.20 69.72Q1264.20 0.00 1194.48 0.00L1134.72 0.00Q1065.00 0.00 1026.43 58.08L383.45 1026.36Q339.20 1093.00 339.20 1013.00L339.20 69.72Q339.20 0.00 269.48 0.00L209.72 0.00Q140.00 0.00 140.00 69.72Z" />
                                        <path transform="translate(1360.20 0)" d="M614.6 -30.0Q454.2 -30.0 333.9 40.4Q213.6 110.8 146.8 237.4Q80.0 364.0 80.0 531.8Q80.0 708.8 145.8 838.5999999999999Q211.6 968.4 329.7 1039.2Q447.8 1110.0 605.4 1110.0Q769.4 1110.0 884.8 1034.1Q1000.2 958.2 1057.8000000000002 818.0Q1115.4 677.8 1104.8 484.6H907.6V555.8Q905.2 748.2 832.3 841.6Q759.4 935.0 612.6 935.0Q452.2 935.0 370.5 833.2Q288.8 731.4 288.8 540.0Q288.8 356.8 370.5 256.3Q452.2 155.8 605.4 155.8Q707.0 155.8 781.5 202.10000000000002Q856.0 248.4 898.0 335.0L1089.4 272.4Q1026.2 128.2 898.9000000000001 49.099999999999994Q771.6 -30.0 614.6 -30.0ZM224.0 484.6V639.6H1005.8V484.6Z" />
                                        <path transform="translate(2500.40 0)" d="M67.86 64.11L379.74 481.89Q427.60 546.00 379.75 610.11L76.85 1015.89Q29.00 1080.00 109.00 1080.00L182.60 1080.00Q262.60 1080.00 309.95 1015.52L495.05 763.48Q542.40 699.00 589.42 763.72L772.18 1015.28Q819.20 1080.00 899.20 1080.00L972.80 1080.00Q1052.80 1080.00 1004.95 1015.89L702.05 610.11Q654.20 546.00 702.13 481.95L1014.87 64.05Q1062.80 0.00 982.80 0.00L908.20 0.00Q828.20 0.00 781.15 64.70L589.45 328.30Q542.40 393.00 495.13 328.46L301.87 64.54Q254.60 0.00 174.60 0.00L100.00 0.00Q20.00 0.00 67.86 64.11Z" />
                                        <path transform="translate(3519.20 0)" d="M752.0 0.0Q652.2 -19.8 556.1 -16.6Q460.0 -13.4 384.5 21.400000000000002Q309.0 56.2 270.6 130.6Q236.8 196.2 234.3 264.1Q231.8 332.0 231.8 418.2V1380.0H429.0V427.4Q429.0 361.8 430.5 314.3Q432.0 266.8 451.0 233.4Q487.0 170.4 565.5 161.0Q644.0 151.6 752.0 167.4ZM20.0 920.4V1080.0H752.0V920.4Z" />
                                    </g>
                                    <g class="ns-wordmark-skill">
                                        <path transform="translate(4431.40 0)" d="M657.6 -30.0Q503.4 -30.0 379.7 22.9Q256.0 75.8 175.9 174.0Q95.8 272.2 71.8 407.4L276.2 438.8Q309.8 305.2 417.0 230.5Q524.2 155.8 668.4 155.8Q759.2 155.8 834.4000000000001 184.5Q909.6 213.2 954.8 266.79999999999995Q1000.0 320.4 1000.0 395.0Q1000.0 437.4 985.2 469.29999999999995Q970.4 501.2 945.0 524.4Q919.6 547.6 885.0 564.3Q850.4 581.0 811.0 592.8L442.8 701.8Q386.4 718.4 330.4 744.7Q274.4 771.0 228.89999999999998 812.5Q183.4 854.0 155.6 914.4Q127.8 974.8 127.8 1059.6Q127.8 1190.4 195.4 1282.2Q263.0 1374.0 378.8 1421.6Q494.6 1469.2 639.0 1469.0Q784.6 1467.4 899.7 1417.2Q1014.8 1367.0 1090.8 1273.3Q1166.8 1179.6 1194.8 1047.4L984.8 1011.4Q969.8 1095.0 919.8 1155.6Q869.8 1216.2 796.3 1248.9Q722.8 1281.6 636.4 1282.6Q553.0 1284.2 484.7 1256.9Q416.4 1229.6 376.0 1180.8Q335.6 1132.0 335.6 1068.8Q335.6 1006.2 371.70000000000005 967.8Q407.8 929.4 460.9 907.2Q514.0 885.0 566.0 870.6L835.2 794.0Q884.0 780.4 946.7 757.0999999999999Q1009.4 733.8 1068.3 691.9Q1127.2 650.0 1165.8000000000002 581.0Q1204.4 512.0 1204.4 407.4Q1204.4 300.2 1161.3000000000002 218.39999999999998Q1118.2 136.6 1042.7 81.39999999999999Q967.2 26.2 868.1 -1.9000000000000004Q769.0 -30.0 657.6 -30.0Z" />
                                        <path transform="translate(5667.60 0)" d="M139.05 70.07L139.95 1370.28Q140.00 1440.00 209.72 1440.00L269.48 1440.00Q339.20 1440.00 339.20 1370.28L339.20 640.00Q339.20 560.00 390.57 621.33L723.43 1018.67Q774.80 1080.00 854.80 1080.00L946.80 1080.00Q1026.80 1080.00 974.95 1019.08L619.05 600.92Q567.20 540.00 622.11 481.82L1021.89 58.18Q1076.80 0.00 996.80 0.00L886.80 0.00Q806.80 0.00 753.31 59.49L392.69 460.51Q339.20 520.00 339.20 440.00L339.20 70.07Q339.20 0.00 269.13 0.00L209.07 0.00Q139.00 0.00 139.05 70.07Z" />
                                        <path transform="translate(6672.40 0)" d="M160.00 1330.99L160.00 1389.61Q160.00 1458.00 228.39 1458.00L288.21 1458.00Q356.60 1458.00 356.60 1389.61L356.60 1330.99Q356.60 1262.60 288.21 1262.60L228.39 1262.60Q160.00 1262.60 160.00 1330.99ZM160.00 68.81L160.00 1011.19Q160.00 1080.00 228.81 1080.00L287.79 1080.00Q356.60 1080.00 356.60 1011.19L356.60 68.81Q356.60 0.00 287.79 0.00L228.81 0.00Q160.00 0.00 160.00 68.81Z" />
                                        <path transform="translate(7165.00 0)" d="M160.00 68.81L160.00 1401.19Q160.00 1470.00 228.81 1470.00L287.79 1470.00Q356.60 1470.00 356.60 1401.19L356.60 68.81Q356.60 0.00 287.79 0.00L228.81 0.00Q160.00 0.00 160.00 68.81Z" />
                                        <path transform="translate(7657.60 0)" d="M160.00 68.81L160.00 1401.19Q160.00 1470.00 228.81 1470.00L287.79 1470.00Q356.60 1470.00 356.60 1401.19L356.60 68.81Q356.60 0.00 287.79 0.00L228.81 0.00Q160.00 0.00 160.00 68.81Z" />
                                    </g>
                                </g>
                            </svg>
                        </span>
                        <span class="admin-brand-badge">ADMIN</span>
                    </div>
                    <small class="admin-brand-sub">Control Center · ผู้ดูแลระบบ</small>
                </div>
            `;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdminBrandLogo);
    } else {
        initAdminBrandLogo();
    }
})();
