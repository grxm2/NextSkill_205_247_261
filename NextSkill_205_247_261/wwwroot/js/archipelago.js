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
 let dockId=null,position={x:0,y:0},active=null;
 function island(id){return route.querySelector('[data-lesson-id="'+id+'"]');}
 function destination(id){const el=island(id);if(!el)return position;const a=el.getBoundingClientRect(),b=map.getBoundingClientRect(),horizontal=!!el.closest('.underwater-strip');const inset=horizontal?Math.max(0,(a.width-420)/2):0;return {x:Math.max(0,a.left-b.left+inset-boat.offsetWidth*.35),y:a.top-b.top+a.width*(id===1?.62:.48)};}
 function place(p){position=p;boat.style.transform=`translate3d(${p.x}px,${p.y}px,0)`;}
 function vehicle(id){boat.dataset.vehicle=id===1?'boat':'submarine';}
 function select(){document.querySelectorAll('[data-buddy-home="active"]').forEach(e=>e.removeAttribute('data-buddy-home'));boat.querySelector('[data-buddy-anchor]').dataset.buddyHome='active';window.NextSkillAgent?.refresh();}
 function redraw(){
  if(active)return;
  const nodes=[...route.querySelectorAll('[data-lesson-id]')],r=route.getBoundingClientRect(),svg=route.querySelector('svg');
  if(svg){svg.setAttribute('viewBox',`0 0 ${r.width} ${route.offsetHeight}`);const pts=nodes.map(n=>{const b=n.getBoundingClientRect();return{x:b.left-r.left+b.width*.5,y:b.top-r.top+b.width*.47}});svg.querySelector('path').setAttribute('d',pts.map((p,i)=>i?`C${pts[i-1].x} ${pts[i-1].y+120},${p.x} ${p.y-120},${p.x} ${p.y}`:`M${p.x} ${p.y}`).join(' '));}
  const current=route.querySelector('.is-current')||nodes.at(-1);
  if(current&&(!dockId||!document.getElementById('lesson-dialog').open))dockId=Number(current.dataset.lessonId);
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
  if(!island(id)||island(id).disabled)return Promise.resolve();
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
 window.addEventListener('resize',()=>{if(active)finish(active);redraw();});
 reduced.addEventListener('change',()=>{if(active)finish(active);redraw();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)finish(active);});
 window.NextSkillMotion?.subscribe(state=>{boat.classList.toggle('is-motion-paused',!state.ambientAllowed);if(active&&(state.paused||state.reduced||state.hidden||state.dialogOpen))finish(active);},{element:map});
 for(const type of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(type,()=>{if(active)finish(active);},{passive:true});
 window.NextSkillArchipelago={sail};document.fonts.ready.then(redraw);redraw();
})();
