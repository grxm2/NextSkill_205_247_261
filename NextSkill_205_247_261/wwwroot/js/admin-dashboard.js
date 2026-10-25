(() => {
    // ==========================================
    // State & Initial Data
    // ==========================================
    let courses = [];
    let questions = [];

    try {
        const coursesElem = document.getElementById('admin-courses-data');
        if (coursesElem) courses = JSON.parse(coursesElem.textContent || '[]');
        const questionsElem = document.getElementById('admin-questions-data');
        if (questionsElem) questions = JSON.parse(questionsElem.textContent || '[]');
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
        document.getElementById('course-modal-title').textContent = courseToEdit ? 'แก้ไขข้อมูลคอร์สเรียน' : 'สร้างคอร์สเรียนใหม่';
        document.getElementById('course-id').value = courseToEdit ? courseToEdit.id : 0;
        document.getElementById('course-title').value = courseToEdit ? courseToEdit.title : '';
        document.getElementById('course-category').value = courseToEdit ? courseToEdit.category : 'Technology';
        document.getElementById('course-level').value = courseToEdit ? courseToEdit.level : 'Beginner';
        document.getElementById('course-instructor').value = courseToEdit ? courseToEdit.instructor : '';
        document.getElementById('course-units').value = courseToEdit ? (courseToEdit.units || (courseToEdit.lessons ? courseToEdit.lessons.length : 4)) : 4;
        document.getElementById('course-description').value = courseToEdit ? courseToEdit.description : '';
        document.getElementById('course-skills').value = courseToEdit && courseToEdit.skills ? courseToEdit.skills.join(', ') : '';
        document.getElementById('course-featured').checked = courseToEdit ? !!courseToEdit.featured : false;
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
            const data = await res.json();
            if (data.success && data.course) {
                const idx = courses.findIndex(c => c.id === data.course.id);
                if (idx >= 0) courses[idx] = data.course;
                else courses.push(data.course);

                renderCoursesTable();
                updateCourseSelectDropdowns();
                updateMetrics();
                courseModal.close();
            } else {
                alert(data.message || 'บันทึกข้อมูลคอร์สไม่สำเร็จ');
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อบันทึกคอร์ส');
        }
    });

    function attachCourseActions() {
        document.querySelectorAll('.btn-edit-course').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.dataset.id, 10);
                const course = courses.find(c => c.id === id);
                if (course) openCourseModal(course);
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
                    const data = await res.json();
                    if (data.success) {
                        courses = courses.filter(c => c.id !== id);
                        renderCoursesTable();
                        updateCourseSelectDropdowns();
                        updateMetrics();
                    } else {
                        alert('ไม่สามารถลบคอร์สได้');
                    }
                } catch (e) {
                    alert('เกิดข้อผิดพลาดในการลบคอร์ส');
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
                <td>${c.featured ? '<span class="status-badge yellow">★ แนะนำ</span>' : '<span style="color: var(--nimo-muted); font-size: 12px;">ทั่วไป</span>'}</td>
                <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="btn-action secondary btn-edit-course" data-id="${c.id}">✏️ แก้ไข</button>
                    <button type="button" class="btn-action danger btn-delete-course" data-id="${c.id}" data-title="${escapeHtml(c.title)}">🗑️ ลบ</button>
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
            const data = await res.json();
            if (data.success && data.question) {
                const idx = questions.findIndex(q => q.id === data.question.id);
                if (idx >= 0) questions[idx] = data.question;
                else questions.push(data.question);

                renderQuestionsGrid();
                updateMetrics();
                questionModal.close();
            } else {
                alert(data.message || 'บันทึกคำถามไม่สำเร็จ');
            }
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการบันทึกคำถาม');
        }
    });

    function attachQuestionActions() {
        document.querySelectorAll('.btn-edit-question').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const q = questions.find(item => item.id === id);
                if (q) openQuestionModal(q);
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
                    const data = await res.json();
                    if (data.success) {
                        questions = questions.filter(item => item.id !== id);
                        renderQuestionsGrid();
                        updateMetrics();
                    } else {
                        alert('ไม่สามารถลบคำถามได้');
                    }
                } catch (e) {
                    alert('เกิดข้อผิดพลาดในการลบคำถาม');
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
                                ${isCorrect ? '<span style="margin-left: auto; font-size: 11px; font-weight: 700; color: #047857;">✓ คำตอบที่ถูกต้อง</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                ${q.explanation ? `
                    <div class="question-note-box">
                        <strong>💡 คำอธิบายเมื่อผู้เรียนตอบ:</strong>
                        <span>${escapeHtml(q.explanation)}</span>
                    </div>
                ` : ''}
                ${q.hint ? `
                    <div style="font-size: 12px; color: var(--nimo-muted); background: #fefce8; border: 1px solid #fef08a; padding: 7px 10px; border-radius: 8px;">
                        <strong style="color: #b45309;">💬 คำใบ้จาก Nimo:</strong> ${escapeHtml(q.hint)}
                    </div>
                ` : ''}
                <div class="question-card-footer">
                    <button type="button" class="btn-action secondary btn-test-quiz" data-id="${q.id}">
                        <span>🎮 ทดสอบตอบ</span>
                    </button>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" class="btn-action secondary btn-edit-question" data-id="${q.id}">✏️ แก้ไข</button>
                        <button type="button" class="btn-action danger btn-delete-question" data-id="${q.id}">🗑️ ลบ</button>
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
        if (bubble) bubble.textContent = 'ลองตอบดูเลยนะ! ✨';

        const feedback = document.getElementById('tester-feedback');
        feedback.style.display = 'none';

        const choicesContainer = document.getElementById('tester-choices');
        choicesContainer.innerHTML = (q.choices || []).map((choice, i) => `
            <button type="button" class="btn-action secondary tester-choice-btn" data-choice-index="${i}" style="width: 100%; justify-content: flex-start; padding: 12px 16px; font-size: 14px; border-radius: 12px;">
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
                    document.getElementById('tester-feedback-title').textContent = '🎉 ถูกต้องแล้ว! ยอดเยี่ยมมาก';
                    document.getElementById('tester-feedback-text').textContent = q.explanation || 'ทำความเข้าใจจุดสำคัญนี้ได้ดีมาก!';
                    if (bubble) bubble.textContent = 'เก่งมากเลย! ถูกต้องนะ ✨💙';
                } else {
                    feedback.style.background = '#fef2f2';
                    feedback.style.border = '1px solid #fecaca';
                    feedback.style.color = '#b91c1c';
                    document.getElementById('tester-feedback-title').textContent = '💡 ยังไม่ถูกต้อง ลองทบทวนข้อนี้ดูนะ';
                    document.getElementById('tester-feedback-text').textContent = (q.explanation ? q.explanation + ' ' : '') + (q.hint ? `(คำใบ้: ${q.hint})` : '');
                    if (bubble) bubble.textContent = 'ไม่เป็นไรนะ ลองดูคำอธิบายแล้วค่อย ๆ ฝึกไปด้วยกัน! 💙';
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
    }
})();
