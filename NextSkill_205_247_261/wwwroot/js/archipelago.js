(() => {
 'use strict';
 const map=document.getElementById('lesson-map'),route=document.getElementById('lesson-route');
 if(!map||!route)return;
 const scenery=document.createElement('div');
 scenery.className='archipelago-scenery';scenery.setAttribute('aria-hidden','true');
 scenery.innerHTML='<img class="scene-reef reef-one" src="/images/journey/reef-garden.svg" alt=""/><img class="scene-reef reef-two" src="/images/journey/reef-garden.svg" alt=""/><img class="scene-buoy buoy-one" src="/images/journey/sea-buoy.svg" alt=""/><img class="scene-buoy buoy-two" src="/images/journey/sea-buoy.svg" alt=""/><img class="scene-birds" src="/images/journey/sea-birds.svg" alt=""/><img class="scene-far-island" src="/images/journey/rocky-island.svg" alt=""/>';
 map.prepend(scenery);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const boat=document.createElement('div');boat.className='archipelago-boat';
 boat.dataset.vehicle='boat';
 boat.innerHTML='<div class="map-vessel-bob"><span class="voyage-seat sj-mascot-anchor buddy-slot" data-buddy-anchor="map"></span><img class="voyage-hull" src="/images/journey/rowing-hull.svg" alt=""/><img class="voyage-oar" src="/images/journey/rowing-oar.svg" alt=""/><img class="voyage-submarine" src="/images/journey/nimo-submarine-v1.png" alt=""/><span class="submarine-bubbles" aria-hidden="true"><i></i><i></i><i></i></span></div>';
 map.append(boat);
 let dockId=null,position={x:0,y:0},active=null,arrival=null,surfaceDock=false;
 function prepareSurfaceArrival(){surfaceDock=true;dockId=1;vehicle(1);place(destination(1));select();}
 function finishEntry(){
  if(!arrival)return;const entry=arrival;arrival=null;entry.animation.cancel();
  delete boat.dataset.voyage;map.classList.remove('has-boat-arrival');entry.resolve();
 }
 function arriveFromLeft(){
  finishEntry();prepareSurfaceArrival();
  const policy=window.NextSkillMotion?.snapshot({element:map,kind:'reaction'});
  if(reduced.matches||policy?.paused||policy?.hidden||!dockId)return Promise.resolve();
  const rect=boat.getBoundingClientRect(),motion=boat.querySelector('.map-vessel-bob');
  boat.dataset.voyage=boat.dataset.vehicle==='boat'?'rowing':'diving';map.classList.add('has-boat-arrival');
  return new Promise(resolve=>{
   const animation=motion.animate([{transform:`translate3d(${-rect.right-32}px,0,0)`},{transform:'translate3d(-12px,0,0)',offset:.83},{transform:'translate3d(0,0,0)'}],{duration:1800,easing:'cubic-bezier(.77,0,.175,1)',fill:'both'});
   arrival={animation,resolve};animation.finished.then(finishEntry).catch(()=>{});
  });
 }
 function island(id){return route.querySelector('[data-lesson-id="'+id+'"]');}
 function destination(id){const el=island(id);if(!el)return position;const a=el.getBoundingClientRect(),b=map.getBoundingClientRect(),horizontal=!!el.closest('.underwater-strip');const inset=horizontal?Math.max(0,(a.width-420)/2):0;const art=el.querySelector('img');const shore=id===1&&art&&window.NextSkillSeaWorld?window.NextSkillSeaWorld.surfaceShore(art)-scrollY-b.top+2:null;return {x:Math.max(0,a.left-b.left+inset-boat.offsetWidth*.35),y:shore??a.top-b.top+a.width*(id===1?.62:.48)};}
 function place(p){position=p;boat.style.transform=`translate3d(${p.x}px,${p.y}px,0)`;}
 function vehicle(id){boat.dataset.vehicle=id===1?'boat':'submarine';}
 function select(){document.querySelectorAll('[data-buddy-home="active"]').forEach(e=>e.removeAttribute('data-buddy-home'));boat.querySelector('[data-buddy-anchor]').dataset.buddyHome='active';window.NextSkillAgent?.refresh();}
 function redraw(){
  if(active||arrival)return;
  const nodes=[...route.querySelectorAll('[data-lesson-id]')],r=route.getBoundingClientRect(),svg=route.querySelector('svg');
  if(svg){svg.setAttribute('viewBox',`0 0 ${r.width} ${route.offsetHeight}`);const pts=nodes.map(n=>{const b=n.getBoundingClientRect();return{x:b.left-r.left+b.width*.5,y:b.top-r.top+b.width*.47}});svg.querySelector('path').setAttribute('d',pts.map((p,i)=>i?`C${pts[i-1].x} ${pts[i-1].y+120},${p.x} ${p.y-120},${p.x} ${p.y}`:`M${p.x} ${p.y}`).join(' '));}
  const current=route.querySelector('.is-current')||nodes.at(-1);
  if(current&&!surfaceDock&&(!dockId||!document.getElementById('lesson-dialog').open))dockId=Number(current.dataset.lessonId);
  if(dockId){vehicle(dockId);place(destination(dockId));select();}
 }
 function finish(entry,focus=false){
  if(active!==entry)return;
  active=null;cancelAnimationFrame(entry.frame);entry.jump?.cancel();
  delete boat.dataset.boarding;delete boat.dataset.voyage;vehicle(entry.id);place(destination(entry.id));
  if(focus)island(entry.id)?.focus({preventScroll:true});
  entry.resolve();
 }
 function sail(id){
  finishEntry();
  const target=island(id);
  if(!target||target.disabled||target.classList.contains('is-locked'))return Promise.resolve();
  surfaceDock=false;
  if(active)finish(active);
  const fromId=dockId,from={...position},to=destination(id);dockId=id;select();
  if(reduced.matches||document.querySelector('.map-guide')?.dataset.motion!=='active'){
   vehicle(id);place(to);island(id).scrollIntoView({block:'center',behavior:'instant'});return Promise.resolve();
  }
  window.NextSkillBuddyMotion?.stop(document.querySelector('.skill-buddy'));
  return new Promise(resolve=>{
   const entry={id,resolve,frame:0,jump:null};active=entry;
   function travel(startPoint){
    if(active!==entry)return;
    vehicle(id);delete boat.dataset.boarding;boat.dataset.voyage=id===1?'rowing':'diving';
    const start=performance.now(),mapTop=map.getBoundingClientRect().top+scrollY;
    function tick(now){
     if(active!==entry)return;
     const t=Math.min(1,(now-start)/2200),e=t*t*(3-2*t);
     place({x:startPoint.x+(to.x-startPoint.x)*e+Math.sin(Math.PI*e)*22,y:startPoint.y+(to.y-startPoint.y)*e});
     window.scrollTo({top:mapTop+position.y-innerHeight*.5,behavior:'instant'});
     if(t<1)entry.frame=requestAnimationFrame(tick);else finish(entry,true);
    }
    entry.frame=requestAnimationFrame(tick);
   }
   if(fromId===1&&id>1){
    // Show both vessels while the singleton mascot jumps into the open hatch.
    boat.dataset.boarding='true';
    const buddy=boat.querySelector('.skill-buddy'),offset=boat.offsetWidth*.58;
    if(!buddy||!buddy.animate){travel(from);return;}
    entry.jump=buddy.animate([{transform:'translate3d(0,0,0) rotate(0deg)'},{transform:`translate3d(${offset*.5}px,-48px,0) rotate(-6deg)`,offset:.45},{transform:`translate3d(${offset}px,0,0) rotate(0deg)`}],{duration:950,easing:'cubic-bezier(.37,0,.63,1)',fill:'forwards'});
    entry.jump.finished.then(()=>{
     if(active!==entry)return;
     const boarded={x:from.x+offset,y:from.y};place(boarded);vehicle(id);delete boat.dataset.boarding;entry.jump.cancel();entry.jump=null;travel(boarded);
    }).catch(()=>{});
   }else travel(from);
  });
 }
 new MutationObserver(()=>requestAnimationFrame(redraw)).observe(route,{childList:true});
 window.addEventListener('resize',()=>{finishEntry();if(active)finish(active);redraw();});
 reduced.addEventListener('change',()=>{finishEntry();if(active)finish(active);redraw();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){finishEntry();if(active)finish(active);}});
 window.NextSkillMotion?.subscribe(state=>{boat.classList.toggle('is-motion-paused',!state.ambientAllowed);if(state.paused||state.reduced||state.hidden||state.dialogOpen){finishEntry();if(active)finish(active);}},{element:map});
 for(const type of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(type,()=>{finishEntry();if(active)finish(active);},{passive:true});
 window.addEventListener('pagehide',finishEntry);
 window.NextSkillArchipelago={sail,arriveFromLeft,prepareSurfaceArrival,finishArrival:finishEntry};document.fonts.ready.then(redraw);redraw();
})();
