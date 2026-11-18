// Read-only check: visible waves while the camera rests, and distant hulls
// touching the rendered water plane at shore, open sea and the rising harbor.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const base = process.env.NEXTSKILL_TEST_URL || 'https://localhost:44389';
const output = path.resolve('artifacts/wave-contact-qa');
fs.mkdirSync(output,{recursive:true});
const state = p => p.evaluate(() => NextSkillHomeWaterTest.snapshot());
const samples = p => p.evaluate(() => NextSkillHomeWaterTest.surfacePixels(
    [.35,.55,.75,.92].flatMap(y => Array.from({length:15},(_,i) => [.04+i*.065,y]))));
const contact = p => p.evaluate(() => {
    const water = document.querySelector('.ow-sea').getBoundingClientRect();
    return [...document.querySelectorAll('.ocean-backdrop-boat-track')].map(track => {
        const hull = track.querySelector('.ocean-backdrop-boat'), line = track.querySelector('.ocean-backdrop-boat-contact');
        const keel = new DOMPoint(77,72).matrixTransform(hull.getScreenCTM());
        const meniscus = new DOMPoint(77,72).matrixTransform(line.getScreenCTM());
        return {gap:Math.abs(keel.y-meniscus.y),waterDepth:meniscus.y-water.top};
    });
});
(async () => {
    const browser = await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
    const report = [], errors = [];
    try {
        for (const [width,height] of [[1440,900],[390,844],[768,1024],[1024,768],[320,640],[720,450]]) {
            const context = await browser.newContext({viewport:{width,height}}), p = await context.newPage();
            p.on('pageerror',error => errors.push(error.message));
            await p.goto(base+'/Home',{waitUntil:'networkidle'});
            await p.waitForFunction(() => {
                const s = window.NextSkillHomeWaterTest?.snapshot();
                return s?.running && s.seconds>8 && s.wake.strength<.01 && s.wake.active===0;
            });
            const start = await state(p), before = await samples(p);
            const shorePoints = start.view.coasts.flatMap(([x,y,rx,ry]) => [[x,y+ry*.8],[x-rx*.4,y+ry*.7],[x+rx*.4,y+ry*.7]])
                .map(([x,y]) => [(x-start.view.projection.x)/start.view.projection.scaleX,(y-start.view.projection.y)/start.view.projection.scaleY])
                .filter(p => p.every(v=>v>.02&&v<.98));
            const shoreBefore = await p.evaluate(points => NextSkillHomeWaterTest.surfacePixels(points),shorePoints);
            await p.waitForFunction(at => NextSkillHomeWaterTest.snapshot().seconds>=at+1, start.seconds);
            const end = await state(p), after = await samples(p);
            const shoreAfter = await p.evaluate(points => NextSkillHomeWaterTest.surfacePixels(points),shorePoints);
            assert.deepEqual(shoreAfter,shoreBefore,'Contact water stays attached while open-water waves animate');
            assert.equal(end.view.cameraX,start.view.cameraX,'Visible wave motion does not depend on sailing');
            const changes = before.flatMap((pixel,i) => pixel.slice(0,3).map((value,c) => Math.abs(value-after[i][c])));
            const meanChange = changes.reduce((a,b) => a+b,0)/changes.length;
            const visibleChannels = changes.filter(value => value>5).length;
            assert.ok(meanChange>3 && visibleChannels>changes.length*.25,`Waves visibly travel within one second: mean ${meanChange.toFixed(2)}, channels ${visibleChannels}`);
            await p.evaluate(() => NextSkillMotion.setPaused(true));
            const frozen = await samples(p); await p.waitForTimeout(200); assert.deepEqual(await samples(p),frozen);
            for (const fraction of [0,.3,.92]) {
                await p.evaluate(fraction => {
                    const trigger = ScrollTrigger.getById('ocean-master');
                    scrollTo({top:trigger.start+(trigger.end-trigger.start)*fraction,behavior:'instant'});
                },fraction);
                await p.waitForTimeout(200);
                const boats = await contact(p);
                assert.equal(boats.length,7);
                assert.ok(boats.every(b => b.gap<.6),'Hull rocking never detaches the keel from its meniscus');
                assert.ok(boats.every(b => b.waterDepth>=28 && b.waterDepth<=32),'Every distant boat rests below the horizon blend: '+JSON.stringify(boats));
            }
            await p.screenshot({path:path.join(output,`harbor-${width}.png`)});
            assert.ok(await p.evaluate(() => document.documentElement.scrollWidth<=innerWidth+1));
            report.push({width,height,meanChange,visibleChannels,passed:true});
            console.log(`PASS visible idle waves, frozen pause and grounded background boats ${width}px (mean ${meanChange.toFixed(2)}, channels ${visibleChannels}/${changes.length})`);
            await context.close();
        }
        assert.deepEqual(errors,[]);
        fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({report,errors},null,2));
    } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
