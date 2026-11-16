// Verify the new ambient motion lifecycle without writing learning progress.
const assert = require('node:assert/strict');
const fs = require('node:fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('playwright-core')); }
const base = process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5205';
(async () => {
    const browser = await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    const checks = [], errors = [];
    page.on('pageerror',error => errors.push(error.message));
    const model = '.catalog-harbor .knowledge-sanctum';
    const snapshot = () => page.locator(model).evaluate(element => ({
        state:element.dataset.harborMotion,
        animations:element.getAnimations({subtree:true}).map(a => ({name:a.animationName,state:a.playState,time:a.currentTime})),
        waterfall:getComputedStyle(element.querySelector('.sanctum-waterfall-flow')).transform,
        shore:getComputedStyle(element.querySelector('.sanctum-shore-wash')).transform,
        impact:getComputedStyle(element.querySelector('.sanctum-impact-ring')).transform
    }));
    try {
        await page.goto(base+'/Home/Courses',{waitUntil:'networkidle'});
        assert.equal(await page.locator(model+' image[href$="learning-portal-island-v5.png"]').count(),1);
        assert.equal(await page.locator(model+' [data-live-waterfall]').count(),1);
        await page.waitForFunction(selector => document.querySelector(selector).dataset.harborMotion === 'active',model);
        const first = await snapshot(); await page.waitForTimeout(300); const later = await snapshot();
        assert.ok(first.animations.filter(a => a.state === 'running').length >= 10);
        assert.notEqual(first.waterfall,later.waterfall,'The waterfall must actually flow between frames');
        assert.notEqual(first.shore,later.shore,'The shoreline wash must move against the rocks');
        assert.notEqual(first.impact,later.impact,'The waterfall must create expanding impact rings');
        checks.push('Live falling curtain, impact rings and shoreline wash move while visible');
        const wildlife = await page.locator(model).evaluate(element => {
            const gull = element.querySelector('.sanctum-gull');
            const episodes = gull.getAnimations({subtree:true});
            for (const animation of episodes) {
                if (['sanctum-gull-visit','sanctum-gull-wings'].includes(animation.animationName)) animation.currentTime = 7200;
            }
            const perched = new DOMMatrix(getComputedStyle(gull).transform);
            const folded = Number(getComputedStyle(gull.querySelector('.sanctum-gull-wings')).opacity);
            const fish = element.querySelector('.sanctum-jumping-fish');
            fish.getAnimations()[0].currentTime = 1260;
            const jumping = new DOMMatrix(getComputedStyle(fish).transform);
            return {gullX:perched.e,gullY:perched.f,folded,fishY:jumping.f,fishOpacity:Number(getComputedStyle(fish).opacity)};
        });
        assert.ok(Math.abs(wildlife.gullX-108)<1 && Math.abs(wildlife.gullY-326)<1);
        assert.equal(wildlife.folded,0,'The gull folds its wings while perched on the ruined column');
        assert.ok(wildlife.fishY < -50 && wildlife.fishOpacity > .9,'The fish actually leaps out of the water');
        checks.push('Gull lands on the column and folds its wings; fish leaps and splashes beside the entrance');
        await page.locator('[data-catalog-motion]').click();
        const paused = await snapshot(); await page.waitForTimeout(200); const still = await snapshot();
        assert.ok(paused.animations.every(a => a.state === 'paused'));
        assert.equal(paused.waterfall,still.waterfall);
        assert.ok(paused.animations.every((a,i) => Math.abs(a.time-still.animations[i].time)<1));
        checks.push('Pause freezes all landmark animations in their current poses');
        await page.locator('[data-catalog-motion]').click();
        assert.equal((await snapshot()).state,'active');
        await page.evaluate(() => scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
        await page.waitForFunction(selector => document.querySelector(selector).dataset.harborMotion === 'paused',model);
        assert.ok((await snapshot()).animations.every(a => a.state === 'paused'));
        checks.push('The landmark stops animating when it leaves the viewport');
        await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
        await page.waitForFunction(selector => document.querySelector(selector).dataset.harborMotion === 'active',model);
        await page.emulateMedia({reducedMotion:'reduce'});
        assert.equal((await snapshot()).animations.length,0);
        assert.equal(await page.locator(model+' [data-dimension-portal]').count(),1);
        checks.push('Reduced motion retains the dimensional portal as a static illustration');
        assert.deepEqual(errors,[]);
        fs.mkdirSync('artifacts/sanctum-qa',{recursive:true});
        fs.writeFileSync('artifacts/sanctum-qa/motion-report.json',JSON.stringify({checks,errors},null,2));
        checks.forEach(check => console.log('PASS '+check));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
