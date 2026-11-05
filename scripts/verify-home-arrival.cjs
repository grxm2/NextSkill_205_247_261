// Read-only browser checks against a running Development instance.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5377';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const errors = [];
    try {
        for (const viewport of [{ width:1440, height:900 }, { width:390, height:844 }]) {
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
            await page.waitForFunction(() => !document.querySelector('#ocean-journey').dataset.arrival && document.querySelector('#nextskill-agent').dataset.context === 'shore', null, { timeout:9000 });
            assert.equal(await page.locator('#nextskill-agent').count(), 1);
            await page.locator('.ow-intro [data-ocean-go]').click();
            await page.waitForFunction(() => ['arrival','in-flight'].includes(document.querySelector('#nextskill-agent').dataset.context));
            await page.waitForFunction(() => document.querySelector('#ocean-journey').dataset.stage === '2', null, { timeout:10000 });
            console.log(`PASS entrance, landing and course voyage ${viewport.width}px`);
            await page.close();
        }
        const early = await browser.newPage({ viewport:{ width:1440,height:900 }, reducedMotion:'no-preference' });
        early.on('pageerror', error => errors.push(error.message));
        await early.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
        await early.waitForFunction(() => document.querySelector('#ocean-journey')?.dataset.arrival === 'rowing');
        await early.locator('.ow-intro [data-ocean-go]').click();
        await early.waitForFunction(() => document.querySelector('#ocean-journey').dataset.stage === '2', null, { timeout:10000 });
        assert.equal(await early.locator('#nextskill-agent').count(), 1);
        console.log('PASS immediate course selection during entrance');
        await early.close();

        const landing = await browser.newPage({ viewport:{ width:1440,height:900 }, reducedMotion:'no-preference' });
        landing.on('pageerror', error => errors.push(error.message));
        await landing.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
        await landing.waitForFunction(() => document.querySelector('#ocean-journey')?.dataset.arrival === 'landing');
        await landing.locator('.ow-intro [data-ocean-go]').click();
        await landing.waitForFunction(() => document.querySelector('#ocean-journey').dataset.stage === '2', null, { timeout:10000 });
        assert.equal(await landing.locator('#nextskill-agent').count(), 1);
        console.log('PASS course selection during landing');
        await landing.close();

        const reduced = await browser.newPage({ viewport:{ width:390,height:844 }, reducedMotion:'reduce' });
        reduced.on('pageerror', error => errors.push(error.message));
        await reduced.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
        await reduced.waitForFunction(() => !!window.NextSkillVoyage);
        assert.equal(await reduced.locator('#nextskill-agent').getAttribute('data-context'), 'shore');
        assert.equal(await reduced.locator('#ocean-journey').getAttribute('data-arrival'), null);
        assert.equal(await reduced.locator('.ow-intro [data-ocean-go]').isVisible(), true);
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
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
