/* Read-only scenic motion regression checks. Run against Development for deterministic fish controls. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = (process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5299').replace(/\/$/, '');
const output = path.resolve(process.env.NEXTSKILL_TEST_OUTPUT || 'artifacts/ocean-motion');
fs.mkdirSync(output, { recursive:true });
const report = { base, startedAt:new Date().toISOString(), checks:[], pageErrors:[], failedRequests:[], screenshots:[] };
let browser, context, page;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const snapshot = () => page.evaluate(() => window.NextSkillOceanLifeTest.snapshot());
async function capture(name) {
    const filename = `${name}.png`;
    await page.screenshot({ path:path.join(output, filename) });
    report.screenshots.push(filename);
}
async function check(name, operation) {
    try {
        const detail = await operation();
        report.checks.push({ name, passed:true, detail });
        console.log(`PASS ${name}`);
    } catch (error) {
        report.checks.push({ name, passed:false, error:error.stack || String(error) });
        await capture(`failure-${name.replace(/[^a-z0-9]+/gi, '-')}`).catch(() => {});
        console.error(`FAIL ${name}: ${error.message}`);
    }
}
async function open(width = 1440, height = 1000) {
    await page.setViewportSize({ width, height });
    const response = await page.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => !!window.NextSkillMotion && !!window.NextSkillOceanLifeTest);
    await page.evaluate(() => window.NextSkillMotion.setPaused(false));
    await page.waitForFunction(() => window.NextSkillOceanLifeTest.snapshot().allowed && window.NextSkillOceanLifeTest.snapshot().stable);
}
async function startFish() {
    await page.waitForFunction(() => {
        const state = window.NextSkillOceanLifeTest.snapshot();
        return state.allowed && state.stable && !state.active;
    });
    const forced = await page.evaluate(() => window.NextSkillOceanLifeTest.force(7));
    assert.equal(forced.started, true, `No safe zone: ${JSON.stringify(forced)}`);
}
async function fishPose() {
    return page.evaluate(() => {
        const fish = document.querySelector('[data-ocean-fish]');
        return { transform:getComputedStyle(fish).transform, opacity:getComputedStyle(fish).opacity,
            parts:[...fish.querySelectorAll('[data-fish-tail],[data-fish-fin]')].map(part => getComputedStyle(part).transform),
            times:fish.getAnimations({ subtree:true }).map(animation => animation.currentTime) };
    });
}
async function scrollToFraction(fraction) {
    await page.evaluate(fraction => {
        const trigger = window.ScrollTrigger.getById('ocean-master');
        window.scrollTo({ top:trigger.start + (trigger.end - trigger.start) * fraction, behavior:'instant' });
    }, fraction);
}
async function cameraSamples(duration) {
    return page.evaluate(duration => new Promise(resolve => {
        const started = performance.now(), samples = [];
        function sample(now) {
            const matrix = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.ow-camera')).transform);
            const world = window.NextSkillOceanWorldTest?.snapshot();
            samples.push({ time:now - started, x:matrix.m41, y:matrix.m42, stage:document.querySelector('#ocean-journey').dataset.stage,
                target:world?.targetProgress, rendered:world?.renderedProgress });
            if (now - started < duration) requestAnimationFrame(sample); else resolve(samples);
        }
        requestAnimationFrame(sample);
    }), duration);
}

(async () => {
    browser = await chromium.launch({ headless:true, executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    context = await browser.newContext({ viewport:{ width:1440,height:1000 }, recordVideo:{ dir:output, size:{ width:1440,height:1000 } } });
    page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => report.pageErrors.push(error.message));
    page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') report.failedRequests.push({ url:request.url(), error:request.failure()?.errorText }); });

    await check('responsive scene and readable controls', async () => {
        const dimensions = [];
        for (const width of [320,360,390,768,1024,1440]) {
            await open(width, 900);
            const measured = await page.evaluate(() => {
                const primary = document.querySelector('.ow-intro [data-ocean-go]');
                const rect = primary.getBoundingClientRect();
                const center = document.elementFromPoint(rect.x + rect.width/2, rect.y + rect.height/2);
                return { viewport:innerWidth, scroll:document.documentElement.scrollWidth,
                    brokenImages:[...document.querySelectorAll('.ow-scene img')].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src),
                    primaryVisible:rect.top >= 0 && rect.bottom <= innerHeight && (center === primary || primary.contains(center)),
                    nimoCount:document.querySelectorAll('.skill-buddy').length };
            });
            assert.ok(measured.scroll <= measured.viewport + 1, `Overflow at ${width}: ${measured.scroll}`);
            assert.deepEqual(measured.brokenImages, []);
            assert.ok(measured.primaryVisible, `Primary CTA occluded at ${width}`);
            assert.equal(measured.nimoCount, 1, 'Nimo must remain a singleton');
            dimensions.push({ width,...measured });
            await capture(`home-${width}`);
        }
        return dimensions;
    });

    await check('parallax responds continuously and settles', async () => {
        await open();
        const samples = [];
        for (const fraction of [.12,.35,.65,1]) {
            await scrollToFraction(fraction);
            const frames = await cameraSamples(1600);
            const last = frames.at(-1);
            const settled = frames.filter(frame => frame.time >= 1450);
            const finalDrift = Math.max(...settled.map(frame => Math.abs(frame.x-last.x)));
            const steps = frames.slice(1).map((frame,index) => Math.abs(frame.x-frames[index].x));
            assert.ok(finalDrift < 1, `Camera still drifts ${finalDrift.toFixed(2)}px at ${fraction}`);
            assert.ok(frames.every(frame => Number.isFinite(frame.x)), 'Non-finite camera position');
            assert.ok(frames.every(frame => {
                const progress = frame.rendered * .62;
                return Number(frame.stage) === (progress < .16 ? 0 : progress < .48 ? 1 : 2);
            }), 'Caption stage races ahead of rendered camera');
            samples.push({ fraction, frames:frames.length, maxFrameStep:Math.max(...steps), finalDrift, final:last });
            if (fraction === .35) await capture('travel');
            if (fraction === 1) await capture('harbor');
        }
        // Reverse before a large forward move settles; it should retarget the current camera.
        await scrollToFraction(.1);
        await sleep(350);
        await scrollToFraction(.8);
        await sleep(80);
        await scrollToFraction(.25);
        const reversed = await cameraSamples(1600);
        const last = reversed.at(-1);
        assert.ok(Math.abs(reversed.at(-8).x-last.x) < 1);
        return { samples, reversedFinal:last, world:await page.evaluate(() => window.NextSkillOceanWorldTest?.snapshot() || null) };
    });

    await check('all five wave tiles cover viewport throughout their loop and parallax', async () => {
        const geometry = [];
        for (const width of [390,1440]) {
            await open(width);
            for (const travel of [0,1]) {
                await scrollToFraction(travel);
                await sleep(800);
                for (const phase of [0,.5,.99999]) {
                    const planes = await page.evaluate(phase => [...document.querySelectorAll('.ow-swell-drift')].map(element => {
                        const animation = element.getAnimations()[0];
                        animation.pause();
                        const timing = animation.effect.getTiming();
                        animation.currentTime = Number(timing.delay) + Number(timing.duration) * phase;
                        const rect = element.getBoundingClientRect();
                        return { name:element.parentElement.className, left:rect.left, right:rect.right, viewport:innerWidth };
                    }), phase);
                    assert.equal(planes.length, 5);
                    assert.ok(planes.every(plane => plane.left <= .5 && plane.right >= plane.viewport-.5), `Wave coverage gap: ${JSON.stringify({width,travel,phase,planes})}`);
                    geometry.push({ width,travel,phase,planes });
                }
                await capture(`wave-coverage-${width}-${travel}`);
            }
        }
        return geometry;
    });

    await check('pause during parallax catch-up freezes and resume reaches its target without new input', async () => {
        await open();
        await scrollToFraction(.8);
        await sleep(80);
        await page.evaluate(() => window.NextSkillMotion.setPaused(true));
        const paused = await page.evaluate(() => window.NextSkillOceanWorldTest.snapshot());
        await sleep(180);
        const frozen = await page.evaluate(() => window.NextSkillOceanWorldTest.snapshot());
        assert.ok(Math.abs(frozen.renderedProgress-paused.renderedProgress) < .0001, 'Camera drifts while paused');
        await page.evaluate(() => window.NextSkillMotion.setPaused(false));
        await sleep(1000);
        const resumed = await page.evaluate(() => window.NextSkillOceanWorldTest.snapshot());
        assert.ok(Math.abs(resumed.renderedProgress-resumed.targetProgress) < .001,
            `Camera never reaches target after resume: ${JSON.stringify({paused,frozen,resumed})}`);
        return { paused,frozen,resumed };
    });

    await check('fish arc stays clear of content and has dense continuous tangent frames', async () => {
        await open();
        await startFish();
        const state = await snapshot();
        const arc = state.lastSpawn.footprint;
        assert.ok(state.lastSpawn.exclusions.every(box => !(arc.left < box.right && arc.right > box.left && arc.top < box.bottom && arc.bottom > box.top)));
        const trajectory = await page.evaluate(() => {
            const fish = document.querySelector('[data-ocean-fish]');
            const animation = fish.getAnimations().find(item => item.effect.getKeyframes().some(frame => frame.transform));
            if (!animation) throw Error('Fish trajectory is missing');
            const frames = animation.effect.getKeyframes();
            const matrices = frames.map(frame => new DOMMatrixReadOnly(frame.transform));
            return { duration:animation.effect.getTiming().duration, count:frames.length,
                maxStep:Math.max(...matrices.slice(1).map((matrix,index) => Math.hypot(matrix.m41-matrices[index].m41,matrix.m42-matrices[index].m42))),
                start:{ x:matrices[0].m41,y:matrices[0].m42 }, apex:{ x:matrices[Math.floor(matrices.length/2)].m41,y:matrices[Math.floor(matrices.length/2)].m42 },
                end:{ x:matrices.at(-1).m41,y:matrices.at(-1).m42 } };
        });
        assert.ok(trajectory.count >= 31, `Only ${trajectory.count} frames`);
        assert.ok(trajectory.maxStep < 8, `Large fish pose step ${trajectory.maxStep}`);
        assert.ok(trajectory.apex.y < trajectory.start.y-20, 'Fish has no airborne arc');
        assert.ok(Math.abs(trajectory.end.y-trajectory.start.y) < 2, 'Landing is not at launch waterline');
        await sleep(350);
        await capture('fish-apex');
        return { trajectory, footprint:arc, exclusions:state.lastSpawn.exclusions.length };
    });

    await check('scroll during a fish jump keeps its current event', async () => {
        await open();
        await startFish();
        const initial = await snapshot();
        await sleep(120);
        await scrollToFraction(.025);
        const after = await snapshot();
        assert.equal(after.active, true);
        assert.equal(after.totalEvents, initial.totalEvents);
        return { events:after.totalEvents, active:after.active };
    });

    await check('fish emerges through its fixed waterline and submerges before reset', async () => {
        await open();
        await startFish();
        await page.evaluate(() => window.NextSkillMotion.setPaused(true));
        const phases = [];
        for (const phase of [0,.08,.5,.92,1]) {
            const measured = await page.evaluate(phase => {
                const fish = document.querySelector('[data-ocean-fish]');
                const animation = fish.getAnimations().find(item => item.effect.getKeyframes().some(frame => frame.transform));
                animation.currentTime = Number(animation.effect.getTiming().duration) * phase;
                const rect = fish.getBoundingClientRect();
                const state = window.NextSkillOceanLifeTest.snapshot();
                const waterline = document.querySelector('[data-ocean-life]').getBoundingClientRect().top + state.lastSpawn.y + 1;
                return { top:rect.top, bottom:rect.bottom, waterline, opacity:getComputedStyle(fish).opacity,
                    clip:getComputedStyle(document.querySelector('[data-ocean-airspace]')).clipPath };
            }, phase);
            assert.equal(measured.opacity, '1', 'Fish fades instead of physically crossing the waterline');
            assert.notEqual(measured.clip, 'none');
            if (phase === 0 || phase === 1) assert.ok(measured.top >= measured.waterline - 1.1, 'Fish remains visibly airborne at reset');
            if (phase === .5) assert.ok(measured.bottom < measured.waterline - 20, 'Fish apex is clipped underwater');
            if (phase === .08 || phase === .92) assert.ok(measured.top < measured.waterline && measured.bottom > measured.waterline, 'Emergence/submergence has no partial waterline clipping');
            phases.push({ phase,...measured });
            if (phase === .08 || phase === .5 || phase === .92) await capture(`fish-waterline-${phase}`);
        }
        await page.evaluate(() => window.NextSkillMotion.setPaused(false));
        return phases;
    });

    await check('pause freezes fish and water in place then resumes', async () => {
        await open();
        await startFish();
        await sleep(160);
        await page.evaluate(() => window.NextSkillMotion.setPaused(true));
        await page.waitForFunction(() => window.NextSkillOceanLifeTest.snapshot().paused);
        const before = await fishPose();
        await sleep(250);
        const after = await fishPose();
        const state = await snapshot();
        assert.equal(state.active, true); assert.equal(state.animationCount, 0); assert.equal(state.timerCount, 0);
        assert.deepEqual(after, before);
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.ow-swell-drift')).animationPlayState), 'paused');
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.ow-palm')).animationPlayState), 'paused');
        assert.equal(await page.evaluate(() => window.NextSkillOceanLifeTest.force(7).started), false);
        await capture('paused');
        await page.evaluate(() => window.NextSkillMotion.setPaused(false));
        await sleep(120);
        const resumed = await fishPose();
        assert.notEqual(resumed.transform, after.transform);
        return { frozen:before, resumed };
    });

    await check('dialog pauses ambient motion and primary action stays immediate', async () => {
        await open();
        await startFish();
        const started = performance.now();
        await page.locator('.sj-nav [data-smart-action="choose-course"]').first().click();
        await page.locator('#course-harbor-dialog').waitFor({ state:'visible' });
        const openedMs = Math.round(performance.now()-started);
        assert.ok(openedMs < 1500, `Picker delayed by scene: ${openedMs}ms`);
        await page.waitForFunction(() => window.NextSkillOceanLifeTest.snapshot().state.dialogOpen);
        const state = await snapshot();
        assert.equal(state.allowed, false); assert.equal(state.timerCount, 0); assert.equal(state.animationCount, 0);
        const pose = await fishPose();
        await sleep(160);
        assert.deepEqual(await fishPose(), pose);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.NextSkillOceanLifeTest.snapshot().allowed);
        return { openedMs, state };
    });

    await check('live reduced motion cancels decoration and restores a usable static page', async () => {
        await open();
        await startFish();
        await page.emulateMedia({ reducedMotion:'reduce' });
        await page.waitForFunction(() => window.NextSkillOceanLifeTest.snapshot().state.reduced);
        const state = await snapshot();
        assert.equal(state.active, false); assert.equal(state.timerCount, 0); assert.equal(state.animationCount, 0);
        assert.equal(await page.evaluate(() => window.NextSkillOceanLifeTest.force(7).started), false);
        assert.equal(await page.evaluate(() => document.documentElement.classList.contains('ow-static')), true);
        assert.equal(await page.evaluate(() => document.querySelector('.ow-harbor').inert), false);
        await capture('reduced-motion');
        await page.emulateMedia({ reducedMotion:'no-preference' });
        await page.waitForFunction(() => window.NextSkillOceanLifeTest.snapshot().allowed);
        assert.equal(await page.locator('.ow-track').count(), 1, 'Motion preference rebuild duplicated the scene track');
        return state;
    });

    await check('scene out of view suspends ambient work', async () => {
        await open();
        await startFish();
        // Add read-only surrounding document space to exercise real intersection observation.
        await page.evaluate(() => {
            const spacer = document.createElement('div');
            spacer.id = 'motion-qa-spacer'; spacer.style.height = '200vh';
            document.body.append(spacer);
            window.scrollTo({ top:document.documentElement.scrollHeight, behavior:'instant' });
        });
        await page.waitForFunction(() => !window.NextSkillOceanLifeTest.snapshot().state.sceneVisible);
        const state = await snapshot();
        assert.equal(state.allowed, false); assert.equal(state.animationCount, 0); assert.equal(state.timerCount, 0);
        await page.evaluate(() => { document.querySelector('#motion-qa-spacer').remove(); scrollTo({ top:0,behavior:'instant' }); });
        await page.waitForFunction(() => window.NextSkillOceanLifeTest.snapshot().allowed);
        return state;
    });

    await check('page lifecycle suspension and restoration', async () => {
        await open();
        await startFish();
        await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted:true })));
        const hidden = await snapshot();
        assert.equal(hidden.allowed, false); assert.equal(hidden.animationCount, 0); assert.equal(hidden.timerCount, 0);
        await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted:true })));
        await page.waitForFunction(() => window.NextSkillOceanLifeTest.snapshot().allowed);
        assert.equal(await page.locator('.ow-track').count(), 1);
        return { hidden, restored:await snapshot(), note:'Synthetic pagehide/pageshow exercises BFCache lifecycle; actual OS tab hiding is not simulated.' };
    });

    await check('bird flight is live and pauses with the scene', async () => {
        await open();
        const before = await snapshot();
        assert.ok(before.birdCount >= 3);
        assert.ok(before.birdAnimationCount >= 3);
        await page.evaluate(() => window.NextSkillMotion.setPaused(true));
        const stopped = await snapshot();
        assert.equal(stopped.birdAnimationCount, 0);
        await page.evaluate(() => window.NextSkillMotion.setPaused(false));
        const resumed = await snapshot();
        assert.ok(resumed.birdAnimationCount >= 3);
        return { before, stopped, resumed };
    });

    await check('every bird resets beyond both viewport edges at either parallax endpoint', async () => {
        const results = [];
        for (const width of [390,1440]) {
            await open(width);
            for (const travel of [0,1]) {
                await scrollToFraction(travel);
                await sleep(700);
                await page.evaluate(() => window.NextSkillMotion.setPaused(true));
                for (const phase of [0,.99999]) {
                    const birds = await page.evaluate(phase => [...document.querySelectorAll('[data-ocean-bird]')].map(bird => {
                        const animation = bird.getAnimations()[0];
                        animation.currentTime = Number(animation.effect.getTiming().duration) * phase;
                        const rect = bird.getBoundingClientRect();
                        return { origin:bird.dataset.flightOrigin, scale:bird.dataset.flightScale, left:rect.left,right:rect.right,viewport:innerWidth };
                    }), phase);
                    assert.equal(birds.length, 3);
                    assert.ok(birds.every(bird => phase === 0 ? bird.left > bird.viewport : bird.right < 0), `Visible bird reset: ${JSON.stringify({width,travel,phase,birds})}`);
                    results.push({ width,travel,phase,birds });
                }
                await page.evaluate(() => window.NextSkillMotion.setPaused(false));
            }
        }
        return results;
    });

    await check('coarse pointer keeps native touch scroll and shorter parallax catch-up', async () => {
        const touchContext = await browser.newContext({ viewport:{ width:390,height:844 }, hasTouch:true, isMobile:true });
        const touchPage = await touchContext.newPage();
        touchPage.on('pageerror', error => report.pageErrors.push(error.message));
        try {
            await touchPage.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
            await touchPage.waitForFunction(() => !!window.NextSkillOceanWorldTest && window.NextSkillOceanLifeTest.snapshot().allowed);
            const result = await touchPage.evaluate(() => ({
                coarse:matchMedia('(pointer:coarse)').matches,
                world:window.NextSkillOceanWorldTest.snapshot(),
                width:innerWidth, scrollWidth:document.documentElement.scrollWidth,
                touchAction:getComputedStyle(document.querySelector('#ocean-journey')).touchAction
            }));
            assert.equal(result.coarse, true);
            assert.equal(result.world.scrubDuration, .32);
            assert.ok(result.scrollWidth <= result.width + 1);
            assert.notEqual(result.touchAction, 'none');
            return result;
        } finally { await touchContext.close(); }
    });

    await check('200 percent zoom-equivalent layout remains readable and usable', async () => {
        // 1440x1000 physical pixels at 200% browser zoom expose a 720x500 CSS-pixel viewport.
        const zoomContext = await browser.newContext({ viewport:{ width:720,height:500 }, deviceScaleFactor:2 });
        const zoomPage = await zoomContext.newPage();
        zoomPage.on('pageerror', error => report.pageErrors.push(error.message));
        try {
            await zoomPage.goto(`${base}/Home/Index`, { waitUntil:'domcontentloaded' });
            await zoomPage.evaluate(() => document.fonts.ready);
            await zoomPage.waitForFunction(() => !!window.NextSkillOceanWorldTest);
            const result = await zoomPage.evaluate(() => {
                const button = document.querySelector('.ow-intro [data-ocean-go]');
                const rect = button.getBoundingClientRect();
                const center = document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
                const status = document.querySelector('#learning-status');
                const nav = document.querySelector('.sj-nav [data-smart-action="choose-course"]');
                const navRect = nav.getBoundingClientRect();
                const navCenter = document.elementFromPoint(navRect.x+navRect.width/2,navRect.y+navRect.height/2);
                return { width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
                    primaryVisible:rect.top >= 0 && rect.bottom <= innerHeight && (center===button || button.contains(center)),
                    statusVisible:!status.hidden,
                    navVisible:navRect.top >= 0 && navRect.bottom <= innerHeight && (navCenter===nav || nav.contains(navCenter)) };
            });
            assert.ok(result.scrollWidth <= result.width+1);
            // A real database error banner can push the hero below the viewport;
            // the visible header action still provides the same course picker.
            assert.equal(result.statusVisible ? result.navVisible : result.primaryVisible, true);
            await zoomPage.screenshot({ path:path.join(output,'home-zoom-equivalent-200.png') });
            report.screenshots.push('home-zoom-equivalent-200.png');
            return { ...result, note:'Viewport/device-scale equivalence, not OS-level browser zoom automation.' };
        } finally { await zoomContext.close(); }
    });

    await check('browser is free of script and failed network errors', async () => {
        assert.deepEqual(report.pageErrors, []);
        assert.deepEqual(report.failedRequests, []);
    });
})().catch(error => { report.fatal = error.stack || String(error); console.error(error); }).finally(async () => {
    const video = page?.video();
    await context?.close();
    if (video) report.video = path.basename(await video.path());
    await browser?.close();
    report.finishedAt = new Date().toISOString();
    report.passed = !report.fatal && report.checks.every(item => item.passed);
    fs.writeFileSync(path.join(output,'report.json'), JSON.stringify(report,null,2));
    console.log(JSON.stringify({ passed:report.passed, failures:report.checks.filter(item => !item.passed).map(item => item.name), report:path.join(output,'report.json'), video:report.video }));
    if (!report.passed) process.exitCode = 1;
});
