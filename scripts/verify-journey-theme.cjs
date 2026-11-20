// Read-only UI regression: no course selection, checkpoints or quiz submissions.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5383';
const output = path.resolve('artifacts/journey-theme');

(async () => {
    fs.mkdirSync(output, {recursive:true});
    const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
    const errors=[];
    try {
        for (const width of [320,390,1440]) {
            const context=await browser.newContext({viewport:{width,height:width<701?844:1000},reducedMotion:'no-preference'});
            const page=await context.newPage();
            page.on('pageerror',e=>errors.push(e.message));
            await page.goto(`${base}/Home/Index`,{waitUntil:'load'});
            const toggle=page.locator('[data-theme-toggle]');
            await toggle.waitFor({state:'visible'});
            assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
            const hit=await toggle.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
            assert.ok(hit,'Theme toggle obscured');
            const sunTop=await page.locator('.journey-sun').evaluate(el=>el.getBoundingClientRect().top);
            await toggle.click();
            assert.equal(await toggle.getAttribute('aria-pressed'),'true');
            assert.equal(await page.evaluate(()=>localStorage.getItem('nextskill.theme.v1')),'dark');
            if(width===1440){
                await page.waitForTimeout(500);
                const mid=await page.locator('.journey-sun').evaluate(el=>el.getBoundingClientRect().top);
                assert.ok(mid>sunTop+10,'Sun did not descend during the transition');
            }
            await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-transitioning'));
            const lights=await page.evaluate(()=>({sun:getComputedStyle(document.querySelector('.journey-sun')).opacity,moon:getComputedStyle(document.querySelector('.journey-moon')).opacity,overflow:document.documentElement.scrollWidth>innerWidth}));
            assert.equal(lights.sun,'0');assert.equal(lights.moon,'1');assert.equal(lights.overflow,false);
            await page.screenshot({path:path.join(output,`home-night-${width}.png`)});
            await page.reload({waitUntil:'load'});
            assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
            // Reverse twice during the celestial transition; the last click wins.
            await toggle.click();await page.waitForTimeout(180);await toggle.click();
            await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-transitioning'));
            assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
            assert.equal(await page.locator('.journey-moon').count(),1);
            console.log(`PASS Home switch, persistence, reversal and layout ${width}px`);

            if(width!==320){
                const response=await page.goto(`${base}/Learning/Island?courseId=1`,{waitUntil:'load'});
                assert.equal(response.status(),200,'Island needs the local Development learning database');
                await page.locator('.sj-lesson-island').first().waitFor();
                assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
                assert.equal(await page.locator('.learning-celestial .journey-moon').count(),1);
                const compact = width < 1024;
                if (compact) {
                    assert.equal(await page.locator('#island-current-card').isVisible(), false);
                    const stops = page.locator('#lesson-route .sj-lesson-island');
                    const tops = await stops.evaluateAll(items => items.map(item => item.getBoundingClientRect().top));
                    assert.ok(tops.every((top, index) => index === 0 || top > tops[index - 1]), 'Compact lessons should run from top to bottom');
                    await stops.first().click();
                    await page.locator('#island-detail-dialog[open]').waitFor();
                }
                const colors=await page.evaluate(compact=>['#locate-current','.learning-heading h1',compact ? '#detail-number' : '#current-island-number'].map(selector=>getComputedStyle(document.querySelector(selector)).color),compact);
                const luminance=color=>{
                    const channels=color.match(/[\d.]+/g).slice(0,3).map(x=>Number(x)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
                    return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
                };
                const darkSurface=luminance('rgb(21,47,70)');
                colors.forEach(color=>assert.ok((luminance(color)+.05)/(darkSurface+.05)>=4.5,`Low contrast text ${color}`));
                if (compact) {
                    await page.keyboard.press('Escape');
                    await page.locator('#island-detail-dialog').waitFor({ state: 'hidden' });
                }
                await page.screenshot({path:path.join(output,`island-night-${width}.png`)});
                await page.locator('#island-course-toggle').click();
                await page.locator('#island-course-all').click();
                await page.locator('#course-harbor-dialog').waitFor({state:'visible'});
                await page.screenshot({path:path.join(output,`picker-night-${width}.png`)});
                await page.keyboard.press('Escape');
                await toggle.click();
                await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-transitioning'));
                assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
                await page.screenshot({path:path.join(output,`island-day-${width}.png`)});
                console.log(`PASS Island theme, celestial pair and course picker ${width}px`);
            }
            await context.close();
        }
        const reduced=await browser.newPage({reducedMotion:'reduce'});
        reduced.on('pageerror',e=>errors.push(e.message));
        await reduced.goto(`${base}/Home/Index`,{waitUntil:'load'});
        const toggle=reduced.locator('[data-theme-toggle]');
        await toggle.focus();await reduced.keyboard.press('Enter');
        assert.equal(await reduced.locator('html').getAttribute('data-theme'),'dark');
        assert.equal(await reduced.locator('html').evaluate(el=>el.classList.contains('theme-transitioning')),false);
        assert.equal(await reduced.locator('.journey-moon').evaluate(el=>getComputedStyle(el).opacity),'1');
        await reduced.close();
        console.log('PASS keyboard activation and reduced motion');
        const nightContext=await browser.newContext({viewport:{width:1440,height:1000}});
        await nightContext.addInitScript(()=>localStorage.setItem('nextskill.theme.v1','dark'));
        const night=await nightContext.newPage();
        night.on('pageerror',e=>errors.push(e.message));
        await night.goto(`${base}/Home/Index`,{waitUntil:'load'});
        await night.waitForFunction(()=>!document.querySelector('.ow-scene').dataset.arrival && document.querySelector('#nextskill-agent').dataset.context==='shore');
        await night.locator('.ow-intro [data-ocean-go]').click();
        await night.waitForFunction(()=>document.querySelector('.ow-scene').dataset.stage==='1');
        await night.locator('[data-theme-toggle]').click();
        await night.waitForFunction(()=>document.querySelector('.ow-scene').dataset.stage==='2');
        assert.equal(await night.locator('html').getAttribute('data-theme'),'light');
        await night.locator('.ow-container-button').click();
        await night.locator('#course-harbor-dialog').waitFor({state:'visible'});
        await night.keyboard.press('Escape');
        await night.evaluate(()=>window.NextSkillMotion.setPaused(true));
        await night.locator('[data-theme-toggle]').click();
        assert.equal(await night.locator('html').getAttribute('data-theme'),'dark');
        assert.equal(await night.locator('html').evaluate(el=>el.classList.contains('theme-transitioning')),false);
        await nightContext.close();
        console.log('PASS night voyage, course picker and paused theme switch');
        assert.deepEqual(errors,[]);
    } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
