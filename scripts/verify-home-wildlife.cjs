// Read-only scenery QA: no accounts, course selections or lesson submissions.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.NEXTSKILL_TEST_URL||'http://127.0.0.1:5208';
const out=path.resolve('artifacts/home-wildlife-qa');fs.mkdirSync(out,{recursive:true});
const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const report=[],errors=[];
 try{
  for(const [width,height] of [[320,640],[390,844],[768,1024],[1024,768],[1440,900],[720,450]]){
   const context=await browser.newContext({viewport:{width,height},ignoreHTTPSErrors:true,reducedMotion:'no-preference'});
   const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/Home/Index',{waitUntil:'networkidle'});
   const wildlife=page.locator('[data-island-wildlife]');await wildlife.waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelector('[data-island-wildlife]').dataset.wildlifeMotion==='active');
   assert.equal(await page.locator('[data-island-animal]').count(),2);
   assert.equal(await page.locator('[data-island-animal="starfish"],[data-island-animal="gull"],[data-island-animal="reef"],[data-island-animal="far-reef"],.island-turtle-swim').count(),0,'No starfish, white gull, coral or swimming turtle');
   assert.equal(await page.locator('[data-ocean-bird]').count(),3,'Original silhouette flock is restored');
   assert.equal(await page.locator('#nextskill-agent').count(),1);
   await page.evaluate(()=>NextSkillMotion.setPaused(true));
   await page.waitForTimeout(50);
   const phaseChecks=await page.evaluate(()=>{
    const root=document.querySelector('[data-island-wildlife]'),animations=root.getAnimations({subtree:true}),saved=animations.map(a=>a.currentTime);
    const rect=e=>e.getBoundingClientRect().toJSON();const samples=[];
    function paintedParts(element){
     return [...element.querySelectorAll('path,ellipse,circle')].filter(part=>{
      if(part.closest('defs'))return false;
      let opacity=1;
      for(let node=part;node&&node!==root;node=node.parentElement){const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden')return false;opacity*=Number(style.opacity);}
      return opacity>.05;
     }).map(rect).filter(r=>r.width&&r.height);
    }
    function protectedShape(element){
     const r=rect(element),name=element.getAttribute('class')||element.getAttribute('fill');
     if(element.matches('.ow-island-art>path,.ow-palm path')){
      // Curved palm trunks have large empty corners in their bounding boxes.
      // Sample their filled silhouette so a wing beside the trunk is not a collision.
      const inverse=element.getScreenCTM().inverse(),parts=[],step=2;
      for(let y=r.top;y<r.bottom;y+=step)for(let x=r.left;x<r.right;x+=step){
       const point=new DOMPoint(x+step/2,y+step/2).matrixTransform(inverse);
       if(element.isPointInFill(point))parts.push({left:x,right:x+step,top:y,bottom:y+step});
      }
      return{name,r,parts};
     }
     return{name,r,parts:[r]};
    }
    const protectedScenery=[...document.querySelectorAll('.ow-shrub,.ow-island-mascot,#nextskill-agent,.ow-intro,.ns-navbar,.ocean-backdrop-buoy,.ocean-backdrop-whale-water,.ow-palm path,.ow-island-art>path[fill="url(#start-trunk)"],.ow-island-art>path[fill="#B17A3B"]')].filter(e=>getComputedStyle(e).display!=='none').map(protectedShape);
    for(let step=0;step<=24;step++){
     animations.forEach(a=>a.currentTime=Number(a.effect.getTiming().duration)*step/24);
     // The 480x280 hull SVG has substantial transparent padding above and beside it.
     // Protect the painted front/back hull plus padding, and Nimo separately.
     const boat=rect(document.querySelector('.ow-boat-art'));
     const hull={left:boat.left+boat.width*80/480,right:boat.left+boat.width*380/480,top:boat.top+boat.height*68/280,bottom:boat.top+boat.height*250/280};
     // Distant sailing boats are behind opaque island sand by design; the nearby buoy is a foreground exclusion.
     samples.push({phase:step/24,animals:[...root.querySelectorAll('[data-island-animal]')].filter(e=>getComputedStyle(e).display!=='none').map(e=>({name:e.dataset.islandAnimal,r:rect(e),parts:paintedParts(e)})),protected:protectedScenery.concat({name:'painted hull',r:hull,parts:[hull]})});
    }
    animations.forEach((a,i)=>a.currentTime=saved[i]);return samples;
   });
   const positions=name=>phaseChecks.map(sample=>sample.animals.find(animal=>animal.name===name).r);
   const walkingRange=positions('turtle').map(r=>r.left);
   assert.ok(Math.max(...walkingRange)-Math.min(...walkingRange)>3,'Turtle moves along its walking lane');
   for(const sample of phaseChecks){
    for(let i=0;i<sample.animals.length;i++){
     const a=sample.animals[i];
     for(const b of sample.animals.slice(i+1))assert.ok(!a.parts.some(pa=>b.parts.some(pb=>overlap(pa,pb))),`${width}px phase ${sample.phase}: ${a.name} overlaps ${b.name}`);
     for(const target of sample.protected)assert.ok(!a.parts.some(part=>target.parts.some(tp=>overlap(part,tp))),`${width}px phase ${sample.phase}: ${a.name} overlaps ${target.name}: `+JSON.stringify({animal:a.r,target:target.r}));
    }
   }
   const frozen=await wildlife.evaluate(e=>e.getAnimations({subtree:true}).map(a=>a.currentTime));
   await page.waitForTimeout(180);
   assert.deepEqual(await wildlife.evaluate(e=>e.getAnimations({subtree:true}).map(a=>a.currentTime)),frozen,'Pause freezes every wildlife animation');
   await page.screenshot({path:path.join(out,`home-${width}-day.png`)});
   if(width===1440)await page.locator('.ow-island-art').screenshot({path:path.join(out,'island-detail.png')});
   await page.locator('[data-theme-toggle]').click();
   await page.screenshot({path:path.join(out,`home-${width}-night.png`)});
   await page.evaluate(()=>NextSkillMotion.setPaused(false));
   await page.waitForFunction(()=>document.querySelector('[data-island-wildlife]').dataset.wildlifeMotion==='active');
   await page.evaluate(()=>document.querySelector('#journey-help-dialog').showModal());
   await page.waitForFunction(()=>document.querySelector('[data-island-wildlife]').dataset.wildlifeMotion==='paused');
   await page.evaluate(()=>document.querySelector('#journey-help-dialog').close());
   await page.waitForFunction(()=>document.querySelector('[data-island-wildlife]').dataset.wildlifeMotion==='active');
   // Move the camera to the harbor without selecting a course or arming navigation.
   await page.evaluate(()=>scrollTo(0,document.scrollingElement.scrollHeight));
   await page.waitForFunction(()=>document.querySelector('[data-island-wildlife]').dataset.wildlifeMotion==='paused');
   await page.evaluate(()=>scrollTo(0,0));
   await page.waitForFunction(()=>document.querySelector('[data-island-wildlife]').dataset.wildlifeMotion==='active');
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>document.querySelector('[data-island-wildlife]').getAnimations({subtree:true}).length===0);
   assert.equal(await wildlife.getAttribute('data-wildlife-motion'),'paused');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
   await page.screenshot({path:path.join(out,`home-${width}-reduced.png`)});
   report.push({width,height,phases:phaseChecks.length,passed:true});await context.close();
   console.log(`PASS ${width}x${height}: 25 motion phases, placement, pause/resume, dialogs, offscreen, reduced motion, themes and layout`);
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({report,errors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
