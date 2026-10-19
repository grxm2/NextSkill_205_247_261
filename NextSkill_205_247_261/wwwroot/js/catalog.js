// catalog.js
// Manages per-course progress using localStorage. Stores a map: { [courseId]: { started: bool, completed: [lessonId,...] } }
(function () {
    const STORAGE_KEY = 'courseProgress_v1';

    function readMap() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('Failed to read progress', e);
            return {};
        }
    }

    function writeMap(map) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
        } catch (e) {
            console.error('Failed to save progress', e);
        }
    }

    function getCourseState(courseId) {
        const map = readMap();
        return map[courseId] || { started: false, completed: [] };
    }

    function setCourseState(courseId, state) {
        const map = readMap();
        map[courseId] = state;
        writeMap(map);
    }

    function updateCardProgress($card) {
        const id = $card.dataset.courseId;
        const total = parseInt($card.dataset.totalLessons || '0');
        const state = getCourseState(id);
        const completed = (state.completed || []).length;
        let percent = 0;
        let status = 'Not started';
        if (total > 0) {
            percent = Math.round((completed / total) * 100);
            if (completed === 0 && state.started) status = 'In progress';
            else if (completed === 0) status = 'Not started';
            else if (completed >= total) status = 'Completed';
            else status = 'In progress';
        }

        const bar = $card.querySelector('.progress-bar');
        const percentEl = $card.querySelector('.percent');
        const statusEl = $card.querySelector('.status');
        if (bar) bar.style.width = percent + '%';
        if (percentEl) percentEl.textContent = percent + '%';
        if (statusEl) statusEl.textContent = status;
    }

    function initCatalogPage() {
        const cards = document.querySelectorAll('.course-card');
        cards.forEach(card => {
            updateCardProgress(card);
            const startLink = card.querySelector('.start-link');
            if (startLink) {
                startLink.addEventListener('click', function (e) {
                    // mark started before navigating
                    const courseId = this.dataset.courseId;
                    const state = getCourseState(courseId);
                    if (!state.started) {
                        state.started = true;
                        setCourseState(courseId, state);
                    }
                    // allow navigation
                });
            }
        });
    }

    function initDetailsPage() {
        if (typeof COURSE_ID === 'undefined') return;
        const courseId = String(COURSE_ID);
        const state = getCourseState(courseId);
        // set UI status
        const progressBar = document.getElementById('detailProgressBar');
        const statusEl = document.getElementById('detailStatus');
        const lessonItems = document.querySelectorAll('[data-lesson-id]');
        const total = lessonItems.length;

        function refresh() {
            const s = getCourseState(courseId);
            const completed = (s.completed || []).length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            if (progressBar) {
                progressBar.style.width = percent + '%';
                progressBar.textContent = percent + '%';
            }
            if (statusEl) {
                if (completed === 0 && s.started) statusEl.textContent = 'In progress';
                else if (completed === 0) statusEl.textContent = 'Not started';
                else if (completed >= total) statusEl.textContent = 'Completed';
                else statusEl.textContent = 'In progress';
            }
            // update lesson buttons
            lessonItems.forEach(li => {
                const lid = li.dataset.lessonId;
                const btn = li.querySelector('.mark-complete');
                if (s.completed && s.completed.indexOf(Number(lid)) !== -1) {
                    li.classList.add('completed');
                    if (btn) {
                        btn.textContent = 'Completed';
                        btn.disabled = true;
                        btn.classList.remove('btn-outline-success');
                        btn.classList.add('btn-success');
                    }
                } else {
                    li.classList.remove('completed');
                    if (btn) {
                        btn.textContent = 'Mark as complete';
                        btn.disabled = false;
                        btn.classList.remove('btn-success');
                        btn.classList.add('btn-outline-success');
                    }
                }
            });
        }

        // mark start
        const startBtn = document.getElementById('startLearning');
        if (startBtn) {
            startBtn.addEventListener('click', function () {
                const s = getCourseState(courseId);
                if (!s.started) {
                    s.started = true;
                    setCourseState(courseId, s);
                }
                // scroll to lessons
                const firstLesson = document.querySelector('[data-lesson-id]');
                if (firstLesson) firstLesson.scrollIntoView({ behavior: 'smooth' });
                refresh();
            });
        }

        // lesson complete handlers
        document.addEventListener('click', function (e) {
            if (!e.target.matches('.mark-complete')) return;
            const btn = e.target;
            const lid = Number(btn.dataset.lessonId);
            const s = getCourseState(courseId);
            if (!s.completed) s.completed = [];
            if (s.completed.indexOf(lid) === -1) s.completed.push(lid);
            setCourseState(courseId, s);
            refresh();
        });

        // initial refresh
        refresh();
    }

    // init on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function () {
        if (document.querySelector('.course-catalog')) initCatalogPage();
        if (document.querySelector('.course-detail')) initDetailsPage();
    });

})();
