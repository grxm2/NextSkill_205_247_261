// Read-only GPU scenery QA. No account, course-selection or progress mutations.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.NEXTSKILL_TEST_URL||'http://127.0.0.1:5208';
const output=path.resolve('artifacts/live-water-qa');fs.mkdirSync(output,{recursive:true});
const snapshot=page=>page.evaluate(()=>NextSkillHomeWaterTest.snapshot());
const pixels=page=>page.evaluate(()=>NextSkillHomeWaterTest.pixels());
async function until(page,predicate,label){
 for(let i=0;i<60;i++){const state=await snapshot(page);if(predicate(state))return state;await page.waitForTimeout(100);}
 throw Error(label+': '+JSON.stringify(await snapshot(page)));
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const report=[],errors=[];
 try{
  for(const [width,height] of [[1440,900],[390,844],[768,1024],[1024,768],[320,640],[720,450]]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'}),page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/Home/Index',{waitUntil:'networkidle'});
   await until(page,s=>s.renderer==='webgl'&&s.running,'GPU surface starts');
   const before=await pixels(page);await page.waitForTimeout(900);const after=await pixels(page);
   assert.equal(before.length,80);
   const changed=after.filter((v,i)=>i%4!==3&&Math.abs(v-before[i])>3).length;
   assert.ok(changed>12,`${width}px: local surface pixels visibly change (${changed})`);
   assert.ok(after.filter((v,i)=>i%4===3).every(v=>v===255),'Surface has no transparent gaps');
   assert.equal(await page.locator('.ow-water-surface').evaluate(e=>getComputedStyle(e).transform),'none','Motion comes from the water surface, not translating the image');
   await page.evaluate(()=>NextSkillMotion.setPaused(true));
   const frozen=await snapshot(page),frozenPixels=await pixels(page);await page.waitForTimeout(250);
   assert.equal((await snapshot(page)).seconds,frozen.seconds);assert.deepEqual(await pixels(page),frozenPixels);
   await page.screenshot({path:path.join(output,`home-${width}-day.png`)});
   await page.locator('[data-theme-toggle]').click();
   await page.screenshot({path:path.join(output,`home-${width}-night.png`)});
   await page.evaluate(()=>NextSkillMotion.setPaused(false));
   await until(page,s=>s.running&&s.seconds>frozen.seconds+.15,'Resume continues its phase');
   await page.evaluate(()=>document.querySelector('#journey-help-dialog').showModal());
   await until(page,s=>!s.running,'Dialog pauses water');
   await page.evaluate(()=>document.querySelector('#journey-help-dialog').close());
   await until(page,s=>s.running,'Closing dialog resumes water');
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
   await until(page,s=>!s.running,'Hidden tab stops GPU loop');
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
   await until(page,s=>s.running,'Visible tab resumes GPU loop');
   await page.emulateMedia({reducedMotion:'reduce'});
   await until(page,s=>s.renderer==='static'&&!s.running,'Reduced motion uses static artwork');
   assert.equal(await page.locator('.ow-water-surface').evaluate(e=>getComputedStyle(e).opacity),'1');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.equal(await page.locator('#nextskill-agent').count(),1);
   report.push({width,height,changedChannels:changed,passed:true});console.log('PASS local water deformation, pause/resume, dialogs, lifecycle, themes and reduced motion '+width+'px');
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};});
  const fallback=await context.newPage();await fallback.goto(base+'/Home/Index',{waitUntil:'networkidle'});
  assert.equal(await fallback.locator('.ow-water-detail').getAttribute('data-water-renderer'),'static');
  assert.equal(await fallback.locator('.ow-water-surface').evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.equal(await fallback.locator('.ow-water-live').isVisible(),false);
  console.log('PASS GPU unavailable keeps the complete static sea');await context.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({report,errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
