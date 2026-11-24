const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const { request } = require('../../artifacts/home-hero-qa/node_modules/playwright-core');
const fixtures = require('./app/Database/custom_questions.json');

const origin = 'http://127.0.0.1:52844';
const accountName = 'Certificate Test Original';
const updatedName = 'Certificate Test Renamed';
const email = 'certificate-check-' + randomUUID().slice(0, 8) + '@example.test';
const password = randomUUID();

function check(condition, message) {
    assert.ok(condition, message);
    console.log('PASS ' + message);
}

async function getToken(context, route) {
    const response = await context.get(route);
    assert.equal(response.status(), 200);
    const html = await response.text();
    const token = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1];
    assert.ok(token, 'Expected anti-forgery token at ' + route);
    return token;
}

async function submitForm(context, route, token, form) {
    return context.post(route, { form: { ...form, __RequestVerificationToken: token } });
}

function reference(html) {
    return html.match(/code=(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})/)?.[1];
}

async function run() {
    const learner = await request.newContext({ baseURL: origin, maxRedirects: 0 });
    const guest = await request.newContext({ baseURL: origin, maxRedirects: 0 });
    try {
        for (let attempt = 0; attempt <= 25; attempt++) {
            try { if ((await guest.get('/Home/Privacy')).ok()) break; } catch {}
            if (attempt === 25) throw new Error('Local application did not start');
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        const registration = await submitForm(learner, '/Account/Register', await getToken(learner, '/Account/Register'),
            { FullName: accountName, Email: email, Password: password, ConfirmPassword: password, AcceptTerms: 'true' });
        assert.equal(registration.status(), 302);
        assert.equal((await submitForm(learner, '/Account/Login', await getToken(learner, '/Account/Login'),
            { Email: email, Password: password })).status(), 302);
        const token = await getToken(learner, '/Home/Details/101');
        const action = async (route, body) => {
            const response = await learner.post('/Learning/' + route, { data: body, headers: { 'X-CSRF-TOKEN': token } });
            assert.equal(response.status(), 200, route + ': ' + await response.text());
            return response.json();
        };
        await action('SelectCourse', { courseId: 101 });
        for (let lessonId = 1; lessonId <= 3; lessonId++) {
            const ids = { courseId: 101, lessonId };
            const content = await learner.get('/Learning/Lesson?courseId=101&lessonId=' + lessonId);
            assert.equal(content.status(), 200);
            let lesson = await content.json();
            if (lesson.video) {
                const video = { ...ids, videoId: lesson.video.youTubeId };
                await action('StartVideo', video);
                lesson = await action('CompleteVideo', { ...video, skipVideo: true });
            }
            assert.ok(lesson.quizVersion);
            const answerData = { ...ids, quizVersion: lesson.quizVersion,
                answers: fixtures.filter(q => q.CourseId === 101 && q.LessonId === lessonId).map(q => q.CorrectChoice) };
            const result = await action('CompleteLesson', answerData);
            assert.equal(result.passed, true);
            if (lessonId === 3) {
                assert.equal(result.awardedXp, 150);
                assert.equal((await action('CompleteLesson', answerData)).awardedXp, 0);
            }
        }
        const issued = await learner.get('/Account/Certificate?courseId=101');
        const original = await issued.text();
        const code = reference(original);
        check(issued.status() === 200 && original.includes(accountName) && original.includes('print-certificate') && code,
            'completion issues a printable certificate with reference');
        const profile = await submitForm(learner, '/Account/UpdateProfile', await getToken(learner, '/Account/Dashboard'),
            { 'Edit.FullName': updatedName, 'Edit.Email': email });
        assert.equal(profile.status(), 302);
        const reopened = await (await learner.get('/Account/Certificate?courseId=101')).text();
        check(reopened.includes(accountName) && !reopened.includes(updatedName) && reference(reopened) === code,
            'renaming profile preserves issued name and reference');
        const verified = await guest.get('/Account/VerifyCertificate?code=' + code);
        const verification = await verified.text();
        check(verified.status() === 200 && !verification.includes(accountName) && !verification.includes(updatedName) &&
            !verification.includes(email) && verification.includes('verification-title'),
            'public reference resolves with no account information');
        check((await guest.get('/Account/VerifyCertificate?code=' + randomUUID())).status() === 404 &&
            (await guest.get('/Account/Certificate?courseId=101')).status() === 302,
            'unknown reference and unauthenticated private view handled correctly');

        const legacyQuery = "DECLARE @id uniqueidentifier=(SELECT Id FROM dbo.Users WHERE Email='" + email + "');"
            + "INSERT INTO dbo.LearningAchievements(AccountId,AccountRole,AchievementKey,EarnedAt)"
            + "VALUES (@id,'User','course-102','2026-10-12T11:30:00');";
        execFileSync('sqlcmd', ['-S', '(localdb)\\NextSkill_Audit_20261123', '-E', '-C', '-b', '-d',
            'NextSkill_Audit_Certificates', '-Q', legacyQuery], { stdio: 'pipe' });
        const historical = await learner.get('/Account/Certificate?courseId=102');
        const historicalHtml = await historical.text();
        check(historical.status() === 200 && !reference(historicalHtml) && historicalHtml.includes('2026-10-12'),
            'legacy award retains the recorded completion date before issuance');
        const legacyToken = await getToken(learner, '/Account/Certificate?courseId=102');
        assert.equal((await submitForm(learner, '/Account/IssueCertificate', legacyToken, { courseId: 102 })).status(), 302);
        const legacyIssued = await (await learner.get('/Account/Certificate?courseId=102')).text();
        const legacyReference = reference(legacyIssued);
        assert.equal((await submitForm(learner, '/Account/IssueCertificate', legacyToken, { courseId: 102 })).status(), 302);
        const issuedAgain = await (await learner.get('/Account/Certificate?courseId=102')).text();
        check(legacyReference && reference(issuedAgain) === legacyReference && legacyIssued.includes(updatedName) &&
            legacyIssued.includes('2026-10-12'), 'legacy issuance snapshots current identity once and retains original date');
        check((await submitForm(learner, '/Account/IssueCertificate', legacyToken, { courseId: 103 })).status() === 404,
            'a learner without a course award cannot get a reference');
    } finally {
        await learner.dispose();
        await guest.dispose();
    }
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
