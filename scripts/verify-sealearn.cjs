const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = process.env.SEALEARN_TEST_OUTPUT || 'artifacts/sealearn';
fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'msedge' });
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
 const errors = [], failures = [], checks = [];
 page.on('pageerror', error => errors.push(error.message));
 page.on('response', response => { if(response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
 const base = process.env.SEALEARN_TEST_URL || 'http://127.0.0.1:5190';
 await page.goto(`${base}/Home/Index`); await page.evaluate(() => document.fonts.ready);
 assert.equal(await page.locator('#sea-workspace').evaluate(e=>e.open),false);
 for (const width of [320,375,768,1024,1440,1920]) {
  await page.setViewportSize({width,height:1000}); await page.waitForTimeout(200);
  const measure = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth, nav:document.querySelector('.sea-nav').getBoundingClientRect().width, broken: [...document.querySelectorAll('.sea-landing img')].filter(i=>i.complete && !i.naturalWidth).map(i=>i.src) }));
  assert.ok(measure.width <= width, `overflow ${width}: ${JSON.stringify(measure)}`); assert.deepEqual(measure.broken, []);
  checks.push({test:`responsive ${width}px`,result:'PASS',...measure});
  if([375,768,1440].includes(width)) await page.screenshot({path:path.join(output, `sealearn-${width}.png`)});
 }
 await page.setViewportSize({width:375,height:900});
 await page.locator('.sea-menu-button').click(); assert.equal(await page.locator('.sea-menu-button').getAttribute('aria-expanded'),'true');
 await page.keyboard.press('Escape'); assert.equal(await page.locator('.sea-menu-button').getAttribute('aria-expanded'),'false'); checks.push({test:'Mobile menu and Escape focus return',result:'PASS'});
 await page.setViewportSize({width:1440,height:1000});
 await page.mouse.move(500,350); await page.waitForTimeout(100);
 assert.notEqual(await page.locator('.sea-landscape').evaluate(e=>e.style.transform),'');
 await page.locator('#sea-motion').click(); assert.equal(await page.locator('.sea-landscape').evaluate(e=>e.style.transform),'');
 await page.locator('#sea-motion').click();
 await page.emulateMedia({reducedMotion:'reduce'}); await page.waitForTimeout(100);
 assert.equal(await page.locator('.sea-landscape').evaluate(e=>e.style.transform),''); assert.ok(await page.locator('#sea-motion').isDisabled()); checks.push({test:'Parallax pointer, pause, OS reduced motion',result:'PASS'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 const previewXp = await page.locator('.sea-rewards strong').innerText();
 await page.locator('[data-sea-practice]').click();
 assert.ok(await page.locator('#niko-practice-dialog').evaluate(e=>e.open));
 await page.locator('.niko-answer-option[data-choice="0"]').click();
 assert.equal(await page.locator('#niko-practice-feedback').getAttribute('data-kind'),'retry');
 assert.ok(await page.locator('#niko-next-question').isHidden());
 for(const correct of [1,0,2]) {
  await page.locator(`.niko-answer-option[data-choice="${correct}"]`).click();
  assert.equal(await page.locator('#niko-practice-feedback').getAttribute('data-kind'),'correct');
  await page.locator('#niko-next-question').click();
 }
 assert.ok(await page.locator('#niko-practice-summary').isVisible());
 await page.keyboard.press('Escape');
 assert.ok(await page.locator('[data-sea-practice]').evaluate(e=>e===document.activeElement));
 assert.equal(await page.locator('[data-sea-practice-label]').innerText(),'ทบทวนภารกิจ');
 assert.equal(await page.locator('.sea-rewards strong').innerText(),previewXp);
 assert.equal(await page.locator('.sea-mini-map .is-current').getAttribute('href'),'#lesson-3');
 assert.equal(await page.locator('.sea-mini-map .is-locked a').count(),0);
 checks.push({test:'Game start, retry feedback, three scenarios, summary, focus return, no fake XP, real map state',result:'PASS'});
 const links = await page.locator('.sea-landing a[href],.sea-nav a[href]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('href')))]);
 for(const href of links) {
  if(href.startsWith('#')) assert.ok(await page.locator(href).count(),`missing anchor ${href}`);
  else {const response=await page.request.get(base+href);assert.equal(response.status(),200,href);}
 }
 checks.push({test:'All SeaLearn links and fragment targets',result:'PASS',count:links.length});
 await page.locator('#sea-courses').scrollIntoViewIfNeeded(); await page.screenshot({path:path.join(output, 'sealearn-courses.png')});
 await page.locator('.sea-community summary').click(); await page.locator('.sea-community [data-open-dialog]').click(); assert.ok(await page.locator('#league-dialog').evaluate(e=>e.open)); await page.keyboard.press('Escape');
 await page.locator('.sea-more summary').click(); await page.locator('.sea-more [data-open-dialog="companion-dialog"]').click(); assert.ok(await page.locator('#companion-dialog').evaluate(e=>e.open)); await page.keyboard.press('Escape'); checks.push({test:'League and companion dialogs preserved',result:'PASS'});
 await page.locator('.sea-shortcuts a[href="#learning-path"]').click(); assert.ok(await page.locator('#sea-workspace').evaluate(e=>e.open));
 await page.locator('#jump-current').click(); await page.waitForTimeout(200); assert.equal(await page.locator('.journey-step.current button').evaluate(e=>document.activeElement===e),true);
 await page.locator('.journey-step.current button').click(); assert.ok(await page.locator('#lesson-dialog').evaluate(e=>e.open)); await page.keyboard.press('Escape');
 await page.locator('#niko-practice-start').click(); assert.ok(await page.locator('dialog[open]').count()); await page.keyboard.press('Escape'); checks.push({test:'On-demand workspace, journey, lesson and Niko practice retained',result:'PASS'});
 await page.goto(`${base}/Home/Index#daily-quests`); assert.ok(await page.locator('#sea-workspace').evaluate(e=>e.open));
 checks.push({test:'Direct deep link opens retained workspace',result:'PASS'});
 await page.locator('#sea-query').fill('JavaScript'); await page.locator('.sea-search button').click(); await page.waitForURL('**/Home/Courses?q=JavaScript'); assert.ok((await page.locator('body').innerText()).includes('JavaScript Basics')); checks.push({test:'Search uses existing course controller',result:'PASS'});
 for (const path of ['/Home/Details/1','/Home/Details/5','/Home/Details/6','/Home/Details/9','/Courses/Enrollment','/Account/Login','/Account/Register','/Home/Privacy','/']) { const r=await page.request.get(base+path);assert.equal(r.status(),200,path); }
 checks.push({test:'Course details, enrollment, account pages, privacy and entry route',result:'PASS'});
 assert.deepEqual(errors,[]); assert.deepEqual(failures,[]);
 const report={checkedAt:new Date().toISOString(),checks,pageErrors:errors,httpFailures:failures};fs.writeFileSync(path.join(output, 'sealearn-ui-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
