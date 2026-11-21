// Read-only browser checks against a running Development instance.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5208';
const output = path.resolve('artifacts/home-arrival-qa');
fs.mkdirSync(output, { recursive:true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function verifyArrivalClearance(page) {
    const result = await page.evaluate(async () => {
        const motion = document.querySelector('.ow-arrival-motion');
        const buoy = document.querySelector('.ow-home-buoy').getBoundingClientRect();
        const water = document.querySelector('.ow-sea').getBoundingClientRect();
        const seat = motion.querySelector('.ow-boat-anchor');
        const agent = document.querySelector('#nextskill-agent');
        const animation = motion.getAnimations()[0];
        const time = animation.currentTime;
        const { duration } = animation.effect.getTiming();
        animation.pause();
        await animation.ready;
        let collision = false, visibleAboveWater = false;
        for (let i = 0; i < 100; i++) {
            animation.currentTime = duration * i / 100;
            const box = motion.getBoundingClientRect();
            // The canvas has transparent padding around the painted hull.
            const left = box.left + box.width * .18, right = box.left + box.width * .78;
            const keel = box.top + box.height * .85;
            if (left < buoy.right && right > buoy.left - buoy.width * .52) {
                collision ||= keel > buoy.top && box.top + box.height * .30 < buoy.bottom;
            }
            visibleAboveWater ||= right > 0 && keel < water.top + 14;
        }
        animation.currentTime = time;
        animation.play();
        return { collision, visibleAboveWater, seated: agent.parentElement === seat };
    });
    assert.deepEqual(result, { collision: false, visibleAboveWater: false, seated: true });
}
async function chooseCourse(page) {
    await page.locator('.ow-intro [data-catalog-voyage]:visible').click();
    await page.waitForURL('**/Home/Courses', { timeout:20000 });
    await page.waitForFunction(() => document.querySelector('#catalog-voyage')?.hidden);
    assert.equal(await page.locator('#nextskill-agent').count(), 1);
    assert.equal(await page.locator('.catalog-boat-nimo #nextskill-agent').count(), 1);
}

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const errors = [];
    try {
        for (const viewport of [{ width:1440, height:900 }, { width:1032, height:1376 }, { width:390, height:844 }]) {
            const page = await browser.newPage({ viewport, reducedMotion:'no-preference' });
            page.on('pageerror', error => errors.push(error.message));
            const response = await page.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
            assert.equal(response.status(), 200);
            await page.waitForFunction(() => document.querySelector('#ocean-journey')?.dataset.arrival === 'rowing');
            const start = await page.evaluate(() => ({
                anchor:document.querySelector('#nextskill-agent').dataset.context,
                voyage:document.querySelector('#ocean-journey').dataset.voyage,
                transform:getComputedStyle(document.querySelector('.ow-arrival-motion')).transform,
                count:document.querySelectorAll('#nextskill-agent').length
            }));
            assert.equal(start.anchor, 'arrival');
            assert.equal(start.voyage, 'rowing');
            assert.notEqual(start.transform, 'none');
            assert.equal(start.count, 1);
            await verifyArrivalClearance(page);
            const xBefore = await page.locator('.ow-arrival-motion').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41);
            await page.waitForFunction(x => new DOMMatrix(getComputedStyle(document.querySelector('.ow-arrival-motion')).transform).m41 > x + 4, xBefore);
            const xAfter = await page.locator('.ow-arrival-motion').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41);
            assert.ok(xBefore < 0 && xAfter > xBefore, 'The boat enters from the left');
            await page.screenshot({path:path.join(output, `rowing-${viewport.width}.png`)});
            await page.waitForFunction(() => document.querySelector('#ocean-journey')?.dataset.arrival === 'landing');
            await page.waitForFunction(() => document.querySelector('#nextskill-agent')?.dataset.context === 'in-flight');
            await sleep(300);
            await page.screenshot({path:path.join(output, `jump-${viewport.width}.png`)});
            await page.waitForFunction(() => !document.querySelector('#ocean-journey').dataset.arrival && document.querySelector('#nextskill-agent').dataset.context === 'shore', null, { timeout:9000 });
            assert.equal(await page.locator('#nextskill-agent').count(), 1);
            assert.equal(await page.locator('#ocean-journey').getAttribute('data-voyage'), 'shore');
            await page.screenshot({path:path.join(output, `shore-${viewport.width}.png`)});
            await page.locator('#buddy-agent-handle').click();
            assert.equal(await page.locator('#buddy-agent-menu').isVisible(), true, 'The landed mascot responds to interaction');
            await page.keyboard.press('Escape');
            await chooseCourse(page);
            console.log(`PASS entrance, landing and course voyage ${viewport.width}px`);
            await page.close();
        }
        const early = await browser.newPage({ viewport:{ width:1440,height:900 }, reducedMotion:'no-preference' });
        early.on('pageerror', error => errors.push(error.message));
        await early.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
        await early.waitForFunction(() => document.querySelector('#ocean-journey')?.dataset.arrival === 'rowing');
        await chooseCourse(early);
        assert.equal(await early.locator('#nextskill-agent').count(), 1);
        console.log('PASS immediate course selection during entrance');
        await early.close();

        const landing = await browser.newPage({ viewport:{ width:1440,height:900 }, reducedMotion:'no-preference' });
        landing.on('pageerror', error => errors.push(error.message));
        await landing.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
        await landing.waitForFunction(() => document.querySelector('#ocean-journey')?.dataset.arrival === 'landing');
        await chooseCourse(landing);
        assert.equal(await landing.locator('#nextskill-agent').count(), 1);
        console.log('PASS course selection during landing');
        await landing.close();

        const reduced = await browser.newPage({ viewport:{ width:390,height:844 }, reducedMotion:'reduce' });
        reduced.on('pageerror', error => errors.push(error.message));
        await reduced.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
        await reduced.waitForFunction(() => !!window.NextSkillVoyage);
        assert.equal(await reduced.locator('#nextskill-agent').getAttribute('data-context'), 'shore');
        assert.equal(await reduced.locator('#ocean-journey').getAttribute('data-arrival'), null);
        assert.equal(await reduced.locator('.ow-intro [data-catalog-voyage]:visible').count(), 1);
        console.log('PASS reduced motion');
        await reduced.close();

        const paused = await browser.newPage({ reducedMotion:'no-preference' });
        paused.on('pageerror', error => errors.push(error.message));
        await paused.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
        await paused.waitForFunction(() => document.querySelector('#ocean-journey')?.dataset.arrival === 'rowing');
        await paused.evaluate(() => window.NextSkillMotion.setPaused(true));
        await sleep(100);
        assert.equal(await paused.locator('#nextskill-agent').getAttribute('data-context'), 'shore');
        assert.equal(await paused.locator('#ocean-journey').getAttribute('data-arrival'), null);
        console.log('PASS pause during entrance');
        await paused.close();

        for (const interrupt of ['landing-pause','resize','reduced','dialog','hidden']) {
            const page = await browser.newPage({ viewport:{width:390,height:844}, reducedMotion:'no-preference' });
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(`${base}/Home/Index`, {waitUntil:'domcontentloaded'});
            await page.waitForFunction(() => document.querySelector('#ocean-journey')?.dataset.arrival === 'rowing');
            if (interrupt === 'landing-pause') {
                await page.waitForFunction(() => document.querySelector('#ocean-journey')?.dataset.arrival === 'landing');
                await page.evaluate(() => NextSkillMotion.setPaused(true));
            } else if (interrupt === 'resize') await page.setViewportSize({width:768,height:1024});
            else if (interrupt === 'reduced') await page.emulateMedia({reducedMotion:'reduce'});
            else if (interrupt === 'dialog') {
                await page.evaluate(() => document.querySelector('#journey-help-dialog').showModal());
                await page.evaluate(() => document.querySelector('#journey-help-dialog').close());
            } else await page.evaluate(() => {
                Object.defineProperty(document, 'hidden', {configurable:true, get:()=>true});
                document.dispatchEvent(new Event('visibilitychange'));
                Object.defineProperty(document, 'hidden', {configurable:true, get:()=>false});
                document.dispatchEvent(new Event('visibilitychange'));
            });
            await page.waitForFunction(() => !document.querySelector('#ocean-journey').dataset.arrival && document.querySelector('#nextskill-agent').dataset.context === 'shore');
            assert.equal(await page.locator('.ow-jump-anchor #nextskill-agent').count(), 0);
            assert.equal(await page.locator('#nextskill-agent').count(), 1);
            assert.equal(await page.locator('html').evaluate(el => el.classList.contains('ow-arrival-pending')), false);
            console.log(`PASS interruption settles safely on shore: ${interrupt}`);
            await page.close();
        }
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
