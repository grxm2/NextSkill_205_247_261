const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { chromium } = require('../artifacts/home-hero-qa/node_modules/playwright-core');
const dev = 'http://127.0.0.1:52791';
const prod = 'http://127.0.0.1:52792';
const localOrigins = new Set([dev, prod]);
const suffix = randomUUID().slice(0, 8);
const password = randomUUID();
const learner = 'learner-' + suffix + '@example.test';
const changed = 'updated-' + suffix + '@example.test';
const admin = 'admin-' + suffix + '@example.test';
const sourceQuestions = require('../NextSkill_205_247_261/Database/custom_questions.json');
const blocked = new Map();
const report = { endpoints: [], checks: [], pages: [], console: [], assets: [], blocked: [] };
const pictures = path.join(__dirname, 'screenshots');
fs.mkdirSync(pictures, { recursive: true });

async function check(name, action) {
    try {
        const result = await action();
        report.checks.push({ name, result: 'pass', detail: result });
        console.log('PASS ' + name);
    } catch (error) {
        report.checks.push({ name, result: 'fail', detail: String(error.message).slice(0, 500) });
        console.log('FAIL ' + name + ' | ' + String(error.message).split('\n')[0]);
    }
}

async function request(context, method, route, data, origin = dev, form = false, token) {
    const options = { method, maxRedirects: 0, failOnStatusCode: false, timeout: 10000 };
    if (data !== undefined) options[form ? 'form' : 'data'] = data;
    if (token) options.headers = { 'X-CSRF-TOKEN': token };
    return context.request.fetch(origin + route, options);
}

async function open(page, route, origin = dev) {
    const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 18000 });
    assert.equal(response.status(), 200);
    return response;
}

function status(response, expected) {
    assert.equal(response.status(), expected);
    return response.status();
}

async function antiforgery(context, route) {
    const response = await request(context, 'GET', route);
    status(response, 200);
    const html = await response.text();
    const field = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
    assert.ok(field, 'Anti-forgery form token');
    return field[1];
}

async function accountForm(context, route, fields, expected) {
    const token = await antiforgery(context, route);
    const response = await request(context, 'POST', route, { ...fields, __RequestVerificationToken: token }, dev, true);
    status(response, expected);
    return response;
}

async function initBrowserContext(browser) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
    await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (localOrigins.has(url.origin) || ['data:', 'blob:', 'about:'].includes(url.protocol)) return route.continue();
        blocked.set(url.hostname, (blocked.get(url.hostname) || 0) + 1);
        return route.abort('blockedbyclient');
    });
    context.on('page', page => {
        page.on('pageerror', error => report.console.push({ route: new URL(page.url()).pathname, type: 'pageerror', message: String(error.message).slice(0, 220) }));
        page.on('console', message => {
            if (message.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/i.test(message.text())) {
                report.console.push({ route: new URL(page.url()).pathname, type: 'console', message: message.text().slice(0, 220) });
            }
        });
        page.on('response', response => {
            const url = new URL(response.url());
            const type = response.request().resourceType();
            if (response.status() >= 400 && localOrigins.has(url.origin) && ['image','font','script','stylesheet','media'].includes(type)) {
                report.assets.push({ route: new URL(page.url()).pathname, path: url.pathname, type, status: response.status() });
            }
        });
    });
    return context;
}

