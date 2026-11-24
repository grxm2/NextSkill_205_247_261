// Fresh signed development preview identities only: selection, no lesson submissions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('playwright-core'));}
const base=process.env.NEXTSKILL_TEST_URL||'http://127.0.0.1:5205';
const out=path.resolve('artifacts/course-island-qa');fs.mkdirSync(out,{recursive:true});
async function openDetails(page){
 await page.goto(base+'/Home/Courses',{waitUntil:'domcontentloaded'});
 await page.getByRole('link',{name:/^เลือกคอร์สนี้/}).first().click();
 await page.waitForURL('**/Home/Details/**');
 return page.locator('[data-course-start]');
}
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const checks=[],errors=[];
 const c=await b.newContext({viewport:{width:1440,height:900},recordVideo:{dir:path.join(out,'recordings'),size:{width:1280,height:800}}});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 try{
  const start=await openDetails(p),id=Number(await start.getAttribute('data-course-id'));
  const before=await p.evaluate(async()=>{const r=await fetch('/Learning/State');if(!r.ok)throw Error('Real learning state unavailable: '+r.status);return r.json()});
  assert.ok(Array.isArray(before.courses));
  await p.getByRole('link',{name:'ลงทะเบียนและเริ่มเรียน'}).waitFor();
  let posts=0;p.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/Learning/SelectCourse')posts++});
  const catalogReturn=p.waitForURL('**/Home/Courses',{waitUntil:'domcontentloaded'});
  await start.evaluate(link=>{link.click();link.click();});
  await catalogReturn;
  await p.locator('.catalog-boat[data-voyage="rowing"] #nextskill-agent').waitFor({state:'attached'});
  await p.waitForURL('**/Learning/Island?courseId='+id);
  await p.waitForFunction(()=>document.querySelector('#lesson-map')?.classList.contains('has-boat-arrival'));
  const vessel=p.locator('.archipelago-boat .map-vessel-bob');
  const inbound=await vessel.evaluate(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));
  assert.ok(inbound.left<0&&inbound.right<100,'The map vessel enters at the screen left edge');
  await p.locator('.archipelago-boat[data-voyage="rowing"] #nextskill-agent').waitFor({state:'attached'});
  await p.waitForFunction(left=>document.querySelector('.map-vessel-bob').getBoundingClientRect().left>left+100,inbound.left);
  await p.screenshot({path:path.join(out,'island-entering-left.png')});
  await p.waitForFunction(()=>!document.querySelector('#lesson-map').classList.contains('has-boat-arrival'));
  assert.equal(posts,1,'Duplicate selection must not produce duplicate writes');assert.equal(await p.locator('#nextskill-agent').count(),1);
  const after=await p.evaluate(async()=> (await fetch('/Learning/State')).json());
  assert.equal(after.activeCourseId,id);assert.equal(after.xp,before.xp);
  assert.deepEqual(after.courses.find(x=>x.courseId===id).completedLessons,before.courses.find(x=>x.courseId===id).completedLessons);
  assert.equal(await p.locator('#journey-cloud-transition').evaluate(e=>e.open),false);
  assert.equal(await p.evaluate(()=>sessionStorage.getItem('nextskill.journey-arrival')),null);
  await p.screenshot({path:path.join(out,'island-arrived.png')});
  checks.push('First start posts once, returns to the catalog for Nimo’s departure, and preserves XP and completions');
  await p.goBack({waitUntil:'networkidle'});
  assert.match(new URL(p.url()).pathname,/^\/Home\/Courses\/?$/);
  assert.equal(await p.locator('.catalog-boat[data-voyage="rowing"], #journey-cloud-transition[open]').count(),0);
  await p.goBack({waitUntil:'networkidle'});
  const resume=p.locator(`[data-course-start][data-course-id="${id}"]`);
  assert.match(await resume.innerText(),/เรียนต่อจากเกาะเดิม/);
  assert.equal(await p.locator('[inert]').count(),0);
  await resume.focus();await p.keyboard.press('Enter');
  await p.waitForURL('**/Learning/Island?courseId='+id);
  await p.waitForFunction(()=>document.querySelector('#lesson-map')?.classList.contains('has-boat-arrival'));
  await p.waitForFunction(()=>!document.querySelector('#journey-cloud-transition').open&&!document.querySelector('#lesson-map').classList.contains('has-boat-arrival'));
  const resumed=await p.evaluate(async()=>(await fetch('/Learning/State')).json());
  assert.equal(resumed.activeCourseId,id);assert.equal(resumed.xp,after.xp);
  assert.deepEqual(resumed.courses.find(x=>x.courseId===id).completedLessons,after.courses.find(x=>x.courseId===id).completedLessons);
  await p.reload({waitUntil:'networkidle'});
  assert.equal(await p.locator('#lesson-map.has-boat-arrival, #journey-cloud-transition[open]').count(),0);
  checks.push('Back restores controls; keyboard resume replays the arrival once and preserves progress');
  await c.close();
  const c2=await b.newContext({viewport:{width:390,height:844}}),q=await c2.newPage();q.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,390,768,1024,1440]){
   await q.setViewportSize({width,height:width<500?844:900});await q.goto(base+'/Home/Courses',{waitUntil:'networkidle'});
   assert.ok(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.equal(await q.locator('.catalog-hero-copy .catalog-tools').count(),1);assert.ok(await q.locator('.catalog-card-choice').count()>0);
   await q.screenshot({path:path.join(out,`catalog-${width}.png`)});
  }
  checks.push('Catalog and controls fit 320,390,768,1024,1440px');
  await openDetails(q);
  await q.route('**/Learning/SelectCourse',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'ทดสอบการเชื่อมต่อไม่สำเร็จ'})}));
  await q.locator('[data-course-start]').click();
  await q.locator('[data-catalog-status]').filter({hasText:'ทดสอบการเชื่อมต่อไม่สำเร็จ'}).waitFor();
  assert.match(new URL(q.url()).pathname,/^\/Home\/Details\//);
  assert.equal(await q.locator('[data-course-start]').getAttribute('aria-busy'),null);
  assert.equal(await q.evaluate(()=>sessionStorage.getItem('nextskill.journey-arrival')),null);
  await q.unroute('**/Learning/SelectCourse');
  checks.push('Failed selection stays on details with the start control ready to retry');
  await q.emulateMedia({reducedMotion:'reduce'});
  await (await openDetails(q)).click();await q.waitForURL('**/Learning/Island?courseId=*');
  await q.waitForFunction(()=>!document.querySelector('#journey-cloud-transition').open);
  assert.equal(await q.locator('#lesson-map').evaluate(e=>e.classList.contains('has-boat-arrival')),false);
  checks.push('Reduced motion settles on the selected island without positional animation');
  await q.emulateMedia({reducedMotion:'no-preference'});await q.setViewportSize({width:390,height:844});
  await (await openDetails(q)).click();
  await q.waitForURL('**/Learning/Island?courseId=*');
  await q.waitForFunction(()=>document.querySelector('#lesson-map').classList.contains('has-boat-arrival'));
  await q.waitForFunction(()=>{
   const vessel=document.querySelector('.archipelago-boat[data-voyage="rowing"] .map-vessel-bob');
   if(!vessel?.querySelector('#nextskill-agent'))return false;
   const {right,width,top,bottom}=vessel.getBoundingClientRect();
   return right>width*.6&&top<innerHeight&&bottom>0;
  });
  await q.screenshot({path:path.join(out,'island-entering-left-390.png')});
  await q.waitForFunction(()=>!document.querySelector('#lesson-map').classList.contains('has-boat-arrival'));
  assert.ok(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  checks.push('Mobile real selection and left-edge arrival finish without overflow or duplicate mascot');
  assert.deepEqual(errors,[]);await c2.close();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors,selectionScope:'Fresh development previews only; no lesson submissions or XP writes'},null,2));
  checks.forEach(x=>console.log('PASS '+x));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
