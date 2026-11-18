(() => {
    'use strict';

    const dashboard = document.querySelector('[data-home-dashboard]');
    if (!dashboard) return;

    const find = selector => dashboard.querySelector(selector);
    const signedIn = document.body.dataset.authenticated === 'true';
    const preview = !signedIn && document.body.dataset.guestPreview === 'true';
    const message = find('[data-dashboard-message]');
    const continueLink = find('[data-continue-voyage]');
    const activeCourse = find('[data-dashboard-active-course]');
    const start = find('[data-dashboard-start]');
    const suggestions = find('[data-dashboard-recommendations]');
    const meter = find('[data-dashboard-meter]');
    const next = find('[data-dashboard-next]');
    const format = new Intl.NumberFormat('th-TH');
    const goals = [...dashboard.querySelectorAll('[data-dashboard-goal]')];
    const goalStorage = 'nextskill.home-goals.v1';
    let goalDay;
    let previousGoals = new Set();
    const missions = find('#hd-mission-dialog');
    find('[data-dashboard-missions-open]').addEventListener('click', () => missions.showModal());

    function renderGoals(activity) {
        // Match the learning store's calendar day in Thailand.
        const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
        if (goalDay !== today) {
            goalDay = today;
            previousGoals = new Set();
            try {
                const saved = JSON.parse(sessionStorage.getItem(goalStorage));
                if (saved?.day === today && Array.isArray(saved.completed)) previousGoals = new Set(saved.completed);
            } catch { }
        }

        const completed = new Set();
        goals.forEach(goal => {
            const key = goal.dataset.dashboardGoal;
            const target = Number(goal.dataset.target);
            const count = Math.min(target, activity[key]);
            if (!Number.isFinite(count)) return;

            const complete = count === target;
            if (complete) completed.add(key);
            goal.toggleAttribute('data-complete', complete);
            goal.toggleAttribute('data-celebrate', complete && !previousGoals.has(key));
            goal.querySelector('.hd-goal-check').hidden = !complete;
            const unit = key === 'xpToday' ? ' XP' : '';
            goal.querySelector('[data-dashboard-goal-count]').textContent = complete ? 'สำเร็จ'
                : `${format.format(count)}/${format.format(target)}${unit}`;
            goal.querySelector('[data-dashboard-goal-state]').hidden = false;
            const bar = goal.querySelector('progress');
            bar.value = count;
            bar.hidden = false;
        });
        previousGoals = completed;
        try { sessionStorage.setItem(goalStorage, JSON.stringify({ day: today, completed: [...completed] })); } catch { }
    }

    if (preview) {
        dashboard.dataset.status = 'loading';
        message.textContent = 'กำลังโหลดคอร์สของคุณ…';
        suggestions.hidden = true;
    }

    dashboard.addEventListener('nextskill:dashboard-state', ({ detail: state }) => {
        const started = state.courses.filter(course => course.hasStarted);
        const course = started.find(item => item.courseId === state.activeCourseId)
            ?? started.find(item => !item.isComplete) ?? started[0];

        dashboard.dataset.status = 'ready';
        activeCourse.hidden = !course;
        start.hidden = Boolean(course);
        continueLink.hidden = !course;
        find('[data-dashboard-preview]').hidden = !preview;
        find('[data-dashboard-course-label]').textContent = course ? 'คอร์สที่กำลังเรียน' : 'เริ่มเรียน';
        find('[data-dashboard-catalog-label]').textContent = course ? 'เลือกคอร์สใหม่' : 'เริ่มเลือกคอร์ส';

        if (course) {
            const percent = course.progress;
            const completed = course.completedLessons.length;
            const upcoming = course.isComplete ? undefined : course.lessons.find(lesson => lesson.id === course.lastLessonId)
                ?? course.lessons.find(lesson => lesson.id === course.currentIslandId);

            find('[data-dashboard-course-label]').textContent = course.isComplete ? 'คอร์สที่เรียนจบแล้ว'
                : completed ? 'คอร์สที่กำลังเรียน' : 'คอร์สที่เลือกไว้';
            find('[data-dashboard-active-title]').textContent = course.title;
            find('[data-dashboard-ring]').style.setProperty('--hd-progress', percent + '%');
            find('[data-dashboard-percent]').textContent = format.format(percent) + '%';
            find('[data-dashboard-progress]').textContent = completed
                ? `ผ่านแล้ว ${format.format(completed)} จาก ${format.format(course.totalLessons)} บท`
                : 'เริ่มบทแรกเพื่อรับ XP';
            meter.value = percent;
            next.hidden = !upcoming;
            find('[data-dashboard-next-label]').textContent = completed ? 'บทถัดไป' : 'บทแรก';
            find('[data-dashboard-next-title]').textContent = upcoming?.title ?? '';
            continueLink.href = '/Learning/Island?' + new URLSearchParams({ courseId: course.courseId });
            find('[data-dashboard-continue-label]').textContent = course.isComplete ? 'ทบทวนคอร์ส'
                : completed ? 'เรียนต่อ' : 'เริ่มเรียน';
        } else {
            continueLink.removeAttribute('href');
            message.textContent = 'เลือกคอร์สแรก แล้วเริ่มเรียนไปกับ Nimo';
            suggestions.hidden = false;
        }

        find('[data-dashboard-stat="complete"]').textContent = format.format(started.filter(item => item.isComplete).length);
        find('[data-dashboard-stat="xp"]').textContent = format.format(state.xp);
        if (state.activity) {
            find('[data-dashboard-stat="streak"]').textContent = format.format(state.activity.streakDays);
            renderGoals(state.activity);
        }
    });

    document.addEventListener('nextskill:learning-settled', ({ detail }) => {
        if (detail.status !== 'error' || dashboard.dataset.status !== 'loading') return;
        dashboard.dataset.status = 'error';
        message.textContent = 'ยังโหลดคอร์สของคุณไม่ได้';
        find('[data-dashboard-catalog-label]').textContent = 'ดูคอร์สทั้งหมด';
    });
})();
