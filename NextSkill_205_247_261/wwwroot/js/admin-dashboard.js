(() => {
    // ==========================================
    // State & Initial Data
    // ==========================================
    let courses = [];
    let questions = [];

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
            skills,
            featured: document.getElementById('course-featured').checked
        };

        try {
            const res = await fetch('/Account/AdminSaveCourse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(coursePayload)
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`เซิร์ฟเวอร์ตอบกลับรหัส ${res.status}: ${errText}`);
            }
            const data = await res.json();
            if (data.success && data.course) {
                const saved = normalizeCourse(data.course);
                const idx = courses.findIndex(c => c.id === saved.id);
                if (idx >= 0) courses[idx] = saved;
                else courses.push(saved);

                renderCoursesTable();
                updateCourseSelectDropdowns();
                updateMetrics();
                courseModal.close();
                alert('บันทึกข้อมูลคอร์สเรียนสำเร็จ! ข้อมูลอัปเดตไปยังหน้าผู้เรียนเรียบร้อยแล้ว');
            } else {
                alert(data.message || 'บันทึกข้อมูลคอร์สไม่สำเร็จ');
            }
        } catch (err) {
            console.error('Save course error:', err);
            alert('เกิดข้อผิดพลาดในการบันทึกคอร์ส: ' + err.message);
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
                if (!confirm(`คุณต้องการลบ "${title}" ใช่หรือไม่?`)) return;

                try {
                    const res = await fetch('/Account/AdminDeleteCourse', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id })
                    });
                    if (!res.ok) {
                        const errText = await res.text();
                        throw new Error(`เซิร์ฟเวอร์ตอบกลับรหัส ${res.status}: ${errText}`);
                    }
                    const data = await res.json();
                    if (data.success) {
                        courses = courses.filter(c => c.id !== id);
                        renderCoursesTable();
                        updateCourseSelectDropdowns();
                        updateMetrics();
                        alert('ลบคอร์สเรียนสำเร็จ');
                    } else {
                        alert(data.message || 'ไม่สามารถลบคอร์สได้');
                    }
                } catch (e) {
                    console.error('Delete course error:', e);
                    alert('เกิดข้อผิดพลาดในการลบคอร์ส: ' + e.message);
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
            const matchesCat = !cat || c.category === cat;
            return matchesQ && matchesCat;
        });

        courseTableBody.innerHTML = filtered.map(c => `
            <tr data-course-row data-id="${c.id}">
                <td><span class="status-badge">#${c.id}</span></td>
                <td>
                    <strong style="font-size: 14px; color: var(--nimo-navy);">${escapeHtml(c.title)}</strong>
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

        const badge = document.getElementById('course-total-badge');
        if (badge) badge.textContent = courses.length;

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

            const res = await fetch('/Account/AdminUploadCourses', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                feedback.style.background = '#ecfdf5';
                feedback.style.color = '#047857';
                feedback.textContent = data.message || 'นำเข้าคอร์สสำเร็จ!';
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                feedback.style.background = '#fef2f2';
                feedback.style.color = '#dc2626';
                feedback.textContent = data.message || 'ไม่สามารถนำเข้าคอร์สได้';
            }
        } catch (e) {
            feedback.style.display = 'block';
            feedback.style.background = '#fef2f2';
            feedback.style.color = '#dc2626';
            feedback.textContent = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์';
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

    document.getElementById('btn-open-question-modal')?.addEventListener('click', () => openQuestionModal());

    function updateCourseSelectDropdowns() {
        const qCourseSelect = document.getElementById('q-course-id');
        if (qCourseSelect) {
            qCourseSelect.innerHTML = courses.map(c => `<option value="${c.id}">${escapeHtml(c.title)} (${escapeHtml(c.category)})</option>`).join('');
        }
        if (questionCourseFilter) {
            const currentVal = questionCourseFilter.value;
            questionCourseFilter.innerHTML = `<option value="0">ทุกคอร์ส (All Courses)</option>` +
                courses.map(c => `<option value="${c.id}">${escapeHtml(c.title)} (${escapeHtml(c.category)})</option>`).join('');
            questionCourseFilter.value = currentVal;
        }
    }

    function openQuestionModal(qToEdit = null) {
        document.getElementById('question-modal-title').textContent = qToEdit ? 'แก้ไขคำถามแบบฝึกหัด' : 'เพิ่มคำถามแบบฝึกหัดใหม่';
        document.getElementById('question-id').value = qToEdit ? qToEdit.id : '';
        if (qToEdit && qToEdit.courseId) document.getElementById('q-course-id').value = qToEdit.courseId;
        document.getElementById('q-lesson-id').value = qToEdit ? (qToEdit.lessonId || 1) : 1;
        document.getElementById('q-prompt').value = qToEdit ? qToEdit.prompt : '';

        const choices = qToEdit ? qToEdit.choices : ['', '', '', ''];
        document.getElementById('q-choice-0').value = choices[0] || '';
        document.getElementById('q-choice-1').value = choices[1] || '';
        document.getElementById('q-choice-2').value = choices[2] || '';
        document.getElementById('q-choice-3').value = choices[3] || '';

        const correctIdx = qToEdit ? (qToEdit.correctChoice || 0) : 0;
        const radio = document.getElementById(`correct-${correctIdx}`);
        if (radio) radio.checked = true;

        document.getElementById('q-explanation').value = qToEdit ? (qToEdit.explanation || '') : '';
        document.getElementById('q-hint').value = qToEdit ? (qToEdit.hint || '') : '';

        questionModal.showModal();
    }

    questionForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const id = document.getElementById('question-id').value.trim();
        const courseId = parseInt(document.getElementById('q-course-id').value, 10);
        const courseObj = courses.find(c => c.id === courseId);
        const courseTitle = courseObj ? courseObj.title : 'บทเรียน';

        const choices = [
            document.getElementById('q-choice-0').value.trim(),
            document.getElementById('q-choice-1').value.trim(),
            document.getElementById('q-choice-2').value.trim(),
            document.getElementById('q-choice-3').value.trim()
        ].filter(Boolean);

        if (choices.length < 2) {
            alert('กรุณาระบุตัวเลือกคำตอบอย่างน้อย 2 ตัวเลือก');
            return;
        }

        const checkedRadio = document.querySelector('input[name="q-correct"]:checked');
        const correctChoice = checkedRadio ? parseInt(checkedRadio.value, 10) : 0;

        const payload = {
            id,
            courseId,
            courseTitle,
            lessonId: parseInt(document.getElementById('q-lesson-id').value, 10) || 1,
            lessonTitle: `บทที่ ${document.getElementById('q-lesson-id').value}`,
            prompt: document.getElementById('q-prompt').value.trim(),
            choices,
            correctChoice: Math.min(correctChoice, choices.length - 1),
            explanation: document.getElementById('q-explanation').value.trim(),
            hint: document.getElementById('q-hint').value.trim()
        };

        try {
            const res = await fetch('/Account/AdminSaveQuestion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`เซิร์ฟเวอร์ตอบกลับรหัส ${res.status}: ${errText}`);
            }
            const data = await res.json();
            if (data.success && data.question) {
                const saved = normalizeQuestion(data.question);
                const idx = questions.findIndex(q => q.id === saved.id);
                if (idx >= 0) questions[idx] = saved;
                else questions.push(saved);

                renderQuestionsGrid();
                updateMetrics();
                questionModal.close();
                alert('บันทึกข้อมูลคำถามสำเร็จ!');
            } else {
                alert(data.message || 'บันทึกคำถามไม่สำเร็จ');
            }
        } catch (e) {
            console.error('Save question error:', e);
            alert('เกิดข้อผิดพลาดในการบันทึกคำถาม: ' + e.message);
        }
    });

    function attachQuestionActions() {
        document.querySelectorAll('.btn-edit-question').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const q = questions.find(item => item.id === id);
                if (q) openQuestionModal(q);
                else alert('ไม่พบคำถามที่ต้องการแก้ไข ID: ' + id);
            };
        });

        document.querySelectorAll('.btn-delete-question').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                if (!confirm('คุณต้องการลบคำถามข้อนี้ใช่หรือไม่?')) return;
                try {
                    const res = await fetch('/Account/AdminDeleteQuestion', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id })
                    });
                    if (!res.ok) {
                        const errText = await res.text();
                        throw new Error(`เซิร์ฟเวอร์ตอบกลับรหัส ${res.status}: ${errText}`);
                    }
                    const data = await res.json();
                    if (data.success) {
                        questions = questions.filter(item => item.id !== id);
                        renderQuestionsGrid();
                        updateMetrics();
                        alert('ลบคำถามสำเร็จ');
                    } else {
                        alert(data.message || 'ไม่สามารถลบคำถามได้');
                    }
                } catch (e) {
                    console.error('Delete question error:', e);
                    alert('เกิดข้อผิดพลาดในการลบคำถาม: ' + e.message);
                }
            };
        });

        document.querySelectorAll('.btn-test-quiz').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const q = questions.find(item => item.id === id);
                if (q) openQuizTester(q);
            };
        });
    }

    function renderQuestionsGrid() {
        if (!questionsContainer) return;
        const qSearch = (questionSearchInput?.value || '').trim().toLowerCase();
        const courseFilterVal = parseInt(questionCourseFilter?.value || '0', 10);

        const filtered = questions.filter(q => {
            const matchesCourse = courseFilterVal === 0 || q.courseId === courseFilterVal;
            const matchesPrompt = !qSearch || (q.prompt && q.prompt.toLowerCase().includes(qSearch)) ||
                (q.explanation && q.explanation.toLowerCase().includes(qSearch)) ||
                (q.courseTitle && q.courseTitle.toLowerCase().includes(qSearch));
            return matchesCourse && matchesPrompt;
        });

        questionsContainer.innerHTML = filtered.map(q => `
            <div class="question-studio-card" data-question-card data-id="${q.id}">
                <div class="question-meta-row">
                    <span class="question-course-tag">${escapeHtml(q.courseTitle || 'ทั่วไป')} · บทที่ ${q.lessonId || 1}</span>
                    <span style="font-size: 11px; color: var(--nimo-muted);">รหัส: ${escapeHtml(q.id)}</span>
                </div>
                <h4 class="question-prompt">${escapeHtml(q.prompt)}</h4>
                <div class="question-choices-list">
                    ${(q.choices || []).map((choice, i) => {
                        const isCorrect = i === q.correctChoice;
                        const letter = String.fromCharCode(65 + i);
                        return `
                            <div class="choice-item ${isCorrect ? 'correct' : ''}">
                                <span class="choice-letter">${letter}</span>
                                <span>${escapeHtml(choice)}</span>
                                ${isCorrect ? '<span style="margin-left: auto; font-size: 11px; font-weight: 700; color: #047857;">คำตอบที่ถูกต้อง</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                ${q.explanation ? `
                    <div class="question-note-box">
                        <strong>คำอธิบายเมื่อผู้เรียนตอบ:</strong>
                        <span>${escapeHtml(q.explanation)}</span>
                    </div>
                ` : ''}
                ${q.hint ? `
                    <div style="font-size: 12px; color: var(--nimo-muted); background: #fefce8; border: 1px solid #fef08a; padding: 7px 10px; border-radius: 8px;">
                        <strong style="color: #b45309;">คำใบ้จาก Nimo:</strong> ${escapeHtml(q.hint)}
                    </div>
                ` : ''}
                <div class="question-card-footer">
                    <button type="button" class="ns-button ns-button--secondary ns-button--compact btn-test-quiz" data-id="${q.id}">
                        <span>ทดสอบตอบ</span>
                    </button>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" class="ns-button ns-button--secondary ns-button--compact btn-edit-question" data-id="${q.id}">แก้ไข</button>
                        <button type="button" class="ns-button ns-button--danger ns-button--compact btn-delete-question" data-id="${q.id}">ลบ</button>
                    </div>
                </div>
            </div>
        `).join('') || `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--nimo-muted);">ไม่พบคำถามที่ตรงกับเงื่อนไขการค้นหา</div>`;

        const badge = document.getElementById('question-total-badge');
        if (badge) badge.textContent = questions.length;

        attachQuestionActions();
    }

    questionSearchInput?.addEventListener('input', renderQuestionsGrid);
    questionCourseFilter?.addEventListener('change', renderQuestionsGrid);
    attachQuestionActions();

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

    document.querySelectorAll('time[datetime]').forEach(elem => {
        const date = new Date(elem.dateTime);
        if (Number.isNaN(date.getTime())) return;
        elem.textContent = new Intl.DateTimeFormat('th-TH', elem.hasAttribute('data-local-date')
            ? { day: 'numeric', month: 'short', year: 'numeric' }
            : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
        elem.title = date.toLocaleString('th-TH');
    });

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

    function updateMetrics() {
        const mCourses = document.getElementById('metric-courses-count');
        if (mCourses) mCourses.textContent = courses.length;
        const mLessons = document.getElementById('metric-lessons-count');
        if (mLessons) {
            const totalL = courses.reduce((acc, c) => acc + (c.lessons ? c.lessons.length : (c.units || 0)), 0);
            mLessons.textContent = totalL;
        }
        const mQuestions = document.getElementById('metric-questions-count');
        if (mQuestions) mQuestions.textContent = questions.length;

        const donutNum = document.getElementById('donut-center-num');
        if (donutNum) donutNum.textContent = courses.length;

        const quotaText = document.getElementById('quota-text');
        if (quotaText) quotaText.textContent = `${courses.length} / 20`;
    }

    // ==========================================
    // Dynamic Time-based Greeting & Thai Date
    // ==========================================
    function updateGreetingAndDate() {
        const now = new Date();
        const hr = now.getHours();
        const greetingElem = document.getElementById('greeting-title');
        if (greetingElem) {
            let greeting = 'สวัสดีตอนเช้า';
            if (hr >= 12 && hr < 17) {
                greeting = 'สวัสดีตอนบ่าย';
            } else if (hr >= 17) {
                greeting = 'สวัสดีตอนเย็น';
            }
            const nameMatch = greetingElem.textContent.match(/คุณ\s+([^!,]+)/);
            const name = nameMatch ? nameMatch[1].trim() : 'Admin';
            greetingElem.textContent = `${greeting}, คุณ ${name}`;
        }

        const dateElem = document.getElementById('current-date-th');
        if (dateElem) {
            dateElem.textContent = new Intl.DateTimeFormat('th-TH', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).format(now);
        }
    }
    updateGreetingAndDate();

    // ==========================================
    // Smooth Number Counter Animation
    // ==========================================
    function animateCounters() {
        document.querySelectorAll('[data-count]').forEach(elem => {
            const target = parseInt(elem.getAttribute('data-count'), 10);
            if (isNaN(target)) return;
            const duration = 1200;
            const startTime = performance.now();
            function update(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(ease * target);
                elem.textContent = current.toLocaleString('th-TH');
                if (progress < 1) requestAnimationFrame(update);
                else elem.textContent = target.toLocaleString('th-TH');
            }
            requestAnimationFrame(update);
        });
    }
    setTimeout(animateCounters, 200);

    // ==========================================
    // Interactive Bar Chart Period Switcher
    // ==========================================
    const periodButtons = document.querySelectorAll('.chart-period-btn');
    const barsContainer = document.getElementById('chart-bars-container');
    const chartSubText = document.getElementById('chart-sub-text');

    const chartPeriodData = {
        '3m': {
            sub: '680 ผู้เรียนและกิจกรรม ในช่วง 3 เดือนที่ผ่านมา',
            bars: [
                { month: 'Sep', val: '$26,500', height: '62%' },
                { month: 'Oct', val: '$34,100', height: '80%' },
                { month: 'Nov', val: '$42,343', height: '98%', highlighted: true }
            ],
            labels: ['ก.ย.', 'ต.ค.', 'พ.ย.']
        },
        '6m': {
            sub: '1,240 ผู้เรียนและกิจกรรม ในช่วง 6 เดือนที่ผ่านมา',
            bars: [
                { month: 'Jun', val: '$18,400', height: '48%' },
                { month: 'Jul', val: '$21,200', height: '56%' },
                { month: 'Aug', val: '$29,800', height: '78%' },
                { month: 'Sep', val: '$26,500', height: '70%' },
                { month: 'Oct', val: '$34,100', height: '88%' },
                { month: 'Nov', val: '$42,343', height: '98%', highlighted: true }
            ],
            labels: ['มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.']
        },
        '12m': {
            sub: '3,850 ผู้เรียนและกิจกรรม ในรอบ 1 ปีที่ผ่านมา',
            bars: [
                { month: 'Dec', val: '$15,200', height: '38%' },
                { month: 'Feb', val: '$19,800', height: '50%' },
                { month: 'Apr', val: '$24,000', height: '60%' },
                { month: 'Jun', val: '$28,500', height: '72%' },
                { month: 'Aug', val: '$35,200', height: '86%' },
                { month: 'Nov', val: '$42,343', height: '98%', highlighted: true }
            ],
            labels: ['ธ.ค.', 'ก.พ.', 'เม.ย.', 'มิ.ย.', 'ส.ค.', 'พ.ย.']
        }
    };

    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            periodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const period = btn.getAttribute('data-period');
            const data = chartPeriodData[period];
            if (!data || !barsContainer) return;

            if (chartSubText) chartSubText.textContent = data.sub;

            barsContainer.innerHTML = data.bars.map(b => `
                <div class="chart-bar-col ${b.highlighted ? 'highlighted' : ''}" data-month="${b.month}" data-val="${b.val}">
                    ${b.highlighted ? `<div class="bar-highlight-tooltip">${b.val}</div>` : ''}
                    <div class="bar-pill" style="height: ${b.height};"></div>
                </div>
            `).join('');

            const xLabels = document.querySelector('.chart-x-labels');
            if (xLabels) {
                xLabels.innerHTML = data.labels.map(l => `<span>${l}</span>`).join('');
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
    const donutSegments = document.querySelectorAll('.donut-segment');
    const donutCenterVal = document.getElementById('donut-center-num');
    const defaultDonutTotal = courses.length || 24;

    const segmentInfo = [
        { name: 'Technology', val: '42%' },
        { name: 'Design', val: '28%' },
        { name: 'Business', val: '18%' },
        { name: 'Languages', val: '12%' }
    ];

    donutSegments.forEach((seg, idx) => {
        seg.addEventListener('mouseenter', () => {
            if (donutCenterVal && segmentInfo[idx]) {
                donutCenterVal.textContent = segmentInfo[idx].val;
            }
        });
        seg.addEventListener('mouseleave', () => {
            if (donutCenterVal) {
                donutCenterVal.textContent = defaultDonutTotal;
            }
        });
    });

    // ==========================================
    // Floating Interactive Mascot Buddy (Nimo)
    // ==========================================
    const mascotTrigger = document.getElementById('mascot-trigger-btn');
    const mascotSpeech = document.getElementById('mascot-speech');
    const mascotImg = document.getElementById('floating-mascot-img');
    const topbarMascotToggle = document.getElementById('topbar-mascot-toggle');

    const mascotPoses = [
        '/images/nimo-rowing.png',
        '/images/nimo-learning.png',
        '/images/nimo-pose-wave.png',
        '/images/nimo-pose-jump.png',
        '/images/nimo-mascot.png'
    ];

    const mascotQuotes = [
        'ยินดีต้อนรับครับกัปตัน แดชบอร์ดพร้อมทำงานเต็มที่แล้วครับ',
        `คอร์สเรียนทั้ง ${courses.length || 24} คอร์สพร้อมเปิดสอนอย่างราบรื่นครับ`,
        'มีผู้เรียนกำลังเข้าใช้งานอยู่ในระบบอย่างต่อเนื่องครับ',
        'สามารถเพิ่มคอร์สใหม่หรือปรับคำถามได้จากเมนูด้านบนครับ',
        'ระบบฐานข้อมูลและเซิร์ฟเวอร์ทำงานได้อย่างราบรื่นครับ',
        'สถิติการเรียนรู้เพิ่มขึ้น 7% เทียบกับเดือนก่อนหน้า',
        'กัปตันสามารถตรวจสอบข้อมูลและกิจกรรมทั้งหมดได้จากแผงควบคุมนี้ครับ'
    ];

    let quoteIdx = 0;
    let poseIdx = 0;

    function triggerMascotCheer() {
        quoteIdx = (quoteIdx + 1) % mascotQuotes.length;
        poseIdx = (poseIdx + 1) % mascotPoses.length;

        if (mascotSpeech) {
            mascotSpeech.style.animation = 'none';
            void mascotSpeech.offsetWidth;
            mascotSpeech.style.animation = 'popBubble 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
            mascotSpeech.textContent = mascotQuotes[quoteIdx];
            mascotSpeech.style.display = 'block';
        }

        if (mascotImg) {
            mascotImg.src = mascotPoses[poseIdx];
        }

        if (mascotTrigger) {
            mascotTrigger.style.transform = 'translateY(-14px) scale(1.18) rotate(8deg)';
            setTimeout(() => {
                mascotTrigger.style.transform = '';
            }, 300);
        }
    }

    mascotTrigger?.addEventListener('click', triggerMascotCheer);
    topbarMascotToggle?.addEventListener('click', () => {
        triggerMascotCheer();
        mascotSpeech?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });

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
        alert('การแจ้งเตือนระบบ NextSkill Admin:\n• มี 6 ด่านและแบบฝึกหัดรอการตรวจสอบ\n• ผู้เรียนออนไลน์พร้อมกัน 11 คน\n• ระบบฐานข้อมูล LocalDB ทำงานปกติสมบูรณ์');
    });

    document.getElementById('btn-quick-activity')?.addEventListener('click', (e) => {
        e.preventDefault();
        const actSection = document.querySelector('.activity-section');
        if (actSection) {
            actSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
})();
