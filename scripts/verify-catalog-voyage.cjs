// Read-only MVC journey checks. Fault injection aborts one catalog GET, never a progress request.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('playwright-core')); }
const base = process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5205';
const output = path.resolve('artifacts/catalog-voyage-qa');
fs.mkdirSync(output, { recursive: true });
const checks = [], errors = [];
let browser, page;
async function check(name, operation) {
    try { await operation(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
    catch (error) {
        checks.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`);
        await page.screenshot({ path: path.join(output, `failure-${checks.length}.png`) }).catch(() => {});
    }
}
async function open(route) {
    const response = await page.goto(base + route, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200); await page.evaluate(() => document.fonts.ready);
}
async function settled() {
    await page.waitForFunction(() => document.querySelector('#catalog-voyage')?.hidden && !document.documentElement.classList.contains('cv-arrival-pending'));
}
async function screenshot(name) { await page.screenshot({ path: path.join(output, name + '.png') }); }
const nav = () => page.locator('.ns-navbar__link[href="/Home/Courses"]');
(async () => {
    browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await check('Home starts at the island; the original long sea voyage reaches the distant harbor before clouds', async () => {
        await open('/Home/Index');
        assert.equal(await page.locator('#nextskill-agent').count(), 1);
        assert.equal(await page.locator('.ow-boat-anchor #nextskill-agent').count(), 1);
        const harbor = await page.locator('.ow-harbor').boundingBox();
        assert.ok(harbor.x >= 1440 * 2.2, 'The harbor keeps its original 226vw longitude');
        await screenshot('home-1440');
        let navigations = 0;
        const count = request => { if (request.isNavigationRequest() && new URL(request.url()).pathname === '/Home/Courses') navigations++; };
        page.on('request', count);
        await page.locator('[data-catalog-voyage]').click();
        // Dispatch a second activation even though the background is inert.
        await page.locator('[data-catalog-voyage]').dispatchEvent('click', { button: 0 });
        assert.equal(new URL(page.url()).pathname, '/Home/Index');
        await page.waitForTimeout(1600); await screenshot('departure-open-sea');
        assert.equal(new URL(page.url()).pathname, '/Home/Index');
        assert.equal(await page.locator('#catalog-voyage').evaluate(el => el.hidden), true, 'No clouds during open-sea travel');
        await page.locator('#catalog-voyage').waitFor({ state: 'visible' });
        await screenshot('departure-at-harbor');
        // Sea travel is owned by the local camera transform. The separate depth
        // plane deliberately adds a small zoom only after that travel finishes.
        const position = await page.evaluate(() => ({ camera: new DOMMatrix(getComputedStyle(document.querySelector('.ow-camera')).transform).m41, width: innerWidth }));
        assert.ok(Math.abs(position.camera + position.width * 2.2) < 2, 'Full original 220vw camera travel');
        const canal = await page.evaluate(() => {
            const model = document.querySelector('.ow-dock [data-harbor-kind="knowledge-sanctum"]');
            const gate = model.getBoundingClientRect(), boat = document.querySelector('.ow-vessel').getBoundingClientRect();
            const image = model.querySelector('.sanctum-art');
            return { center: gate.left + gate.width * Number(model.dataset.portalX), boat: boat.left + boat.width * .5, ready: image?.tagName.toLowerCase() === 'svg' && image.querySelector('image')?.getAttribute('href').includes('learning-portal-island-v5.png') };
        });
        assert.equal(canal.ready, true, 'The library artwork loaded');
        assert.ok(canal.center > 1440 * .4 && canal.center < 1440 * .65, 'The island entrance remains in the central viewing area');
        assert.ok(Math.abs(canal.center - canal.boat) < 3, 'The boat approaches the center of the open canal');
        await page.waitForFunction(() => {
            const art=document.querySelector('.ow-dock .harbor-model'), gate=art.getBoundingClientRect();
            const vessel=document.querySelector('.ow-arrival-motion'), boat=vessel.getBoundingClientRect();
            return boat.top+boat.height*.85 < gate.top+gate.height*Number(art.dataset.portalEntryY)-8 && Number(getComputedStyle(vessel).opacity)>.99 && !document.querySelector('#catalog-voyage').classList.contains('cv-is-covered');
        });
        assert.notEqual(await page.locator('.ow-vessel').evaluate(el => getComputedStyle(el).clipPath),'none','The cave rim occludes the boat inside the opening');
        await screenshot('departure-inside-cave');
        await page.waitForFunction(() => document.querySelector('#catalog-voyage').classList.contains('cv-is-covered'));
        await page.waitForTimeout(100); await screenshot('departure-clouds');
        await page.waitForURL('**/Home/Courses');
        await screenshot('arrival-clouds'); await settled();
        assert.equal(navigations, 1); page.off('request', count);
        assert.equal(await page.locator('.catalog-boat-nimo #nextskill-agent').count(), 1);
        assert.equal(await page.locator('.catalog-harbor [data-door-state="open"]').count(), 1);
        assert.equal(await page.locator('#catalog-title').evaluate(el => document.activeElement === el), true);
        const boxes = await page.evaluate(() => ({ gate: document.querySelector('.catalog-harbor').getBoundingClientRect().left, title: document.querySelector('#catalog-title').getBoundingClientRect().left }));
        assert.ok(boxes.gate < boxes.title); await screenshot('catalog-1440');
    });
    await check('Back restores Home without stale clouds or inert controls', async () => {
        await page.goBack({ waitUntil: 'networkidle' }); await settled();
        assert.equal(await page.locator('[data-catalog-voyage]').evaluate(el => !!el.closest('[inert]')), false);
        assert.equal(await page.evaluate(() => sessionStorage.getItem('nextskill.catalog-voyage.v1')), null);
    });
    await check('Manual scroll crosses open sea before automatically entering the harbor', async () => {
        await open('/Home/Index');
        await page.mouse.move(720, 450);
        await page.mouse.wheel(0, 1050); await page.waitForTimeout(800);
        assert.equal(new URL(page.url()).pathname, '/Home/Index');
        assert.equal(await page.locator('#catalog-voyage').evaluate(el => el.hidden), true);
        await screenshot('manual-scroll-open-sea');
        await page.mouse.wheel(0, 3000);
        await page.locator('#catalog-voyage').waitFor({ state: 'visible' });
        await page.locator('.cv-skip').click(); await page.waitForURL('**/Home/Courses'); await settled();
        await open('/Home/Index');
    });
    await check('Navbar and keyboard Enter use the journey; skip bypasses the remaining motion', async () => {
        await nav().focus(); await page.keyboard.press('Enter');
        await page.locator('.cv-skip').click(); await page.waitForURL('**/Home/Courses'); await settled();
        assert.equal(await page.locator('.ns-course-card').count(), 7);
    });
    await check('Search, category, sorting, empty results, pagination and details retain real GET behavior', async () => {
        await page.locator('#course-query').fill('CSS'); await page.locator('#course-sort').selectOption('A-Z');
        await Promise.all([page.waitForURL('**/Home/Courses?**'), page.locator('.catalog-search-submit').click()]);
        assert.equal(await page.locator('.ns-course-card').count(), 1);
        assert.match(await page.locator('.ns-course-card h3').innerText(), /CSS/);
        await Promise.all([page.waitForURL('**tag=Design**'), page.locator('.ns-course-tags a').filter({ hasText: 'ออกแบบ' }).click()]);
        assert.equal(new URL(page.url()).searchParams.get('q'), 'CSS');
        assert.equal(new URL(page.url()).searchParams.get('sort'), 'A-Z');
        assert.equal(await page.locator('#catalog-voyage').evaluate(el => el.hidden), true);
        await page.locator('#course-query').fill('zz-no-such-course');
        await Promise.all([page.waitForURL('**q=zz-no-such-course**'), page.locator('#course-query').press('Enter')]);
        assert.equal(await page.locator('.ns-course-empty').count(), 1);
        await open('/Home/Courses?pageSize=3&sort=Recently');
        await Promise.all([page.waitForURL('**page=2**'), page.locator('.ns-course-pagination a').filter({ hasText: /^2$/ }).click()]);
        assert.equal(new URL(page.url()).searchParams.get('sort'), 'Recently');
        assert.equal(new URL(page.url()).searchParams.get('pageSize'), '3');
        await Promise.all([page.waitForURL('**/Home/Details/**'), page.locator('.catalog-course-link').first().click()]);
        assert.equal(await page.locator('#catalog-voyage').count(), 0);
        await page.goBack({ waitUntil: 'networkidle' }); assert.equal(new URL(page.url()).searchParams.get('page'), '2');
    });
    await check('Failed catalog load offers retry and Escape restores visible keyboard focus at the harbor', async () => {
        await open('/Home/Index');
        let aborted = false;
        await page.route('**/Home/Courses', async route => {
            if (!aborted && route.request().resourceType() === 'fetch') { aborted = true; return route.abort(); }
            return route.continue();
        });
        await page.locator('[data-catalog-voyage]').click(); await page.locator('.cv-skip').click();
        await page.locator('.cv-recovery').waitFor({ state: 'visible' });
        assert.equal(aborted, true); assert.equal(new URL(page.url()).pathname, '/Home/Index');
        await screenshot('load-error'); await page.keyboard.press('Escape'); await settled();
        assert.equal(await nav().evaluate(el => document.activeElement === el), true);
        aborted = false;
        await nav().click(); await page.locator('.cv-skip').click();
        await page.locator('.cv-recovery').waitFor({ state: 'visible' });
        await page.locator('[data-cv-retry]').click(); await page.waitForURL('**/Home/Courses'); await settled();
        await page.unroute('**/Home/Courses');
    });
    await check('Reduced motion uses a short fade; no sailing or boat entrance transforms', async () => {
        await page.emulateMedia({ reducedMotion: 'reduce' }); await open('/Home/Index');
        await page.locator('[data-catalog-voyage]').click(); await page.waitForURL('**/Home/Courses'); await settled();
        assert.equal(await page.locator('.catalog-boat').evaluate(el => el.getAnimations().length), 0);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
    });
    await check('Desktop, tablet and narrow mobile layouts keep scenes and controls within the page', async () => {
        for (const width of [320, 390, 768, 1024, 1440]) {
            await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
            for (const route of ['/Home/Index', '/Home/Courses']) {
                await open(route);
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} ${route}: overflow`);
                if (route.endsWith('Index')) {
                    const gate = await page.locator('.ow-harbor').boundingBox();
                    assert.ok(gate.x >= width * 2.2, `${width}: harbor is outside the initial viewport`);
                }
                const control = page.locator(route.endsWith('Index') ? '[data-catalog-voyage]' : '#course-query');
                const box = await control.boundingBox(); assert.ok(box.width > 44 && box.x >= 0 && box.x + box.width <= width + 1);
                await screenshot(`${route.endsWith('Index') ? 'home' : 'catalog'}-${width}`);
            }
        }
    });
    await check('Dark theme and pause preferences survive the voyage', async () => {
        await open('/Home/Index'); await page.locator('[data-theme-toggle]').click();
        await page.evaluate(() => window.NextSkillMotion.setPaused(true));
        await nav().click(); await page.waitForURL('**/Home/Courses'); await settled();
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
        assert.equal(await page.locator('[data-catalog-motion]').getAttribute('aria-pressed'), 'true');
        await screenshot('catalog-dark-paused');
        await page.evaluate(() => window.NextSkillMotion.setPaused(false));
    });
    await check('No browser JavaScript errors', async () => assert.deepEqual(errors, []));
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ checks, errors }, null, 2));
    await browser.close(); process.exitCode = checks.some(check => !check.passed) ? 1 : 0;
})().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1; });
