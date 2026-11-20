(() => {
    'use strict';

    const dashboard = document.querySelector('[data-home-dashboard]');
    if (!dashboard) return;

    const find = selector => dashboard.querySelector(selector);
    const signedIn = document.body.dataset.authenticated === 'true';
    const preview = !signedIn && document.body.dataset.guestPreview === 'true';
    const continueLink = find('[data-continue-voyage]');
    const meter = find('[data-dashboard-meter]');
    const next = find('[data-dashboard-next]');
    const format = new Intl.NumberFormat('th-TH');
    const goals = [...dashboard.querySelectorAll('[data-dashboard-goal]')];
    const missions = find('#hd-mission-dialog');

    document.getElementById('nimo-missions-open')?.addEventListener('click', () => missions.showModal());
    missions.addEventListener('close', () =>
        document.getElementById('buddy-agent-handle')?.focus({ preventScroll: true }));

    function renderGoals(activity) {
        const status = {};
        goals.forEach(goal => {
            const key = goal.dataset.dashboardGoal;
            const target = Number(goal.dataset.target);
            const count = Math.min(target, activity[key]);
            const complete = count === target;
            status[key] = { count, target, complete };
            goal.toggleAttribute('data-complete', complete);
            goal.querySelector('.hd-goal-check').hidden = !complete;
            goal.querySelector('[data-dashboard-goal-count]').textContent = complete ? 'สำเร็จ'
                : `${format.format(count)}/${format.format(target)}${key === 'xpToday' ? ' XP' : ''}`;
            goal.querySelector('progress').value = count;
        });

        const lessons = status.lessonsToday;
        const xp = status.xpToday;
        if (Object.values(status).every(goal => goal.complete)) {
            dashboard.dataset.missionText = 'ภารกิจวันนี้ครบแล้ว เก่งมากเลย!';
        } else if (lessons.complete && xp.complete) {
            dashboard.dataset.missionText = 'ครบทั้งบทเรียนและ XP แล้ว เหลืออีกหนึ่งภารกิจนะ';
        } else if (lessons.count || xp.count) {
            dashboard.dataset.missionText = `วันนี้เรียนแล้ว ${lessons.count}/${lessons.target} บท · ${xp.count}/${xp.target} XP`;
        } else {
            dashboard.dataset.missionText = `วันนี้ลองเรียน ${lessons.target} บท แล้วสะสม ${xp.target} XP กันนะ`;
        }
    }

    if (preview) dashboard.dataset.status = 'loading';

    dashboard.addEventListener('nextskill:dashboard-state', ({ detail: state }) => {
        const started = state.courses.filter(course => course.hasStarted);
        const course = started.find(item => item.courseId === state.activeCourseId)
            ?? started.find(item => !item.isComplete) ?? started[0];
        const returning = Boolean(course && (state.xp > 0 || state.courses.some(item => item.completedLessons.length)));

        dashboard.dataset.mode = returning ? 'returning' : 'intro';
        dashboard.dataset.status = 'ready';
        dashboard.setAttribute('aria-labelledby', returning ? 'home-greeting-title' : 'home-hero-title');
        find('[data-dashboard-hero]').hidden = returning;
        find('[data-dashboard-greeting]').hidden = !returning;
        find('[data-dashboard-active-course]').hidden = !returning;
        find('[data-dashboard-stats]').hidden = !returning;
        find('[data-dashboard-catalog-label]').textContent = course ? 'เลือกคอร์สใหม่' : 'เริ่มเลือกคอร์ส';

        continueLink.hidden = !course;
        if (course) {
            continueLink.href = '/Learning/Island?' + new URLSearchParams({ courseId: course.courseId });
            find('[data-dashboard-continue-label]').textContent = course.isComplete ? 'ทบทวนคอร์ส'
                : course.completedLessons.length ? 'เรียนต่อ' : 'เริ่มเรียน';
        } else continueLink.removeAttribute('href');

        if (!returning) {
            continueLink.removeAttribute('aria-describedby');
            delete dashboard.dataset.missionText;
            return;
        }

        continueLink.setAttribute('aria-describedby', 'hd-active-course');
        const completed = course.completedLessons.length;
        const upcoming = !course.isComplete && (course.lessons.find(lesson => lesson.id === course.lastLessonId)
            ?? course.lessons.find(lesson => lesson.id === course.currentIslandId));
        find('[data-dashboard-course-label]').textContent = course.isComplete ? 'คอร์สที่เรียนจบแล้ว'
            : completed ? 'คอร์สที่กำลังเรียน' : 'คอร์สที่เลือกไว้';
        find('[data-dashboard-preview]').hidden = !preview;
        find('[data-dashboard-active-title]').textContent = course.title;
        find('[data-dashboard-ring]').style.setProperty('--hd-progress', course.progress + '%');
        find('[data-dashboard-percent]').textContent = format.format(course.progress) + '%';
        find('[data-dashboard-progress]').textContent = completed
            ? `ผ่านแล้ว ${format.format(completed)} จาก ${format.format(course.totalLessons)} บท`
            : 'เริ่มบทแรกเพื่อรับ XP';
        meter.value = course.progress;
        next.hidden = !upcoming;
        find('[data-dashboard-next-label]').textContent = completed ? 'บทถัดไป' : 'บทแรก';
        find('[data-dashboard-next-title]').textContent = upcoming?.title ?? '';
        find('[data-dashboard-stat="complete"]').textContent = format.format(started.filter(item => item.isComplete).length);
        find('[data-dashboard-stat="xp"]').textContent = format.format(state.xp);
        find('[data-dashboard-streak]').hidden = !state.activity;
        if (state.activity) {
            find('[data-dashboard-stat="streak"]').textContent = format.format(state.activity.streakDays);
            renderGoals(state.activity);
        } else delete dashboard.dataset.missionText;
    });

    document.addEventListener('nextskill:learning-settled', ({ detail }) => {
        if (detail.status === 'error' && dashboard.dataset.status === 'loading') dashboard.dataset.status = 'error';
    });
})();
