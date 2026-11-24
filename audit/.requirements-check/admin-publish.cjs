const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('../../artifacts/home-hero-qa/node_modules/playwright-core');
const origin = 'http://127.0.0.1:52845';
const suffix = randomUUID().slice(0, 8);
const title = 'Admin Draft Workflow ' + suffix;
const admin = 'admin-publish-' + suffix + '@example.test';
const password = randomUUID();

function check(condition, message) {
    assert.ok(condition, message);
    console.log('PASS ' + message);
}

async function token(context, route) {
    const response = await context.get(route);
    assert.equal(response.status(), 200);
    const html = await response.text();
    const csrf = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1];
    assert.ok(csrf, route + ' form token');
    return csrf;
}

async function submitAccountForm(context, route, form) {
    return context.post(route, { form: { ...form, __RequestVerificationToken: await token(context, route) }, maxRedirects: 0 });
}

async function run() {
    const browser = await chromium.launch({
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        args: ['--disable-background-networking', '--disable-component-update', '--proxy-server=127.0.0.1:9']
    });
    try {
        const adminContext = await browser.newContext({ baseURL: origin, serviceWorkers: 'block' });
        const guestContext = await browser.newContext({ baseURL: origin, serviceWorkers: 'block' });
        for (const context of [adminContext, guestContext]) {
            await context.route('**/*', route => new URL(route.request().url()).origin === origin
                ? route.continue() : route.abort('blockedbyclient'));
        }
        const owner = adminContext.request;
        const guest = guestContext.request;
        const page = await adminContext.newPage();
        for (let attempt = 0; attempt <= 30; attempt++) {
            try { if ((await guest.get('/Home/Privacy')).ok()) break; } catch {}
            if (attempt === 30) throw new Error('Local application did not start');
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        assert.equal((await submitAccountForm(owner, '/Account/AdminRegister', {
            FullName: 'Admin Draft Tester', Email: admin, Password: password,
            ConfirmPassword: password, AcceptTerms: 'true', InvitationCode: process.env.NEXTSKILL_REQUIREMENTS_INVITE
        })).status(), 302);
        assert.equal((await submitAccountForm(owner, '/Account/AdminLogin',
            { Email: admin, Password: password })).status(), 302);
        await page.goto('/Account/AdminDashboard#courses');
        page.on('dialog', dialog => dialog.accept());
        const csrf = async () => page.locator('#admin-antiforgery input').inputValue();
        const adminPost = async (route, data) => owner.post('/Account/' + route,
            { data, headers: { 'X-CSRF-TOKEN': await csrf() } });
        async function submitAndReload(button, path) {
            const [response] = await Promise.all([
                page.waitForResponse(r => new URL(r.url()).pathname === path && r.request().method() === 'POST'),
                page.waitForEvent('domcontentloaded'),
                button.click()
            ]);
            assert.ok(response.ok(), path + ' response ' + response.status());
            return response;
        }

        await page.locator('#btn-open-course-modal').click();
        await page.locator('#course-title').fill(title);
        await page.locator('#course-instructor').fill('NextSkill audit');
        await page.locator('[data-lesson-field="title"]').fill('Read and recall');
        const editor = page.locator('[data-lesson-editor]');
        await editor.locator('[data-reading-add]').click();
        await editor.locator('[data-reading-field="heading"]').fill('Core principle');
        await editor.locator('[data-reading-field="text"]').fill('A learner recalls information best when they practise retrieval.');
        await submitAndReload(page.locator('#btn-save-course'), '/Account/AdminSaveCourse');
        const row = page.locator('[data-course-row]').filter({ hasText: title });
        await row.waitFor();
        const id = Number(await row.getAttribute('data-id'));
        check(await row.locator('.btn-publish-course').isVisible() &&
            await row.locator('a[href*="Details"]').count() === 0, 'draft UI exposes publication but no broken public link');
        check((await guest.get('/Home/Details/' + id)).status() === 404 &&
            !(await (await guest.get('/Learning/Catalog')).json()).courses.some(course => course.id === id),
            'a draft is hidden in learner list and direct details');
        check((await adminPost('AdminPublishCourse', { id })).status() === 400, 'incomplete draft cannot publish');

        await page.locator('.admin-nav a[href="#questions"]').click();
        async function addQuestion(destination, titleText, courseId = id) {
            await page.locator('#btn-open-question-modal').click();
            await page.locator('#q-course-id').selectOption(String(courseId));
            await page.locator('#q-lesson-id').selectOption(String(destination));
            await page.locator('#q-prompt').fill(titleText);
            await page.locator('#q-choice-0').fill('Retrieve information');
            await page.locator('#q-choice-1').fill('Avoid reading');
            await page.locator('#q-explanation').fill('Retrieval involves recalling the material before checking.');
            await submitAndReload(page.locator('#btn-save-question'), '/Account/AdminSaveQuestion');
        }
        await addQuestion(1, 'What action strengthens recall?');
        await addQuestion(0, 'How does retrieval differ from passive review?');
        check((await adminPost('AdminPublishCourse', { id })).status() === 400, 'one final question is insufficient for publication');
        await addQuestion(0, 'Which habit supports checking what you retained?');
        check(await page.locator('[data-question-course]').filter({ hasText: title + ' · แบบทดสอบท้ายคอร์ส' }).count() === 2,
            'Studio saves explicit final questions under the course');

        await page.locator('.admin-nav a[href="#courses"]').click();
        await submitAndReload(row.locator('.btn-publish-course'), '/Account/AdminPublishCourse');
        const courseView = await guest.get('/Home/Details/' + id);
        const courseList = await (await guest.get('/Learning/Catalog')).json();
        check(courseView.status() === 200 && courseList.courses.some(course => course.id === id && course.canStart),
            'publishing a complete course makes it visible and startable');

        const list = await (await owner.get('/Account/AdminGetQuestions?courseId=' + id)).json();
        const lessonQuestion = list.find(q => q.lessonId === 1);
        const finalQuestion = list.find(q => q.lessonId === 0);
        check((await adminPost('AdminDeleteQuestion', { id: lessonQuestion.id })).status() === 400 &&
            (await adminPost('AdminDeleteQuestion', { id: finalQuestion.id })).status() === 400,
            'cannot delete required lesson or final questions from a published course');
        const badEdit = await adminPost('AdminSaveCourse', {
            id, title, category: 'Design', instructor: 'NextSkill audit', lessons: [
                { id: 2, title: 'Repurposed lesson', reading: [{ heading: 'Title', text: 'Text' }] }
            ]
        });
        check(badEdit.status() === 400, 'published lesson identity is immutable');
        await row.locator('.btn-edit-course').click();
        check(await page.locator('#course-add-lesson').isHidden() &&
            await page.locator('[data-reading-field="heading"]').inputValue() === 'Core principle',
            'published course editor retains reading fields and hides lesson ID changes');
        await page.locator('[data-close-modal="course-modal"]').first().click();
        await submitAndReload(row.locator('.btn-delete-course'), '/Account/AdminDeleteCourse');
        check((await guest.get('/Home/Details/' + id)).status() === 404, 'archiving removes a published course from the learner catalog');

        await page.locator('.admin-nav a[href="#questions"]').click();
        await addQuestion(0, 'Legacy explicit final first ' + suffix, 101);
        check((await (await guest.get('/Learning/Catalog')).json()).courses.find(course => course.id === 101).canStart,
            'legacy course stays startable while its first authored final question is saved');
        await addQuestion(0, 'Legacy explicit final second ' + suffix, 101);
        const legacyQuestions = await (await owner.get('/Account/AdminGetQuestions?courseId=101')).json();
        const legacyFinal = legacyQuestions.find(question => question.lessonId === 0);
        check((await adminPost('AdminDeleteQuestion', { id: legacyFinal.id })).status() === 400,
            'a legacy course switched to explicit finals keeps the required new final questions');
    } finally {
        await browser.close();
    }
}
run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
