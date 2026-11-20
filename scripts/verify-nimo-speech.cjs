// Speech UI QA in disposable Development guest sessions. Never submit answers.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const base = process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5208';
const out = path.resolve('artifacts/nimo-speech-qa'); fs.mkdirSync(out, { recursive: true });
const errors = [], checks = [];
const overlap = (a,b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const wait = (page, fn, timeout = 12000) => page.waitForFunction(fn, null, { polling: 100, timeout });
async function visible(page) { await wait(page, () => !document.querySelector('#nimo-speech').hidden); }
async function snapshot(page, name) { await page.screenshot({ path: path.join(out, name + '.png') }); }
function pass(name) { checks.push(name); console.log('PASS ' + name); }
(async () => {
 const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
 try {
  async function make(options = {}) {
   const page = await browser.newPage({ viewport: { width:1440, height:900 }, ...options });
   page.setDefaultTimeout(12000); page.on('pageerror', e => errors.push(e.message));
   // An accidental completion request is a test failure, not a test award.
   await page.route('**/Learning/CompleteLesson', route => { errors.push('Unexpected lesson submission'); return route.abort(); });
   return page;
  }
  const page = await make();
  await page.goto(base + '/Home/Index', { waitUntil:'domcontentloaded' });
  await wait(page, () => document.querySelector('#ocean-journey').dataset.arrival === 'rowing');
  assert.equal(await page.locator('#nimo-speech').isVisible(), false);
  await wait(page, () => !document.querySelector('#ocean-journey').dataset.arrival && document.querySelector('#nextskill-agent').dataset.context === 'shore');
  await visible(page); await snapshot(page, 'home-speaking');
  assert.equal(await page.locator('#nextskill-agent').count(), 1);
  assert.equal(await page.locator('#nimo-speech').count(), 1);
  assert.notEqual(await page.locator('#nimo-speech-close').evaluate(e => e === document.activeElement), true);
  pass('Original rowing/jump completes before the single greeting; automatic speech does not take focus');

  await page.locator('#buddy-agent-handle').click();
  assert.equal(await page.locator('#buddy-agent-menu').isVisible(), true);
  assert.equal(await page.locator('#nimo-speech').isVisible(), false);
  await page.locator('[data-agent-action="talk"]').click();
  await visible(page);
  await wait(page, () => document.querySelector('.skill-buddy').dataset.textSpeaking === 'true');
  const first = await page.locator('.nimo-speaking-mouth').evaluate(e => getComputedStyle(e).transform);
  await page.waitForTimeout(90);
  const second = await page.locator('.nimo-speaking-mouth').evaluate(e => getComputedStyle(e).transform);
  assert.notEqual(first, second, 'The visible local mouth layer moves');
  assert.equal(await page.locator('.nimo-speaking-face').evaluate(e => getComputedStyle(e).opacity), '1');
  await page.locator('#nextskill-agent').screenshot({path:path.join(out,'nimo-mouth-speaking.png')});
  await wait(page, () => document.querySelector('#nimo-speech').dataset.speaking === 'false');
  assert.equal(await page.locator('#nimo-speech-text').textContent(), await page.locator('#nimo-speech-announcement').textContent());
  pass('Menu compatibility, local mouth movement, finite typewriter and complete accessible announcement');

  await page.evaluate(() => {
   NextSkillSpeech.say('ข้อความแรกที่ต้องถูกแทนที่ทันที');
   NextSkillSpeech.say('ข้อความล่าสุด', { motion:false });
  });
  assert.equal(await page.locator('#nimo-speech-text').textContent(), 'ข้อความล่าสุด');
  await page.locator('#nimo-speech-close').click();
  await page.waitForTimeout(2600);
  assert.equal(await page.locator('#nimo-speech').isVisible(), false);
  assert.equal(await page.locator('.skill-buddy').getAttribute('data-text-speaking'), null);
  pass('Rapid speech replacement and dismissal cancel stale animation and text');

  await page.evaluate(() => NextSkillMotion.setPaused(true));
  await page.locator('#buddy-agent-handle').focus(); await page.keyboard.press('Enter');
  await page.locator('[data-agent-action="talk"]').focus(); await page.keyboard.press('Enter');
  await visible(page);
  assert.equal(await page.locator('#nimo-speech-close').evaluate(e => e === document.activeElement), true);
  assert.equal(await page.locator('#nimo-speech').getAttribute('data-speaking'), 'false');
  assert.equal(await page.locator('#nimo-speech-text').textContent(), await page.locator('#nimo-speech-measure').textContent());
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#buddy-agent-handle').evaluate(e => e === document.activeElement), true);
  await page.evaluate(() => NextSkillMotion.setPaused(false));
  await page.locator('#buddy-agent-handle').click();
  await page.locator('[data-agent-action="studio"]').click();
  await wait(page, () => document.querySelector('#companion-dialog').open);
  assert.equal(await page.locator('#nimo-speech').isVisible(), false);
  assert.equal(await page.locator('#companion-dialog #nextskill-agent').count(), 1);
  await page.keyboard.press('Escape');
  pass('Paused text, keyboard help/focus return and original studio singleton placement');

  await page.locator('.ow-intro [data-catalog-voyage]').click();
  assert.equal(await page.locator('#nimo-speech').isVisible(), false);
  await page.waitForURL('**/Home/Courses', { timeout:22000 });
  await wait(page, () => document.querySelector('#catalog-voyage').hidden);
  await visible(page); await snapshot(page, 'catalog-speaking');
  assert.equal(await page.locator('.catalog-boat-nimo #nextskill-agent').count(), 1);
  pass('Existing course voyage still arrives; speech hides during travel and returns on the catalog');
  await page.close();

  for (const [width,height] of [[320,640],[390,844],[768,1024],[1024,768],[1440,900],[720,450]]) {
   const responsive = await make({ viewport:{width,height}, reducedMotion:'reduce' });
   await responsive.goto(base+'/Home/Index', {waitUntil:'networkidle'}); await visible(responsive);
   const boxes = await responsive.evaluate(() => {
    const rect = e => e.getBoundingClientRect().toJSON();
    return { bubble:rect(document.querySelector('#nimo-speech')), agent:rect(document.querySelector('#nextskill-agent')), protected:[...document.querySelectorAll('.ns-navbar,[data-home-dashboard]')].map(rect) };
   });
   assert.ok(boxes.bubble.left >= 11 && boxes.bubble.right <= width-11);
   assert.equal(overlap(boxes.bubble, boxes.agent), false, 'Speech leaves Nimo visible');
   assert.ok(boxes.protected.every(box => !overlap(boxes.bubble,box)), 'Speech leaves the dashboard and navigation clear');
   assert.equal(await responsive.locator('#nimo-speech').getAttribute('data-speaking'), 'false');
   await snapshot(responsive, `home-${width}`);
   await responsive.close();
  }
  pass('Six viewports including 320px and 200% equivalent; reduced-motion text and clear hero actions');

  const catalog = await make({ viewport:{width:390,height:844}, reducedMotion:'reduce' });
  await catalog.goto(base+'/Home/Courses?q=zzzz-no-course', {waitUntil:'networkidle'}); await visible(catalog);
  const advice = await catalog.locator('#nimo-speech-announcement').textContent();
  assert.ok(advice.length > 0);
  await catalog.locator('[data-theme-toggle]').click();
  await wait(catalog, () => document.documentElement.dataset.theme === 'dark');
  const ink = await catalog.locator('#nimo-speech').evaluate(e => getComputedStyle(e).color);
  assert.equal(ink,'rgb(240, 250, 255)'); await snapshot(catalog,'catalog-mobile-dark');
  await catalog.close(); pass('Catalog empty-search helper and dark glass text');

  const lesson = await make({ reducedMotion:'reduce' });
  await lesson.goto(base+'/Learning/Practice?courseId=1&lessonId=1', {waitUntil:'networkidle'});
  await wait(lesson, () => !document.querySelector('#lesson-content').hidden); await visible(lesson);
  assert.equal(await lesson.locator('#nimo-speech').getAttribute('data-inline'),'true');
  assert.equal(await lesson.locator('#nimo-speech-text').textContent(),await lesson.locator('#lesson-nimo-message').textContent());
  await lesson.locator('#lesson-step-next').click();
  await wait(lesson, () => document.querySelector('#nimo-speech-text').textContent.includes('เปลี่ยนคำตอบ'));
  const geometry = await lesson.evaluate(() => ({bubble:document.querySelector('#nimo-speech').getBoundingClientRect().toJSON(), questions:document.querySelector('#lesson-questions').getBoundingClientRect().toJSON()}));
  assert.equal(overlap(geometry.bubble,geometry.questions),false);
  // UI-only fault/result fixtures exercise the adapter without calling the
  // submission API, changing XP or claiming a real earned achievement.
  await lesson.evaluate(() => { document.querySelector('#submission-recovery').hidden=false; });
  await wait(lesson, () => document.querySelector('#nimo-speech-text').textContent.includes('ตรวจสถานะการบันทึก'));
  await lesson.evaluate(() => { document.querySelector('#submission-recovery').hidden=true; document.querySelector('#lesson-nimo-message').textContent='ลองดูคำอธิบาย เราค่อย ๆ แก้ไปด้วยกันนะ'; document.querySelector('#lesson-result').hidden=false; document.querySelector('#lesson-result').dataset.passed='false'; });
  await wait(lesson, () => document.querySelector('#nimo-speech-text').textContent.includes('ค่อย ๆ แก้'));
  assert.equal(await lesson.locator('#nimo-speech-text').textContent(),await lesson.locator('#lesson-nimo-message').textContent());
  await lesson.evaluate(() => { document.querySelector('#lesson-result').hidden=true; document.querySelector('#lesson-nimo-message').textContent='เลือกคำตอบที่เหมาะที่สุด เปลี่ยนคำตอบก่อนส่งได้เสมอ'; });
  await wait(lesson, () => document.querySelector('#nimo-speech-text').textContent.includes('เปลี่ยนคำตอบ'));
  await lesson.evaluate(() => { document.querySelector('#lesson-result').hidden=false; document.querySelector('#lesson-nimo-message').textContent='ลองดูคำอธิบาย เราค่อย ๆ แก้ไปด้วยกันนะ'; });
  await wait(lesson, () => !document.querySelector('#nimo-speech').hidden && document.querySelector('#nimo-speech-text').textContent.includes('ค่อย ๆ แก้'));
  await lesson.evaluate(() => { const error=document.querySelector('#lesson-error'); error.textContent='ยังเชื่อมต่อไม่ได้ กรุณาลองอีกครั้ง'; error.hidden=false; });
  await wait(lesson, () => document.querySelector('#nimo-speech-text').textContent.includes('ยังเชื่อมต่อไม่ได้'));
  await lesson.evaluate(() => { document.querySelector('#lesson-error').hidden=true; });
  await wait(lesson, () => document.querySelector('#nimo-speech-text').textContent.includes('ค่อย ๆ แก้'));
  await snapshot(lesson,'lesson-encouragement'); await lesson.close();
  pass('Real lesson hints, inline flow, save/error priority and repeated retries; UI fixtures never award XP');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'report.json'), JSON.stringify({checks,errors},null,2));
  console.log(`${checks.length} groups passed; no browser errors or answer submissions`);
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
