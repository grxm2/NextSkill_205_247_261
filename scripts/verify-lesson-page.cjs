// Real SQL flows use a fresh, isolated Development preview cookie; never a user account.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5383';
const output=path.resolve('artifacts/lesson-page');
const errors=[];
async function open(page,url){const r=await page.goto(base+url,{waitUntil:'load'});assert.equal(r.status(),200);await page.locator('#lesson-content').waitFor({state:'visible'});}
async function state(page){return page.evaluate(async()=>{const r=await fetch('/Learning/State');if(!r.ok)throw new Error('State unavailable');return r.json();});}
async function answer(page,answers){
 if(await page.locator('#lesson-reading').isVisible())await page.locator('#lesson-step-next').click();
 for(let i=0;i<answers.length;i++){
  const field=page.locator('#lesson-questions fieldset').nth(i);
  await field.waitFor({state:'visible'});await field.locator(`input[value="${answers[i]}"]`).check();
  if(i<answers.length-1)await page.locator('#lesson-step-next').click();
 }
}
async function submit(page){await page.locator('#submit-lesson').click();await page.locator('#lesson-result').waitFor({state:'visible'});}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/Learning/Island?courseId=13`,{waitUntil:'load'});
  assert.equal(await page.locator('body').getAttribute('data-guest-preview'),'true');
  await page.locator('#resume-learning').click();
  await page.waitForURL('**/Learning/Practice?courseId=13&lessonId=1');
  await page.locator('#lesson-content').waitFor({state:'visible'});
  assert.equal(await page.locator('#lesson-dialog').evaluate(el=>el.tagName),'SECTION');
  assert.equal(await page.locator('dialog[open]').count(),0);
  await page.locator('#lesson-step-next').click();
  await page.locator('#lesson-step-next').click();
  assert.equal(await page.locator('#lesson-step-caption').innerText(),'ข้อที่ 1 จาก 3');
  await page.locator('#lesson-questions fieldset').first().locator('input[value="0"]').check();
  await page.locator('#lesson-step-next').click();await page.locator('#lesson-step-back').click();
  assert.equal(await page.locator('#lesson-questions fieldset').first().locator('input[value="0"]').isChecked(),true);
  await page.locator('#lesson-reading-again').click();await answer(page,[0,0,0]);await submit(page);
  assert.equal(await page.locator('#lesson-result').getAttribute('data-passed'),'false');assert.equal((await state(page)).xp,0);
  await page.screenshot({path:path.join(output,'retry.png')});
  await page.locator('#edit-lesson-answers').click();
  await page.locator('#lesson-reading-again').click();await answer(page,[1,0,2]);await submit(page);
  assert.equal(await page.locator('#lesson-result').getAttribute('data-passed'),'true');assert.equal((await state(page)).xp,50);
  await page.screenshot({path:path.join(output,'success.png')});
  await page.locator('#next-island').click();await page.waitForURL('**/Learning/Island?courseId=13');
  const progress=(await state(page)).courses.find(c=>c.courseId===13);
  assert.deepEqual(progress.completedLessons,[1]);assert.ok(progress.unlockedIslands.includes(2));
  console.log('PASS full-page entry, validation, previous answer, correction, XP and next island');
  await open(page,'/Learning/Island?courseId=13&lessonId=1');
  assert.match(page.url(),/Learning\/Practice/);await answer(page,[1,0,2]);await submit(page);
  assert.match(await page.locator('#lesson-result-title').innerText(),/ทบทวน/);assert.equal((await state(page)).xp,50);
  console.log('PASS legacy deep link and no duplicate XP');
  await open(page,'/Learning/Practice?courseId=13&lessonId=1');await answer(page,[1,0,2]);
  await page.route('**/Learning/CompleteLesson',route=>route.abort('failed'),{times:1});
  await page.locator('#submit-lesson').click();await page.locator('#submission-recovery').waitFor({state:'visible'});
  assert.equal(await page.locator('#lesson-questions input:checked').count(),3);
  await page.locator('#check-save-status').click();await page.locator('#lesson-result').waitFor({state:'visible'});
  assert.equal((await state(page)).xp,50);
  await page.locator('#retry-submission').click();await page.waitForFunction(()=>document.querySelector('#submission-recovery').hidden);
  assert.equal((await state(page)).xp,50);
  console.log('PASS interrupted submission recovery with preserved answers');
  await open(page,'/Learning/Practice?courseId=13&lessonId=1');
  await page.locator('#lesson-step-next').click();await page.locator('#lesson-questions input').first().check();
  await page.locator('#close-lesson').click();await page.locator('#leave-lesson-dialog').waitFor({state:'visible'});
  await page.locator('[data-stay-lesson]').click();assert.equal(await page.locator('#lesson-questions input').first().isChecked(),true);
  await page.locator('#close-lesson').click();await page.locator('[data-confirm-leave]').click();await page.waitForURL('**/Learning/Island?courseId=13');
  const locked=await page.goto(`${base}/Learning/Practice?courseId=13&lessonId=4`);assert.equal(locked.status(),403);
  console.log('PASS unsent-answer leave guard and locked lesson access');
  await context.close();
  for(const width of [360,768,1440]){
   const context=await browser.newContext({viewport:{width,height:width===1440?1000:900},reducedMotion:'reduce'});
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
   await open(p,'/Learning/Practice?courseId=13&lessonId=1');await p.locator('#lesson-step-next').click();
   await p.locator('#lesson-questions fieldset').first().locator('input[value="1"]').check();
   for(const theme of ['light','dark']){
    if(await p.locator('html').getAttribute('data-theme')!==theme)await p.locator('[data-theme-toggle]').click();
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await p.locator('dialog[open]').count(),0);
    assert.equal(await p.locator('.skill-buddy').count(),1);
    await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await p.screenshot({path:path.join(output,`quiz-${theme}-${width}.png`),fullPage:true});
   }
   await context.close();console.log(`PASS responsive quiz and both themes ${width}px`);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
