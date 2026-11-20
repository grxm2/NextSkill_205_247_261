(() => {
    'use strict';

    document.getElementById('print-certificate')?.addEventListener('click', () => window.print());

    const dialog = document.getElementById('course-award-dialog');
    if (!dialog) return;

    const title = document.getElementById('course-award-title');
    const message = document.getElementById('course-award-message');
    const certificate = document.getElementById('course-award-certificate');
    const certificateLink = document.getElementById('course-award-certificate-link');
    const learnerAccount = dialog.dataset.learnerAccount === 'true';
    let hasShownCourseAward = false;
    let hasShownFirstLesson = false;

    function show(result, courseId, hadCourseAward, hadFirstLessonAward) {
        if (!result.passed || dialog.open || Number(dialog.dataset.courseId) !== courseId) return;

        const awards = result.state.achievements;
        const courseAward = !hadCourseAward && !hasShownCourseAward && awards.includes(`course-${courseId}`);
        const firstLesson = hadFirstLessonAward === false && !hasShownFirstLesson && awards.includes('first-lesson');
        if (!courseAward && !firstLesson) return;

        hasShownCourseAward ||= courseAward;
        hasShownFirstLesson ||= firstLesson;
        certificate.hidden = !courseAward;
        if (certificateLink) certificateLink.hidden = !courseAward;

        if (courseAward) {
            title.textContent = 'เรียนจบคอร์สแล้ว!';
            message.textContent = learnerAccount
                ? 'ได้รับเหรียญความสำเร็จและใบประกาศแล้ว เปิดดูได้จากหน้าโปรไฟล์ของคุณ'
                : 'ได้รับเหรียญในโหมดทดลอง นี่คือตัวอย่างใบประกาศของคุณ';
        } else {
            title.textContent = 'ได้รับเหรียญบทเรียนแรก!';
            message.textContent = learnerAccount ? 'เหรียญของคุณแสดงอยู่ในหน้าโปรไฟล์' : 'เหรียญของคุณบันทึกไว้ในเซสชันทดลองนี้';
        }
        dialog.showModal();
    }

    window.NextSkillCourseAward = { show };
})();
