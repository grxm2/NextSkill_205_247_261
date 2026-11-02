/* Current MVC journey QA. Real isolated Development guest SQL state; one explicit network-abort fault injection. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = (process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5299').replace(/\/$/, '');
const output = path.resolve(process.env.NEXTSKILL_TEST_OUTPUT || 'artifacts/ux-qa');
fs.mkdirSync(output, { recursive:true });
const report = { base, startedAt:new Date().toISOString(), checks:[], pageErrors:[], faultInjection:'Abort one CompleteLesson request before sending it to the server; no API response mocks.', screenshots:[] };
let browser;
let page;
let captureIndex = 0;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function capture(name) {
    if (!page || page.isClosed()) return;
    const filename = `${String(++captureIndex).padStart(2,'0')}-${name}.png`;
    await page.screenshot({ path:path.join(output,filename), fullPage:false, animations:'disabled' });
    report.screenshots.push(filename);
}
async function check(name, operation) {
    try {
        const detail = await operation();
        report.checks.push({ name, passed:true, ...(detail === undefined ? {} : { detail }) });
        console.log(`PASS ${name}`);
    } catch (error) {
        report.checks.push({ name, passed:false, error:error.stack || String(error) });
        await capture(`failure-${name.replace(/[^a-z0-9]+/gi,'-')}`).catch(() => {});
        console.error(`FAIL ${name}: ${error.message}`);
    }
}
async function open(route) {
    const response = await page.goto(`${base}${route}`, { waitUntil:'domcontentloaded' });
    assert.equal(response.status(), 200, route);
    await page.locator('body').waitFor();
    await page.evaluate(() => document.fonts.ready);
    return response;
}
async function api(endpoint, data) {
    return page.evaluate(async ({ endpoint, data }) => {
        const token = document.querySelector('#smart-antiforgery input')?.value;
        const response = await fetch(`/Learning/${endpoint}`, {
            method:data === undefined ? 'GET' : 'POST', credentials:'same-origin',
            headers:data === undefined ? { Accept:'application/json' } : { Accept:'application/json', 'Content-Type':'application/json', 'X-CSRF-TOKEN':token },
            ...(data === undefined ? {} : { body:JSON.stringify(data) })
        });
        const text = await response.text();
        let body; try { body = JSON.parse(text); } catch { body = text; }
        return { status:response.status, body };
    }, { endpoint, data });
}
async function state() {
    const response = await api('State');
    assert.equal(response.status, 200, `Real guest SQL State: ${JSON.stringify(response.body)}`);
    return response.body;
}
async function openFirstLesson() {
    await page.locator('#resume-learning').click();
    await page.locator('#lesson-content').waitFor({ state:'visible' });
    await page.locator('#lesson-step-next').waitFor({ state:'visible' });
}
async function answerSteps(answers, verifyBack = false) {
    const questions = page.locator('#lesson-questions fieldset');
    await questions.first().waitFor({ state:'attached' });
    assert.equal(await questions.count(), answers.length);
    if (await page.locator('#lesson-reading').isVisible()) await page.locator('#lesson-step-next').click();
    for (let index = 0; index < answers.length; index++) {
        const field = questions.nth(index);
        await field.waitFor({ state:'visible' });
        await field.locator(`input[value="${answers[index]}"]`).check();
        if (await page.locator('#lesson-step-next').isVisible()) {
            await page.locator('#lesson-step-next').click();
            if (verifyBack && index === 0) {
                await page.locator('#lesson-step-back').click();
                await field.waitFor({ state:'visible' });
                assert.equal(await field.locator(`input[value="${answers[index]}"]`).isChecked(), true, 'Previous preserves selected answer');
                await page.locator('#lesson-step-next').click();
            }
        }
    }
    await page.locator('#submit-lesson').waitFor({ state:'visible' });
}
async function waitResult() { await page.locator('#lesson-result').waitFor({ state:'visible' }); }
async function newPage(context) {
    page = await context.newPage();
    page.on('pageerror', error => report.pageErrors.push({ url:page.url(), message:error.message }));
    page.setDefaultTimeout(12000);
}

(async () => {
    browser = await chromium.launch({ headless:true, executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const publicContext = await browser.newContext({ viewport:{ width:1440,height:1000 } });
    await newPage(publicContext);
    await check('public MVC catalog and details', async () => {
        await open('/Home/Courses');
        assert.equal(await page.locator('.mark-complete').count(), 0);
        await capture('courses-1440');
        await open('/Home/Details/13');
        assert.equal(await page.locator('.mark-complete').count(), 0);
        await capture('details-1440');
    });
    await check('home chooser opens without scenic delay', async () => {
        await open('/Home/Index');
        const trigger = page.locator('.sj-nav [data-smart-action="choose-course"]').first();
        await trigger.waitFor({ state:'visible' });
        const start = performance.now();
        await trigger.click();
        await page.locator('#course-harbor-dialog').waitFor({ state:'visible' });
        const elapsedMs = Math.round(performance.now() - start);
        assert.ok(elapsedMs < 1500, `Chooser took ${elapsedMs}ms`);
        await capture('course-picker');
        await page.keyboard.press('Escape');
        return { elapsedMs, limitMs:1500 };
    });
    for (const width of [360,390,768,1440]) {
        await check(`responsive widths ${width}`, async () => {
            await page.setViewportSize({ width,height:900 });
            const routes = ['/Home/Index','/Home/Courses','/Home/Details/13','/Account/Login','/Account/Register'];
            const measured = [];
            for (const route of routes) {
                await open(route);
                await pause(150);
                const dimensions = await page.evaluate(() => ({ viewport:innerWidth, scroll:document.documentElement.scrollWidth }));
                measured.push({ route,...dimensions });
                assert.ok(dimensions.scroll <= dimensions.viewport + 1, `${route} overflow ${dimensions.scroll}/${dimensions.viewport}`);
                if (route === '/Home/Index') await capture(`home-${width}`);
            }
            return measured;
        });
    }
    await check('fish lifecycle safe geometry and pause', async () => {
        await page.setViewportSize({ width:1440,height:1000 });
        await open('/Home/Index');
        await page.waitForFunction(() => !!window.NextSkillOceanLifeTest);
        await page.waitForFunction(() => window.NextSkillOceanLifeTest.snapshot().allowed && window.NextSkillOceanLifeTest.snapshot().stable);
        const forced = await page.evaluate(() => window.NextSkillOceanLifeTest.force(7));
        assert.equal(forced.started, true, `No safe desktop zone: ${JSON.stringify(forced)}`);
        const snapshot = await page.evaluate(() => window.NextSkillOceanLifeTest.snapshot());
        assert.equal(snapshot.entityCount, 3);
        assert.equal(snapshot.timerCount, 0);
        assert.ok(snapshot.animationCount <= 1);
        assert.ok(snapshot.lastSpawn.exclusions.every(box => {
            const arc = snapshot.lastSpawn.footprint;
            return !(arc.left < box.right && arc.right > box.left && arc.top < box.bottom && arc.bottom > box.top);
        }), 'Fish arc intersects expanded control/text exclusion');
        await capture('fish-in-flight');
        await page.evaluate(() => window.NextSkillMotion.setPaused(true));
        let stopped = await page.evaluate(() => window.NextSkillOceanLifeTest.snapshot());
        assert.equal(stopped.active, false); assert.equal(stopped.timerCount, 0);
        assert.equal(await page.evaluate(() => window.NextSkillOceanLifeTest.force(7).started), false);
        await page.evaluate(() => window.NextSkillMotion.setPaused(false));
        await pause(350);
        await page.evaluate(() => window.NextSkillOceanLifeTest.force(7));
        await page.locator('.sj-nav [data-smart-action="choose-course"]').first().click();
        stopped = await page.evaluate(() => window.NextSkillOceanLifeTest.snapshot());
        assert.equal(stopped.active, false); assert.equal(stopped.timerCount, 0);
        await page.keyboard.press('Escape');
        await page.emulateMedia({ reducedMotion:'reduce' });
        assert.equal(await page.evaluate(() => window.NextSkillOceanLifeTest.force(7).started), false);
        await page.emulateMedia({ reducedMotion:'no-preference' });
        return { footprint:snapshot.lastSpawn.footprint, exclusions:snapshot.lastSpawn.exclusions.length };
    });
    await publicContext.close();

    // A new incognito context creates an isolated signed guest-preview cookie, never a real account.
    const guest = await browser.newContext({ viewport:{ width:1440,height:1000 } });
    await newPage(guest);
    await open('/Home/Index');
    let ready = false;
    await check('real Development guest SQL setup', async () => {
        assert.equal(await page.locator('body').getAttribute('data-guest-preview'), 'true', 'Run QA against Development with isolated guest preview enabled');
        const response = await api('SelectCourse', { courseId:13 });
        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.deepEqual(response.body.courses.find(course => course.courseId === 13).completedLessons, []);
        await open('/Learning/Island?courseId=13');
        await page.locator('#resume-learning').waitFor({ state:'visible' });
        ready = true;
        await capture('islands-first-guest');
    });
    if (ready) {
        await check('staged wrong-answer feedback and correction', async () => {
            await openFirstLesson();
            await answerSteps([0,0,0], true);
            await page.locator('#submit-lesson').click();
            await waitResult();
            assert.equal(await page.locator('#lesson-result').getAttribute('data-passed'), 'false');
            assert.equal((await state()).xp, 0);
            await capture('lesson-retry');
            await page.locator('#edit-lesson-answers').click();
            await answerSteps([1,0,2]);
            await page.locator('#submit-lesson').click();
            await waitResult();
            assert.equal(await page.locator('#lesson-result').getAttribute('data-passed'), 'true');
            const saved = await state();
            assert.equal(saved.xp, 50);
            assert.deepEqual(saved.courses.find(course => course.courseId === 13).completedLessons, [1]);
            assert.doesNotMatch(await page.locator('#lesson-reward').innerText(), /บันทึกกับบัญชี/);
            await capture('lesson-first-success');
            await page.locator('#finish-learning').click();
        });
        await check('retake grants no duplicate XP', async () => {
            await open('/Learning/Island?courseId=13&lessonId=1');
            await page.locator('#lesson-content').waitFor({ state:'visible' });
            await answerSteps([1,0,2]);
            await page.locator('#submit-lesson').click();
            await waitResult();
            assert.match(await page.locator('#lesson-result-title').innerText(), /ทบทวน/);
            assert.equal((await state()).xp, 50);
            await page.locator('#finish-learning').click();
        });
        await check('submission abort recovers with preserved answers and no duplicate award', async () => {
            await open('/Learning/Island?courseId=13&lessonId=1');
            await page.locator('#lesson-content').waitFor({ state:'visible' });
            await answerSteps([1,0,2]);
            let intercepted = 0;
            await page.route('**/Learning/CompleteLesson', async route => {
                intercepted++;
                await route.abort('failed');
            }, { times: 1 });
            await page.locator('#submit-lesson').click();
            await page.locator('#submission-recovery').waitFor({ state:'visible' });
            assert.equal(intercepted, 1);
            assert.equal(await page.locator('#close-lesson').isEnabled(), true);
            await capture('submission-recovery');
            await page.locator('#check-save-status').click();
            // State can confirm cumulative completion, not reconstruct the missing attempt score.
            assert.equal((await state()).xp, 50);
            if (await page.locator('#retry-submission').isVisible()) {
                await page.locator('#retry-submission').click();
                await waitResult();
                assert.equal((await state()).xp, 50);
            }
            await page.locator('#close-lesson').click();
            if (await page.locator('#leave-lesson-dialog').isVisible()) await page.locator('[data-confirm-leave]').click();
            await page.locator('#lesson-dialog').waitFor({ state:'hidden' });
            return { intercepted, xpAfterRecovery:(await state()).xp };
        });
    }
    await guest.close();
    assert.equal(report.pageErrors.length, 0, `Browser errors: ${JSON.stringify(report.pageErrors)}`);
})().catch(error => {
    report.fatal = error.stack || String(error);
    console.error(error);
}).finally(async () => {
    await browser?.close();
    report.finishedAt = new Date().toISOString();
    report.passed = !report.fatal && report.pageErrors.length === 0 && report.checks.every(check => check.passed);
    fs.writeFileSync(path.join(output,'report.json'), JSON.stringify(report,null,2));
    console.log(JSON.stringify({ passed:report.passed, checks:report.checks.length, failures:report.checks.filter(check => !check.passed).map(check => check.name), report:path.join(output,'report.json') }));
    if (!report.passed) process.exitCode = 1;
});
