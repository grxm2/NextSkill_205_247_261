(() => {
 'use strict';
 const map=document.getElementById('lesson-map'),route=document.getElementById('lesson-route');
 if(!map||!route)return;
 const underwaterRoute=route.querySelector('.island-underwater-route');
 const compact=matchMedia('(width < 1024px), (height < 480px)');
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
 let redrawTimer,dockFrame=0;
 function prepareSurfaceArrival(){surfaceDock=true;dockId=1;vehicle(1);updateDock();select();}
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
 function destination(id){
  const art=island(id)?.querySelector('img');
  if(!art)return position;
  const a=art.getBoundingClientRect(),b=map.getBoundingClientRect();
  const shore=id===1&&window.NextSkillSeaWorld?window.NextSkillSeaWorld.surfaceShore(art)-scrollY-b.top+2:null;
  const x=a.left-b.left-boat.offsetWidth*.35;
  return {x:compact.matches&&id!==1?x:Math.max(0,x),y:shore??a.top-b.top+a.height*(id===1?.83:.64)};
 }
 function place(p){position=p;boat.style.transform=`translate3d(${p.x}px,${p.y}px,0)`;}
 function vehicle(id){boat.dataset.vehicle=id===1?'boat':'submarine';}
 function select(){document.querySelectorAll('[data-buddy-home="active"]').forEach(e=>e.removeAttribute('data-buddy-home'));boat.querySelector('[data-buddy-anchor]').dataset.buddyHome='active';window.NextSkillAgent?.refresh();}
 function updateDock(){
  dockFrame=0;
  if(active||arrival||!dockId)return;
  const next=destination(dockId);
  const outside=compact.matches&&dockId!==1&&(next.x+boat.offsetWidth<=0||next.x>=underwaterRoute.clientWidth);
  boat.classList.toggle('is-off-map-strip',outside);
  place(next);
 }
 function queueDock(){if(!dockFrame)dockFrame=requestAnimationFrame(updateDock);}
 function redraw(){
  if(active||arrival)return;
  const nodes=[...route.querySelectorAll('[data-lesson-id]')],r=route.getBoundingClientRect(),svg=route.querySelector('svg');
  if(svg&&!compact.matches){
   svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
   const points=nodes.map(node=>{
    const art=node.querySelector('img').getBoundingClientRect();
    return {x:art.left-r.left+art.width*.5,y:art.top-r.top+art.height*.63};
   });
   svg.querySelector('path').setAttribute('d',points.map((point,index)=>{
    if(!index)return `M${point.x} ${point.y}`;
    const previous=points[index-1],midpoint=(previous.y+point.y)/2;
    return `C${previous.x} ${midpoint},${point.x} ${midpoint},${point.x} ${point.y}`;
   }).join(' '));
  }
  const current=route.querySelector('.is-current')||nodes.at(-1);
  if(current&&!surfaceDock&&(!dockId||!document.getElementById('lesson-dialog').open))dockId=Number(current.dataset.lessonId);
  if(dockId){vehicle(dockId);updateDock();select();}
 }
 function queueRedraw(){
  clearTimeout(redrawTimer);
  redrawTimer=setTimeout(redraw,120);
 }
 function finish(entry,focus=false){
  if(active!==entry)return;
  active=null;cancelAnimationFrame(entry.frame);entry.jump?.cancel();
  delete boat.dataset.boarding;delete boat.dataset.voyage;vehicle(entry.id);updateDock();
  if(focus)island(entry.id)?.focus({preventScroll:true});
  entry.resolve();
 }
 function sail(id){
  finishEntry();
  const target=island(id);
  if(!target||target.disabled||target.classList.contains('is-locked'))return Promise.resolve();
  surfaceDock=false;
  if(active)finish(active);
  if(compact.matches&&id!==1){
   const stop=target.getBoundingClientRect(),track=underwaterRoute.getBoundingClientRect();
   underwaterRoute.scrollTo({left:underwaterRoute.scrollLeft+stop.left-track.left+(stop.width-track.width)/2,behavior:'instant'});
  }
  boat.classList.remove('is-off-map-strip');
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
 new ResizeObserver(queueRedraw).observe(route);
 underwaterRoute.addEventListener('scroll',queueDock,{passive:true});
 function resize(){finishEntry();if(active)finish(active);queueRedraw();}
 window.addEventListener('resize',resize,{passive:true});
 window.addEventListener('orientationchange',resize,{passive:true});
 reduced.addEventListener('change',()=>{finishEntry();if(active)finish(active);redraw();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){finishEntry();if(active)finish(active);}});
 window.NextSkillMotion?.subscribe(state=>{boat.classList.toggle('is-motion-paused',!state.ambientAllowed);if(state.paused||state.reduced||state.hidden||state.dialogOpen){finishEntry();if(active)finish(active);}},{element:map});
 for(const type of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(type,()=>{finishEntry();if(active)finish(active);},{passive:true});
 window.addEventListener('pagehide',()=>{finishEntry();clearTimeout(redrawTimer);cancelAnimationFrame(dockFrame);dockFrame=0;});
 window.NextSkillArchipelago={sail,arriveFromLeft,prepareSurfaceArrival,finishArrival:finishEntry};document.fonts.ready.then(redraw);redraw();
})();