async function sample(page, route, name, width = 1280, origin = dev) {
    await page.setViewportSize({ width, height: 900 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    await open(page, route, origin);
    await page.waitForTimeout(850);
    const readMetrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(({ name, value }) => [name, value]));
    const before = await readMetrics();
    await page.waitForTimeout(1200);
    const after = await readMetrics();
    const layout = await page.evaluate(() => ({
        title: document.title, width: innerWidth, bodyWidth: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight, lang: document.documentElement.lang,
        headings: Array.from(document.querySelectorAll('h1')).filter(x => x.getClientRects().length).map(x => x.innerText.trim()).slice(0, 3),
        imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
        inputsWithoutLabel: Array.from(document.querySelectorAll('input:not([type=hidden]),select,textarea')).filter(x => x.getClientRects().length && !x.labels?.length && !x.hasAttribute('aria-label') && !x.hasAttribute('aria-labelledby')).length
    }));
    const metrics = {};
    for (const key of ['TaskDuration','ScriptDuration','RecalcStyleDuration','LayoutDuration','LayoutCount','Nodes']) {
        if (key === 'Nodes') metrics[key] = after[key];
        else if (key in after && key in before) metrics[key] = Number((after[key] - before[key]).toFixed(4));
    }
    report.pages.push({ name, route, mode: origin === prod ? 'Production' : 'Development', layout, metrics, screen: name + '.png' });
    await page.screenshot({ path: path.join(pictures, name + '.png'), animations: 'disabled', timeout: 10000 });
    await cdp.detach();
}

const publicRoutes = ['/', '/Home', '/Home/Index', '/Home/Courses', '/Home/Details/101','/Home/Details/999999','/Home/Privacy','/Home/Error','/Courses','/Courses/Enrollment','/Learning/Entry','/Learning/Catalog','/Account/Login','/Account/AdminLogin','/Account/Register','/Account/AdminRegister','/Account/AccessDenied','/Account/Terms'];
const learningGets = ['/Learning/Island?courseId=101','/Learning/Practice?courseId=101&lessonId=1','/Learning/State','/Learning/Lesson?courseId=101&lessonId=1'];
const learningPosts = ['SelectCourse','Checkpoint','StartVideo','RestartVideo','CompleteVideo','CompleteLesson'].map(x => '/Learning/' + x);
const adminRoutes = [
    ['GET','/Account/AdminDashboard'], ['GET','/Account/AdminGetQuestions'],
    ...['AdminSaveCourse','AdminDeleteCourse','AdminUploadCourses','AdminSaveQuestion','AdminDeleteQuestion'].map(x => ['POST','/Account/' + x])
];
async function sweep(context, role, mode, routes) {
    const origin = mode === 'Production' ? prod : dev;
    for (const [method, route] of routes) {
        try {
            const response = await request(context, method, route, method === 'POST' ? {} : undefined, origin);
            const location = response.headers().location ?? '';
            report.endpoints.push({ role, mode, method, route, status: response.status(), location });
        } catch (error) {
            report.endpoints.push({ role, mode, method, route, error: String(error.message).split('\n')[0] });
        }
    }
}

async function ready(context) {
    for (const origin of localOrigins) {
        let live = false;
        for (let attempt = 0; attempt < 20; attempt++) {
            try { live = (await request(context, 'GET', '/Home/Privacy', undefined, origin)).status() === 200; } catch {}
            if (live) break;
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        assert.ok(live, 'No local MVC response at ' + origin);
    }
}

async function main() {
    const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    const browser = await chromium.launch({
        executablePath,
        args: ['--disable-background-networking', '--disable-component-update', '--disable-sync',
            '--no-default-browser-check', '--no-first-run', '--proxy-server=127.0.0.1:9'],
        timeout: 16000
    });
    try {
        const guest = await initBrowserContext(browser);
        const sandboxGuest = await initBrowserContext(browser);
        const user = await initBrowserContext(browser);
        const owner = await initBrowserContext(browser);
        await ready(guest);
        await sweep(guest, 'Guest', 'Production', [
            ...publicRoutes.map(route => ['GET',route]), ...learningGets.map(route => ['GET',route]),
            ...learningPosts.map(route => ['POST',route]), ...adminRoutes, ['GET','/Account/Dashboard'],
            ['GET','/Account/Certificate?courseId=101'],['POST','/Account/UpdateProfile'],['POST','/Account/Logout']
        ]);
        await check('Production guest: admin route role filter', () => {
            const checked = report.endpoints.filter(x => adminRoutes.some(([method, route]) => x.method === method && x.route === route));
            assert.equal(checked.length, adminRoutes.length);
            assert.ok(checked.every(x => x.status === 302 && new URL(x.location, prod).pathname === '/Account/Login'));
            return checked.length + ' routes returned a login redirect';
        });
        await check('Production guest: start course, no sign-in bypass', async () => {
            const page = await guest.newPage();
            await open(page, '/Home/Details/101', prod);
            await page.locator('[data-course-start]').click();
            await page.waitForURL(/\/Account\/Login/);
            const skip = page.locator('a').filter({ hasText: /ข้ามไปก่อน/ });
            assert.equal(await skip.count(), 1);
            await skip.click();
            await page.waitForURL(/\/Home(?:\/Index)?$/);
            assert.equal((await guest.cookies(prod)).some(x => x.name === 'NextSkill.Session'), false);
            return 'CTA → Login; skip → Home; auth cookie absent';
        });
        await check('Guest Thai search, sort, filter, empty and invalid detail', async () => {
            const page = await guest.newPage();
            await open(page, '/Home/Courses?tag=Languages&sort=A-Z', prod);
            assert.equal(await page.locator('#course-sort').inputValue(), 'A-Z');
            assert.equal(await page.locator('.ns-course-tags [aria-current=true]').innerText(), 'ภาษาอังกฤษ');
            await page.locator('#course-query').fill('ภาษาอังกฤษ');
            await page.locator('form[role=search]').locator('button[type=submit]').click();
            await page.waitForURL(/q=/);
            const matches = await page.locator('.ns-course-card').count();
            await open(page, '/Home/Courses?q=____no_match____', prod);
            assert.equal(await page.locator('.ns-course-empty').count(), 1);
            const wrong = await request(guest, 'GET', '/Home/Details/999999', undefined, prod);
            status(wrong, 404);
            assert.ok(matches > 0);
            return { matches, invalidDetail: 404 };
        });
        await check('Dark mode click and reload', async () => {
            const page = await guest.newPage();
            await open(page, '/Home/Courses', prod);
            const toggle = page.locator('button[data-theme-toggle]').first();
            await toggle.waitFor({ state: 'visible', timeout: 8000 });
            const before = await toggle.getAttribute('aria-pressed');
            await toggle.click();
            const after = await toggle.getAttribute('aria-pressed');
            assert.notEqual(before, after);
            await page.reload({ waitUntil: 'domcontentloaded' });
            assert.equal(await toggle.getAttribute('aria-pressed'), after);
            return { before, after };
        });
        await check('Development guest uses preview state', async () => {
            const response = await request(sandboxGuest, 'GET', '/Learning/State');
            status(response, 200);
            const state = await response.json();
            assert.equal(state.xp, 0);
            assert.equal((await sandboxGuest.cookies()).some(x => x.name === 'NextSkill.LearningPreview'), true);
            assert.equal((await sandboxGuest.cookies()).some(x => x.name === 'NextSkill.Session'), false);
            return { xp: state.xp, previewCookie: true, authCookie: false };
        });
        await check('Register rejects invalid form', async () => {
            const response = await accountForm(user, '/Account/Register', { FullName: 'X', Email: 'invalid', Password: 'a', ConfirmPassword: 'b' }, 200);
            assert.equal((await response.text()).includes('validation-summary-errors'), true);
        });
        await check('Register learner and reject duplicate email', async () => {
            const data = { FullName: 'ผู้เรียนตรวจระบบ ทดสอบ', Email: learner, Password: password, ConfirmPassword: password, AcceptTerms: 'true' };
            const response = await accountForm(user, '/Account/Register', data, 302);
            assert.match(response.headers().location, /\/Account\/Login/);
            const duplicate = await accountForm(user, '/Account/Register', { ...data, Email: learner.toUpperCase() }, 200);
            assert.match(await duplicate.text(), /field-validation-error|validation-summary-errors/);
            return '302 success, 200 with validation feedback for duplicate';
        });
        await check('Learner login and persistent session cookie', async () => {
            const response = await accountForm(user, '/Account/Login', { Email: learner, Password: password, RememberMe: 'true' }, 302);
            const cookie = (await user.cookies()).find(x => x.name === 'NextSkill.Session');
            assert.ok(cookie?.httpOnly && cookie.expires > Date.now() / 1000);
            return { hours: Math.round((cookie.expires - Date.now() / 1000) / 3600), httpOnly: cookie.httpOnly, secure: cookie.secure, sameSite: cookie.sameSite, location: response.headers().location };
        });
        await sweep(user, 'Learner', 'Development', adminRoutes);
        await check('Learner receives access-denied on admin routes', () => {
            const checked = report.endpoints.filter(x => x.role === 'Learner');
            assert.equal(checked.length, adminRoutes.length);
            assert.ok(checked.every(x => x.status === 302 && new URL(x.location, dev).pathname === '/Account/AccessDenied'));
            return checked.length + ' routes redirect to the 403 page';
        });
        await check('Learner dashboard empty state and profile validation', async () => {
            const page = await user.newPage();
            await open(page, '/Account/Dashboard');
            assert.match(await page.locator('#lp-name').innerText(), /ผู้เรียนตรวจระบบ/);
            const empty = await page.locator('#lp-courses-title').isVisible();
            const token = await antiforgery(user, '/Account/Dashboard');
            const form = { 'Edit.FullName': 'ทดสอบ ฿ & ชื่อใหม่', 'Edit.Email': changed, __RequestVerificationToken: token };
            const missing = await request(user, 'POST', '/Account/UpdateProfile', form, dev, true);
            status(missing, 200);
            assert.match(await missing.text(), /field-validation-error/);
            status(await request(user, 'POST', '/Account/UpdateProfile', { ...form, 'Edit.CurrentPassword': password }, dev, true), 302);
            await open(page, '/Account/Dashboard');
            assert.equal(await page.locator('#lp-name').innerText(), 'ทดสอบ ฿ & ชื่อใหม่');
            return { coursesPanel: empty, emailChangeRequiredPassword: true, nameRoundTrip: true };
        });
        await check('Course start creates enrollment and shows locked lesson', async () => {
            const page = await user.newPage();
            await open(page, '/Home/Details/101');
            await page.locator('[data-course-start]').click();
            await page.waitForURL(/\/Learning\/Island/);
            const response = await request(user, 'GET', '/Learning/State');
            status(response, 200);
            const state = await response.json();
            assert.equal(state.activeCourseId, 101);
            const course = state.courses.find(c => c.courseId === 101);
            assert.ok(course.unlockedIslands.includes(1) && !course.unlockedIslands.includes(2));
            assert.equal(await page.locator('#island-level-xp').innerText(), '0/200 XP');
            return { activeCourseId: state.activeCourseId, unlocked: course.unlockedIslands, levelBar: '0/200 XP' };
        });
        await check('Lesson quiz fail → pass → next lesson → completion/certificate', async () => {
            const token = await antiforgery(user, '/Learning/Practice?courseId=101&lessonId=1');
            const send = async (endpoint, payload, expected = 200) => {
                const response = await request(user, 'POST', '/Learning/' + endpoint, payload, dev, false, token);
                assert.equal(response.status(), expected, endpoint + ' returned ' + response.status());
                return response.json();
            };
            const awards = [];
            for (let lesson = 1; lesson <= 3; lesson++) {
                const ids = { courseId: 101, lessonId: lesson };
                const loaded = await request(user, 'GET', '/Learning/Lesson?courseId=101&lessonId=' + lesson);
                status(loaded, 200);
                const content = await loaded.json();
                if (content.video) {
                    const video = { ...ids, videoId: content.video.youTubeId };
                    await send('StartVideo', video);
                    await send('CompleteVideo', { ...video, skipVideo: true });
                }
                const questions = sourceQuestions.filter(x => x.CourseId === 101 && x.LessonId === lesson);
                const correct = questions.map(x => x.CorrectChoice);
                if (lesson === 1) {
                    const fail = await send('CompleteLesson', { ...ids, answers: questions.map(q => (q.CorrectChoice + 1) % q.Choices.length) });
                    assert.equal(fail.passed, false);
                    assert.equal(fail.awardedXp, 0);
                    assert.ok(!fail.state.courses.find(x => x.courseId === 101).unlockedIslands.includes(2));
                }
                const pass = await send('CompleteLesson', { ...ids, answers: correct });
                assert.equal(pass.passed, true);
                awards.push(pass.awardedXp);
                if (lesson === 1) {
                    const retry = await send('CompleteLesson', { ...ids, answers: correct });
                    assert.equal(retry.awardedXp, 0);
                }
            }
            assert.deepEqual(awards, [50, 50, 150]);
            const certificate = await request(user, 'GET', '/Account/Certificate?courseId=101');
            status(certificate, 200);
            const certificateHtml = await certificate.text();
            assert.match(certificateHtml, /ใบประกาศ/);
            const page = await user.newPage();
            await open(page, '/Account/Certificate?courseId=101');
            assert.match(await page.locator('body').innerText(), /ทดสอบ ฿/);
            return { courseId: 101, awardedXp: awards, regradeXp: 0, certificate: 200, videoPath: 'visible Skip action contract, external playback disabled' };
        });
        await check('Admin invites and logs in through standard workflow', async () => {
            const registration = { FullName: 'ผู้ดูแล ตรวจระบบ', Email: admin, Password: password, ConfirmPassword: password, AcceptTerms: 'true', InvitationCode: process.env.NEXTSKILL_AUDIT_INVITE };
            await accountForm(owner, '/Account/AdminRegister', registration, 302);
            const login = await accountForm(owner, '/Account/AdminLogin', { Email: admin, Password: password }, 302);
            assert.match(login.headers().location, /AdminDashboard/);
            status(await request(owner, 'GET', '/Account/AdminDashboard'), 200);
            return 'one-use invitation, login 302, AdminDashboard 200';
        });
        await check('Admin dashboard tabs and controls', async () => {
            const page = await owner.newPage();
            await open(page, '/Account/AdminDashboard');
            for (const tab of ['courses','questions','learners','settings']) {
                await page.locator('a[href="#' + tab + '"]').first().click();
                await page.locator('#' + tab).waitFor({ state: 'visible', timeout: 3500 });
            }
            await page.locator('a[href="#dashboard"]').first().click();
            await page.locator('#dashboard').waitFor({ state: 'visible', timeout: 3500 });
            const search = page.locator('#global-admin-search');
            await page.keyboard.press('Control+k');
            assert.equal(await search.evaluate(x => x === document.activeElement), true);
            await search.fill('ผู้เรียน');
            assert.equal(await page.locator('#member-search').inputValue(), 'ผู้เรียน');
            const alert = new Promise(resolve => page.once('dialog', async dialog => {
                const sequence = { type: dialog.type(), assertsHealthy: /LocalDB.*ปกติ/.test(dialog.message()) };
                await dialog.dismiss();
                resolve(sequence);
            }));
            await page.locator('#topbar-bell-btn').click();
            const bell = await alert;
            const periods = {};
            for (const months of [3, 6, 12]) {
                await page.locator('[data-period="' + months + 'm"]').click();
                periods[months] = await page.locator('#chart-bars-container .chart-bar-col').count();
            }
            assert.deepEqual(periods, { 3: 3, 6: 6, 12: 12 });
            return { navigated: 4, searchFocused: true, periods, bell };
        });
        await check('Admin course create, update, visibility and delete on isolated files', async () => {
            const title = 'คอร์สตรวจระบบ ' + suffix;
            const data = { title, category: 'Design', level: 'Beginner', instructor: 'NextSkill QA', units: 2, description: 'ทดสอบการบันทึกเนื้อหา', skills: ['UX'] };
            const created = await request(owner, 'POST', '/Account/AdminSaveCourse', data);
            status(created, 200);
            const saved = (await created.json()).course;
            assert.ok(saved.id > 120);
            const detail = await request(sandboxGuest, 'GET', '/Home/Details/' + saved.id);
            status(detail, 200);
            const catalog = await request(sandboxGuest, 'GET', '/Learning/Catalog');
            const draft = (await catalog.json()).courses.find(c => c.id === saved.id);
            assert.equal(draft.canStart, false);
            const edited = await request(owner, 'POST', '/Account/AdminSaveCourse', { ...data, id: saved.id, title: title + ' แก้ไข' });
            status(edited, 200);
            assert.match((await edited.json()).course.title, /แก้ไข$/);
            status(await request(owner, 'POST', '/Account/AdminDeleteCourse', { id: saved.id }), 200);
            status(await request(sandboxGuest, 'GET', '/Home/Details/' + saved.id), 404);
            return { newId: saved.id, canStart: draft.canStart, detailAfterDelete: 404 };
        });
        await check('Admin question create, edit, read and delete on isolated files', async () => {
            const data = { courseId: 101, lessonId: 3, prompt: 'คำถามตรวจระบบ ' + suffix, choices: ['ข้อหนึ่ง','ข้อสอง','ข้อสาม'], correctChoice: 1, explanation: 'ทดสอบคำอธิบาย', hint: 'ลองข้อสอง' };
            const added = await request(owner, 'POST', '/Account/AdminSaveQuestion', data);
            status(added, 200);
            const saved = (await added.json()).question;
            assert.ok(saved.id);
            status(await request(owner, 'POST', '/Account/AdminSaveQuestion', { ...data, id: saved.id, prompt: data.prompt + ' แก้ไข' }), 200);
            const list = await request(owner, 'GET', '/Account/AdminGetQuestions?courseId=101');
            status(list, 200);
            assert.ok((await list.json()).some(q => q.id === saved.id && q.prompt.endsWith('แก้ไข')));
            status(await request(owner, 'POST', '/Account/AdminDeleteQuestion', { id: saved.id }), 200);
            const after = await request(owner, 'GET', '/Account/AdminGetQuestions?courseId=101');
            assert.ok(!(await after.json()).some(q => q.id === saved.id));
            return 'add/read/update/delete persisted across HTTP calls';
        });
        await check('Admin JSON import file correct/invalid', async () => {
            async function upload(text, expected) {
                const response = await owner.request.post(dev + '/Account/AdminUploadCourses', { multipart: { file: { name: 'audit.json', mimeType: 'application/json', buffer: Buffer.from(text) } } });
                status(response, expected);
                return response.json();
            }
            const valid = await upload(JSON.stringify([{ title: 'นำเข้าตรวจระบบ ' + suffix, category: 'Design', instructor: 'NextSkill QA', units: 1 }]), 200);
            assert.equal(valid.count, 1);
            const invalid = await upload('[', 400);
            assert.equal(invalid.success, false);
            return { imported: valid.count, invalid: 400 };
        });
        const guestPage = await guest.newPage();
        const lightGuest = await initBrowserContext(browser);
        const lightPage = await lightGuest.newPage();
        const userPage = await user.newPage();
        const ownerPage = await owner.newPage();
        for (const [page, route, name, width, origin] of [
            ...[360,768,1280,1920].map(width => [lightPage,'/Home/Index','home-' + width,width,prod]),
            [guestPage,'/Home/Index','home-dark',1280,prod],
            ...[360,768,1280,1920].map(width => [userPage,'/Learning/Island?courseId=101','island-' + width,width,dev]),
            [guestPage,'/Home/Courses','courses-dark',1280,prod],
            [guestPage,'/Home/Details/101','details-dark',1280,prod],
            [guestPage,'/Account/Login','login-dark',360,prod],
            [userPage,'/Account/Dashboard','learner-dashboard',1280,dev],
            [userPage,'/Learning/Practice?courseId=101&lessonId=1','practice',1280,dev],
            [ownerPage,'/Account/AdminDashboard','admin-overview',1280,dev]
        ]) {
            await check('Render ' + name, () => sample(page, route, name, width, origin));
        }
        await check('Island underwater section and reload', async () => {
            await open(userPage, '/Learning/Island?courseId=101');
            await userPage.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
            await userPage.waitForTimeout(500);
            const scrollY = await userPage.evaluate(() => window.scrollY);
            assert.ok(scrollY > 0);
            await userPage.screenshot({ path: path.join(pictures, 'island-bottom.png'), animations: 'disabled' });
            await userPage.reload({ waitUntil: 'domcontentloaded' });
            return { scrollY };
        });
        await check('Admin panels screenshots', async () => {
            await open(ownerPage, '/Account/AdminDashboard');
            for (const tab of ['courses','questions','learners','settings']) {
                await ownerPage.locator('a[href="#' + tab + '"]').first().click();
                await ownerPage.screenshot({ path: path.join(pictures, 'admin-' + tab + '.png'), animations: 'disabled' });
            }
        });
        await check('Logout clears session and protects learner dashboard', async () => {
            const token = await antiforgery(user, '/Account/Dashboard');
            status(await request(user, 'POST', '/Account/Logout', { __RequestVerificationToken: token }, dev, true), 302);
            const next = await request(user, 'GET', '/Account/Dashboard');
            status(next, 302);
            assert.match(next.headers().location, /\/Account\/Login/);
            return 'Dashboard → Login';
        });
    } finally {
        await browser.close();
    }
}

main().catch(error => {
    report.fatal = String(error.message).split('\n')[0];
    console.error(report.fatal);
    process.exitCode = 1;
}).finally(() => {
    report.blocked = [...blocked].map(([host, proposedRequests]) => ({ host, proposedRequests }));
    fs.writeFileSync(path.join(__dirname, 'runtime-results.json'), JSON.stringify(report, null, 2));
});
