// Read-only scenery regression: follow the same material through real camera
// travel, with the ambient clock paused so screen-locked water cannot pass.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const base = process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5208';
const output = path.resolve('artifacts/world-water-qa');
fs.mkdirSync(output, {recursive:true});
const state = page => page.evaluate(() => NextSkillHomeWaterTest.snapshot());
const pixels = (page, points) => page.evaluate(points => NextSkillHomeWaterTest.surfacePixels(points), points);
const objectPoints = (page, selector) => page.evaluate(selector => {
    const art = document.querySelector(selector), box = document.querySelector('.ow-water-detail').getBoundingClientRect();
    const view = art.viewBox.baseVal;
    return [.9,1.1,1.3,1.5].flatMap(y => [-.3,-.1,.1,.3,.5,.7,.9,1.1,1.3].map(x => {
        const p = new DOMPoint(x*view.width,y*view.height).matrixTransform(art.getScreenCTM());
        return [(p.x-box.left)/box.width,(p.y-box.top)/box.height];
    }));
},selector);
const difference = (a,b) => a.reduce((sum,pixel,i) => sum + pixel.slice(0,3).reduce((s,v,c) => s + Math.abs(v-b[i][c]),0),0)/(a.length*3);
async function scroll(page, fraction) {
    const before = await state(page);
    await page.evaluate(fraction => {
        const t = ScrollTrigger.getById('ocean-master');
        scrollTo({top:t.start+(t.end-t.start)*fraction,behavior:'instant'});
    }, fraction);
    await page.waitForFunction(x => Math.abs(NextSkillHomeWaterTest.snapshot().view.cameraX-x)>1, before.view.cameraX);
    await page.waitForTimeout(150);
    return state(page);
}
(async () => {
    const browser = await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
    const report = [], errors = [];
    try {
        for (const [width,height] of [[1440,900],[390,844],[768,1024],[1024,768],[320,640],[720,450]]) {
            const context = await browser.newContext({viewport:{width,height}});
            const page = await context.newPage();
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(base+'/Home/Index', {waitUntil:'networkidle'});
            await page.waitForFunction(() => {
                const s = window.NextSkillHomeWaterTest?.snapshot();
                return s?.renderer==='webgl' && s.seconds>6 && s.wake.strength<.01 && s.wake.active===0;
            });
            await page.evaluate(() => NextSkillMotion.setPaused(true));
            await page.screenshot({path:path.join(output,`after-shore-${width}.png`)});
            const start = await scroll(page,.1);
            const anchorBefore = await page.locator('.ow-start-land').boundingBox();
            const shipBefore = await page.locator('.ocean-backdrop-boat-track--1').boundingBox();
            const surfaceBox = await page.locator('.ow-water-detail').boundingBox();
            const points = [.1,.5,.9].flatMap(y => Array.from({length:12},(_,i) => [(.5+i*.04)*start.width,y*start.height])
                .map(([x,y]) => [(Math.floor(x)+.5)/start.width,(Math.floor(y)+.5)/start.height]));
            const before = await pixels(page,points);
            const moved = await scroll(page,.22);
            const anchorAfter = await page.locator('.ow-start-land').boundingBox();
            const shipAfter = await page.locator('.ocean-backdrop-boat-track--1').boundingBox();
            assert.ok(Math.abs((shipAfter.x-shipBefore.x)-(anchorAfter.x-anchorBefore.x))<1,'Background boats use the same world travel as the land and water');
            const delta = moved.view.travel-start.view.travel;
            assert.ok(delta>.15,'Camera travels far enough to expose screen-locked water');
            assert.equal(moved.seconds,start.seconds,'Ambient time stays frozen during camera travel');
            // Read the island's actual movement, not a duplicate of the shader's
            // projection formula. The water must share that movement at every depth.
            const trackedPoints = points.map(([x,y]) => [x+(anchorAfter.x-anchorBefore.x)/surfaceBox.width,y+(anchorAfter.y-anchorBefore.y)/surfaceBox.height]);
            assert.ok(trackedPoints.every(([x]) => x>0 && x<1));
            const tracked = await pixels(page,trackedPoints);
            const stationary = await pixels(page,points);
            const trackedError = difference(before,tracked), screenError = difference(before,stationary);
            assert.ok(trackedError<4,`The same water patch survives camera travel (${trackedError.toFixed(2)})`);
            assert.ok(screenError>trackedError*2 && screenError>4,`Water moves past the hull (${screenError.toFixed(2)})`);
            assert.ok(tracked.every(p => p[3]===255),'No uncovered texture edge');
            await page.screenshot({path:path.join(output,`after-sailing-${width}.png`)});
            await scroll(page,.1);
            assert.ok(difference(before,await pixels(page,points))<1,'Reverse travel returns to the same water');
            await scroll(page,.82);
            const templeBefore = await objectPoints(page,'.ow-dock .sanctum-art');
            const templePixels = await pixels(page,templeBefore);
            await scroll(page,.94);
            const templeAfter = await objectPoints(page,'.ow-dock .sanctum-art');
            const templeValid = templeBefore.map((p,i) => p.every(v=>v>.02&&v<.98)&&templeAfter[i].every(v=>v>.02&&v<.98) ? i : -1).filter(i=>i>=0);
            assert.ok(templeValid.length>=4,'Enough temple-relative water remains visible');
            const templeError = difference(templeValid.map(i=>templePixels[i]),await pixels(page,templeValid.map(i=>templeAfter[i])));
            assert.ok(templeError<4,`Water stays registered to the temple while the horizon rises (${templeError.toFixed(2)})`);
            // The portal's depth scene zooms independently of the viewport-sized
            // GPU canvas. Check the same affine scale the real approach uses.
            const zoomBefore = await objectPoints(page,'.ow-dock .sanctum-art');
            const zoomPixels = await pixels(page,zoomBefore);
            await page.evaluate(() => {
                document.querySelector('.cv-depth-scene').style.transform='scale(1.035)';
                document.dispatchEvent(new Event('nextskill:ocean-view'));
            });
            await page.waitForTimeout(100);
            const zoomAfter = await objectPoints(page,'.ow-dock .sanctum-art');
            const zoomValid = zoomBefore.map((p,i) => p.every(v=>v>.02&&v<.98)&&zoomAfter[i].every(v=>v>.02&&v<.98) ? i : -1).filter(i=>i>=0);
            const zoomError = difference(zoomValid.map(i=>zoomPixels[i]),await pixels(page,zoomValid.map(i=>zoomAfter[i])));
            assert.ok(zoomValid.length>=4 && zoomError<4,`Water shares the temple's approach zoom (${zoomError.toFixed(2)})`);
            await page.evaluate(() => {
                document.querySelector('.cv-depth-scene').style.removeProperty('transform');
                document.dispatchEvent(new Event('nextskill:ocean-view'));
            });
            await scroll(page,.95);
            const edge = await pixels(page,[[.001,.1],[.999,.1],[.001,.9],[.999,.9]]);
            assert.ok(edge.every(p => p[3]===255 && p.slice(0,3).some(v=>v>20)),'Long travel retains complete water at both edges');
            await page.locator('[data-theme-toggle]').click();
            await page.screenshot({path:path.join(output,`after-harbor-night-${width}.png`)});
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth+1));
            report.push({width,height,trackedError,screenError,templeError,zoomError,passed:true});
            console.log(`PASS island/boats/temple registration, rising horizon, zoom and reverse travel ${width}px (island ${trackedError.toFixed(2)}, temple ${templeError.toFixed(2)}, zoom ${zoomError.toFixed(2)})`);
            await context.close();
        }
        assert.deepEqual(errors,[]);
        fs.writeFileSync(path.join(output,'world-report.json'),JSON.stringify({report,errors},null,2));
    } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
