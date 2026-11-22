(() => {
    'use strict';

    const dashboard = document.querySelector('[data-home-dashboard]');
    if (!dashboard) return;

    const find = selector => dashboard.querySelector(selector);
    const signedIn = document.body.dataset.authenticated === 'true';
    const preview = !signedIn && document.body.dataset.guestPreview === 'true';
    const startLink = find('.hd-start');
    const courseLink = find('[data-dashboard-active-title]');
    const resumeLink = find('[data-dashboard-resume]');
    const meter = find('[data-dashboard-meter]');
    const next = find('[data-dashboard-next]');
    const format = new Intl.NumberFormat('th-TH');
    const goals = [...dashboard.querySelectorAll('[data-dashboard-goal]')];
    const dailyGoals = find('#hd-daily-goals');
    const mission = find('.hd-mission');
    const missionDialog = find('#hd-mission-dialog');
    const missionTrigger = find('.hd-missions-trigger');
    const compact = matchMedia('(width < 768px), (orientation: landscape) and (height < 480px)');
    const missionHome = mission.parentElement;
    let missionOpener;

    function openMissions(event) {
        if (!compact.matches) {
            dailyGoals.focus({ preventScroll: true });
            return;
        }
        if (missionDialog.open) return;
        missionOpener = event.currentTarget;
        missionDialog.prepend(mission);
        missionDialog.showModal();
    }

    missionTrigger.addEventListener('click', openMissions);
    document.getElementById('nimo-missions-open')?.addEventListener('click', openMissions);
    missionDialog.addEventListener('close', () => {
        missionHome.append(mission);
        const focusTarget = missionOpener?.getClientRects().length ? missionOpener : missionTrigger;
        if (focusTarget.getClientRects().length) focusTarget.focus({ preventScroll: true });
        missionOpener = null;
    });
    compact.addEventListener('change', event => {
        if (!event.matches && missionDialog.open) missionDialog.close();
    });

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
        });

        const lessons = status.lessonsToday;
        const xp = status.xpToday;
        const complete = Object.values(status).filter(goal => goal.complete).length;
        const summary = find('[data-dashboard-goal-summary]');
        summary.textContent = `${format.format(complete)}/${format.format(goals.length)}`;
        if (complete === goals.length) {
            dashboard.dataset.missionText = 'ภารกิจวันนี้ครบแล้ว เก่งมากเลย!';
        } else if (lessons.complete && xp.complete) {
            dashboard.dataset.missionText = 'ครบทั้งบทเรียนและ XP แล้ว เหลืออีกหนึ่งภารกิจนะ';
        } else if (lessons.count || xp.count) {
            dashboard.dataset.missionText = `วันนี้เรียนแล้ว ${lessons.count}/${lessons.target} บท · ${xp.count}/${xp.target} XP`;
        } else {
            dashboard.dataset.missionText = `วันนี้ลองเรียน ${lessons.target} บท แล้วสะสม ${xp.target} XP กันนะ`;
        }
    }

    function renderMission(course, upcoming, achievements) {
        const firstAward = upcoming && !achievements.includes('first-lesson');
        const isFinalLesson = upcoming && course.totalLessons - course.completedLessons.length === 1;
        const courseAward = isFinalLesson && !achievements.includes(`course-${course.courseId}`);
        const task = !upcoming ? 'เริ่มคอร์สใหม่เพื่อสะสม XP' : isFinalLesson ? 'ผ่านบทสุดท้าย'
            : course.completedLessons.length ? 'ผ่านบทถัดไป' : 'ผ่านบทแรก';
        find('[data-dashboard-mission-task]').textContent = task;
        find('[data-dashboard-rewards]').hidden = !upcoming;
        if (!upcoming) return;

        const xp = upcoming.xp + (courseAward ? Number(dashboard.dataset.courseBonus) : 0);
        find('[data-dashboard-mission-xp]').textContent = `+${format.format(xp)} XP`;
        const medals = [firstAward && 'เหรียญบทเรียนแรก', courseAward && 'เหรียญจบคอร์ส'].filter(Boolean);
        const badge = find('[data-dashboard-mission-badge]');
        badge.hidden = medals.length === 0;
        badge.querySelector('strong').textContent = medals.join(' · ');
    }

    if (preview) dashboard.dataset.status = 'loading';

    dashboard.addEventListener('nextskill:dashboard-state', ({ detail: state }) => {
        const started = state.courses.filter(course => course.hasStarted);
        const course = started.find(item => item.courseId === state.activeCourseId)
            ?? started.find(item => !item.isComplete) ?? started[0];
        const returning = Boolean(course);

        dashboard.dataset.mode = returning ? 'returning' : 'intro';
        dashboard.dataset.status = 'ready';
        dashboard.setAttribute('aria-labelledby', returning ? 'home-greeting-title' : 'home-hero-title');
        find('[data-dashboard-hero]').hidden = returning;
        find('[data-dashboard-greeting]').hidden = !returning;
        find('[data-dashboard-overview]').hidden = !returning;
        find('[data-dashboard-stats]').hidden = !returning;
        find('[data-dashboard-actions]').hidden = !returning;
        startLink.hidden = returning;

        if (!returning) {
            delete dashboard.dataset.missionText;
            return;
        }

        const completed = course.completedLessons.length;
        const upcoming = !course.isComplete && (course.lessons.find(lesson => lesson.id === course.lastLessonId)
            ?? course.lessons.find(lesson => lesson.id === course.currentIslandId));
        find('[data-dashboard-course-label]').textContent = course.isComplete ? 'คอร์สที่เรียนจบแล้ว'
            : completed ? 'คอร์สที่กำลังเรียน' : 'คอร์สที่เลือกไว้';
        find('[data-dashboard-preview]').hidden = !preview;
        courseLink.href = '/Learning/Island?' + new URLSearchParams({ courseId: course.courseId });
        resumeLink.href = '/Learning/Island?' + new URLSearchParams({ courseId: course.courseId, resume: 'true' });
        find('[data-dashboard-resume-label]').textContent = course.isComplete ? 'ทบทวนบทเรียน' : 'เรียนต่อ';
        courseLink.textContent = course.title;
        find('[data-dashboard-ring]').style.setProperty('--hd-progress', course.progress + '%');
        find('[data-dashboard-percent]').textContent = format.format(course.progress) + '%';
        find('[data-dashboard-progress]').textContent = `ผ่านแล้ว ${format.format(completed)} จาก ${format.format(course.totalLessons)} บท`;
        meter.value = course.progress;
        next.hidden = !upcoming;
        find('[data-dashboard-next-label]').textContent = completed ? 'บทถัดไป' : 'บทแรก';
        find('[data-dashboard-next-title]').textContent = upcoming?.title ?? '';
        find('[data-dashboard-stat="complete"]').textContent = format.format(started.filter(item => item.isComplete).length);
        find('[data-dashboard-stat="xp"]').textContent = format.format(state.xp);
        find('[data-dashboard-streak]').hidden = !state.activity;
        renderMission(course, upcoming, state.achievements);
        dailyGoals.hidden = !state.activity;
        if (state.activity) {
            find('[data-dashboard-stat="streak"]').textContent = format.format(state.activity.streakDays);
            renderGoals(state.activity);
        } else delete dashboard.dataset.missionText;
    });

    document.addEventListener('nextskill:learning-settled', ({ detail }) => {
        if (detail.status === 'error' && dashboard.dataset.status === 'loading') dashboard.dataset.status = 'error';
    });
})();
