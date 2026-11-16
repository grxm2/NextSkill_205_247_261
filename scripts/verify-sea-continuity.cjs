// Local Development previews only; real selection, no lesson submissions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const base=process.env.NEXTSKILL_TEST_URL||'http://127.0.0.1:5206';
const out=path.resolve('artifacts/sea-continuity-qa');fs.mkdirSync(out,{recursive:true});
const geometry=()=>({sea:NextSkillSeaWorld.snapshot(),surface:getComputedStyle(document.querySelector('.underwater-surface')).backgroundImage,wave:getComputedStyle(document.querySelector('.surface-ocean-wave')).backgroundImage,boat:(()=>{const r=document.querySelector('.course-voyage-stage .catalog-boat,.archipelago-boat,.catalog-boat').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})(),horizon:document.querySelector('.surface-ocean-waves').getBoundingClientRect().top});
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const checks=[],errors=[];
try{
 for(const [width,height] of [[1440,900],[390,844],[720,450]]){
  const c=await b.newContext({viewport:{width,height},...(width===1440?{recordVideo:{dir:path.join(out,'recordings'),size:{width:1280,height:800}}}:{})});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/Home/Courses',{waitUntil:'networkidle'});
  const before=await p.evaluate(async()=> (await fetch('/Learning/State')).json());
  await p.waitForTimeout(250);await p.screenshot({path:path.join(out,'catalog-final-'+width+'.png')});
  await p.locator('[data-course-start]').first().click();
  await p.locator('.course-voyage-stage').waitFor();
  const departure=await p.evaluate(geometry);
  const points=[];for(let i=0;i<4;i++){points.push(await p.evaluate(geometry));await p.waitForTimeout(200);}
  assert.ok(points.at(-1).boat.x>points[0].boat.x+10,'Boat moves to the right');
  assert.ok(points.every(v=>Math.abs(v.boat.y-departure.boat.y)<.5),'Departure is a straight horizontal line');
  assert.ok(departure.boat.y+departure.boat.h<height-32,'Sailing lane fits the viewport');
  assert.ok(Math.abs(departure.boat.y-departure.horizon-2)<1,'Boat is anchored to the waterline');
  assert.equal(await p.locator('.course-voyage-water').count(),0,'No different sea is painted over the shared ocean');
  await p.screenshot({path:path.join(out,'sailing-'+width+'.png')});
  await p.waitForURL('**/Learning/Island?courseId=*');
  await p.waitForFunction(()=>document.querySelector('#lesson-map').classList.contains('has-boat-arrival'));
  const entry=await p.evaluate(geometry);
  assert.equal(entry.surface,departure.surface);assert.equal(entry.wave,departure.wave);
  assert.ok(Math.abs(entry.horizon-departure.horizon)<1,'Horizon is continuous between documents: '+JSON.stringify({departure,entry}));
  assert.ok(Math.abs(entry.boat.y-departure.boat.y)<1,'Vessel stays at the same screen height');
  assert.ok(Math.abs(entry.boat.w-departure.boat.w)<.1,'Vessel keeps the same scale');
  const move=p.locator('.map-vessel-bob');
  const first=await move.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y}});
  await p.waitForTimeout(600);
  const second=await move.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y}});
  assert.ok(first.x<0&&second.x>first.x);assert.ok(Math.abs(second.y-first.y)<.5,'Arrival also moves horizontally: '+JSON.stringify({first,second,departure,entry}));
  await p.screenshot({path:path.join(out,'arriving-'+width+'.png')});
  await p.waitForFunction(()=>!document.querySelector('#lesson-map').classList.contains('has-boat-arrival'));
  await p.waitForTimeout(350);
  const after=await p.evaluate(async()=> (await fetch('/Learning/State')).json());
  assert.equal(after.xp,before.xp);assert.deepEqual(after.courses[0].completedLessons,before.courses[0].completedLessons);
  assert.equal(await p.locator('#nextskill-agent').count(),1);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:path.join(out,'island-final-'+width+'.png')});
  checks.push({width,height,departure,entry,passed:true});console.log('PASS shared horizon, vessel scale and horizontal travel at '+width+'x'+height);
  if(width===1440)await p.waitForTimeout(900);
  await c.close();
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors},null,2));
}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
