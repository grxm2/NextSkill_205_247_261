// Read-only checks for decorative scenery on a running Development instance.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5383';
const output = path.resolve(process.env.NEXTSKILL_TEST_OUTPUT || 'artifacts/ocean-backdrop');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    fs.mkdirSync(output, { recursive:true });
    const browser = await chromium.launch({ headless:true, executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const errors = [];
    try {
        for (const width of [390, 1440]) {
            const page = await browser.newPage({ viewport:{ width, height:width === 390 ? 844 : 900 }, reducedMotion:'no-preference' });
            page.on('pageerror', error => errors.push(error.message));
            const response = await page.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
            assert.equal(response.status(), 200);
            await page.waitForFunction(() => !!window.NextSkillMotion && !document.querySelector('.ow-scene').classList.contains('ow-motion-paused'));
            await page.waitForFunction(() => document.querySelector('.ocean-backdrop').getAnimations({ subtree:true }).filter(a => a.playState === 'running').length === 5);
            const state = await page.evaluate(() => {
                const scene = document.querySelector('.ocean-backdrop');
                return {
                    hidden:scene.getAttribute('aria-hidden'),
                    running:scene.getAnimations({ subtree:true }).filter(a => a.playState === 'running').length,
                    width:document.documentElement.scrollWidth,
                    viewport:innerWidth
                };
            });
            assert.equal(state.hidden, 'true');
            assert.equal(state.running, 5);
            assert.ok(state.width <= state.viewport + 1);
            await page.evaluate(() => window.NextSkillMotion.setPaused(true));
            await delay(150);
            assert.equal(await page.evaluate(() => document.querySelector('.ocean-backdrop').getAnimations({ subtree:true }).filter(a => a.playState === 'running').length), 0);
            await page.evaluate(() => window.NextSkillMotion.setPaused(false));
            await page.waitForFunction(() => document.querySelector('.ocean-backdrop').getAnimations({ subtree:true }).filter(a => a.playState === 'running').length === 5);
            // Capture a deterministic surfaced whale for visual inspection only.
            await page.evaluate(() => document.querySelectorAll('.ocean-backdrop-whale,.ocean-backdrop-spout').forEach(el => {
                const animation=el.getAnimations()[0]; animation.pause(); animation.currentTime=5700;
            }));
            await page.screenshot({ path:path.join(output, `home-${width}.png`) });
            assert.equal(await page.locator('.ow-intro [data-ocean-go]').isVisible(), true);
            const before = await page.evaluate(() => {
                const camera=document.querySelector('.ow-camera');
                const x=el=>el.getBoundingClientRect().left;
                return { camera:x(camera), backdrop:x(document.querySelector('.ocean-backdrop')), water:x(document.querySelector('.ocean-life')), island:x(document.querySelector('.ow-start-land')) };
            });
            await page.evaluate(() => {
                window.ScrollTrigger.refresh();
                const trigger=window.ScrollTrigger.getById('ocean-master');
                window.scrollTo({top:trigger.start+(trigger.end-trigger.start)*.18,behavior:'instant'});
            });
            await page.waitForFunction(initial => Math.abs(document.querySelector('.ow-camera').getBoundingClientRect().left-initial)>20, before.camera, {timeout:5000});
            const after = await page.evaluate(() => {
                const camera=document.querySelector('.ow-camera');
                const x=el=>el.getBoundingClientRect().left;
                return { camera:x(camera), backdrop:x(document.querySelector('.ocean-backdrop')), water:x(document.querySelector('.ocean-life')), island:x(document.querySelector('.ow-start-land')) };
            });
            assert.ok(Math.abs(after.camera-before.camera)>20, 'Camera did not move');
            for (const key of ['backdrop','water','island']) {
                assert.ok(Math.abs((after[key]-before[key])-(after.camera-before.camera))<1, `${key} detached from the island as the camera moved`);
            }
            console.log(`PASS backdrop, pause/resume and layout ${width}px`);
            await page.close();
        }
        const page = await browser.newPage({ reducedMotion:'reduce' });
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
        assert.equal(await page.evaluate(() => document.querySelector('.ocean-backdrop').getAnimations({ subtree:true }).length), 0);
        assert.equal(await page.locator('.ocean-backdrop-whale-water').isVisible(), false);
        assert.equal(await page.locator('.ow-intro [data-ocean-go]').isVisible(), true);
        console.log('PASS reduced motion');
        await page.close();
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
