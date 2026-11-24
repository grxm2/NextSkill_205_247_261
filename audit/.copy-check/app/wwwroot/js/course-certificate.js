(() => {
    'use strict';

    document.getElementById('print-certificate')?.addEventListener('click', () => window.print());

    const dialog = document.getElementById('course-award-dialog');
    if (!dialog) return;

    const title = document.getElementById('course-award-title');
    const message = document.getElementById('course-award-message');
    const learnerAccount = dialog.dataset.learnerAccount === 'true';
    let hasShownFirstLesson = false;

    function show(result, courseId, hadFirstLessonAward) {
        if (!result.passed || dialog.open || Number(dialog.dataset.courseId) !== courseId) return;
        if (hadFirstLessonAward || hasShownFirstLesson || !result.state.achievements.includes('first-lesson')) return;

        hasShownFirstLesson = true;
        title.textContent = 'ได้รับเหรียญบทเรียนแรก';
        message.textContent = learnerAccount ? 'เปิดดูเหรียญได้ในหน้าโปรไฟล์' : 'เหรียญอยู่ในผลทดลองสำหรับเบราว์เซอร์นี้';
        dialog.showModal();
    }

    window.NextSkillCourseAward = { show };
})();
