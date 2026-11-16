// Read-only Home effects checks: real entrance and camera movement, no selections.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.NEXTSKILL_TEST_URL||'http://127.0.0.1:5208';
const output=path.resolve('artifacts/boat-wake-qa');fs.mkdirSync(output,{recursive:true});
const state=p=>p.evaluate(()=>NextSkillHomeWaterTest.snapshot());
const foam=p=>p.evaluate(()=>{
 const c=document.querySelector('.ow-water-foam'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 let painted=0,hash=0;for(let i=3;i<data.length;i+=4){if(data[i]>3)painted++;hash=(Math.imul(hash,31)+data[i])|0;}
 return {painted,hash};
});
async function sampleUntil(page,predicate,label,attempts=100){
 for(let i=0;i<attempts;i++){const value=await state(page);if(predicate(value))return value;await page.waitForTimeout(80);}
 throw Error(label+': '+JSON.stringify(await state(page)));
}
async function scroll(page,fraction){await page.evaluate(fraction=>{const t=ScrollTrigger.getById('ocean-master');scrollTo(0,t.start+(t.end-t.start)*fraction);},fraction);}
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const report=[],errors=[];
 try{
  for(const [width,height] of [[1440,900],[390,844],[768,1024],[1024,768],[320,640],[720,450]]){
   const context=await b.newContext({viewport:{width,height}}),page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/Home/Index',{waitUntil:'networkidle'});
   const moving=await sampleUntil(page,s=>s.wake.strength>.1&&s.wake.active>3,'Entrance produces a wake');
   assert.ok(moving.wake.speed>12&&moving.wake.dx>.8);
   let paint;
   for(let i=0;i<40;i++){paint=await foam(page);if(paint.painted>100)break;await page.waitForTimeout(80);}
   assert.ok(paint.painted>100,'Foam is visibly rendered in the water');
   assert.ok(moving.wake.active<=moving.wake.capacity&&moving.wake.capacity===48);
   await page.screenshot({path:path.join(output,`moving-${width}.png`)});
   await page.evaluate(()=>NextSkillMotion.setPaused(true));
   const frozen=await state(page),frozenFoam=await foam(page);await page.waitForTimeout(250);
   assert.equal((await state(page)).seconds,frozen.seconds);assert.deepEqual(await foam(page),frozenFoam);
   await page.evaluate(()=>NextSkillMotion.setPaused(false));
   await page.waitForTimeout(3800);const rest=await state(page);
   assert.ok(rest.wake.strength<.05,'Idle bobbing does not produce a cruising wake');
   assert.equal(rest.wake.active,0,'Old foam dissipates after the boat stops');
   const emitted=rest.wake.emitted;await page.waitForTimeout(300);assert.equal((await state(page)).wake.emitted,emitted);
   await scroll(page,.34);
   const outbound=await sampleUntil(page,s=>s.wake.dx>.6&&s.wake.strength>.15&&s.wake.emitted>emitted,'Travel reacts to camera-relative boat speed');
   await page.screenshot({path:path.join(output,`sailing-${width}.png`)});
   await scroll(page,.08);
   const reverse=await sampleUntil(page,s=>s.wake.dx<-.6&&s.wake.strength>.1,'Reversing travel reverses the wake');
   assert.ok(reverse.wake.active<=48);
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
   assert.equal((await state(page)).wake.active,0);assert.equal((await state(page)).running,false);
   assert.equal(await page.locator('.ow-water-foam').isVisible(),false);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   report.push({width,height,entrySpeed:moving.wake.speed,foamPixels:paint.painted,outboundSpeed:outbound.wake.speed,reverseDirection:reverse.wake.dx,passed:true});
   console.log('PASS entry wake, visible foam, pause, settling, sea travel, reversal and reduced motion '+width+'px');
   await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({report,errors},null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
