(() => {
 const map=document.getElementById('lesson-map'),route=document.getElementById('lesson-route');if(!map||!route)return;
 const scenery=document.createElement('div');scenery.className='archipelago-scenery';scenery.setAttribute('aria-hidden','true');scenery.innerHTML='<img class="scene-reef reef-one" src="/images/journey/reef-garden.svg" alt=""/><img class="scene-reef reef-two" src="/images/journey/reef-garden.svg" alt=""/><img class="scene-buoy buoy-one" src="/images/journey/sea-buoy.svg" alt=""/><img class="scene-buoy buoy-two" src="/images/journey/sea-buoy.svg" alt=""/><img class="scene-birds" src="/images/journey/sea-birds.svg" alt=""/><img class="scene-far-island" src="/images/journey/rocky-island.svg" alt=""/>';map.prepend(scenery);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const boat=document.createElement('div');boat.className='archipelago-boat';boat.innerHTML='<span class="voyage-seat sj-mascot-anchor buddy-slot" data-buddy-anchor="map"></span><img class="voyage-hull" src="/images/journey/rowing-hull.svg" alt=""/><img class="voyage-oar" src="/images/journey/rowing-oar.svg" alt=""/>';map.append(boat);
 let dockId=null,position={x:0,y:0},frame,finish;
 function island(id){return route.querySelector('[data-lesson-id="'+id+'"]');}
 function destination(id){const el=island(id);if(!el)return position;const a=el.getBoundingClientRect(),b=map.getBoundingClientRect();return {x:Math.max(0,a.left-b.left-boat.offsetWidth*.35),y:a.top-b.top+a.width*.47};}
 function place(p){position=p;boat.style.transform=`translate3d(${p.x}px,${p.y}px,0)`;}
 function select(){document.querySelectorAll('[data-buddy-home="active"]').forEach(e=>e.removeAttribute('data-buddy-home'));boat.querySelector('[data-buddy-anchor]').dataset.buddyHome='active';window.NextSkillAgent?.refresh();}
 function redraw(){
  if(frame)return;
  const nodes=[...route.querySelectorAll('[data-lesson-id]')],r=route.getBoundingClientRect(),svg=route.querySelector('svg');
  if(svg){svg.setAttribute('viewBox',`0 0 ${r.width} ${route.offsetHeight}`);const pts=nodes.map(n=>{const b=n.getBoundingClientRect();return{x:b.left-r.left+b.width*.5,y:b.top-r.top+b.width*.47}});svg.querySelector('path').setAttribute('d',pts.map((p,i)=>i?`C${pts[i-1].x} ${pts[i-1].y+120},${p.x} ${p.y-120},${p.x} ${p.y}`:`M${p.x} ${p.y}`).join(' '));}
  const current=route.querySelector('.is-current')||nodes.at(-1);
  if(current && (!dockId||!document.getElementById('lesson-dialog').open))dockId=Number(current.dataset.lessonId);
  if(dockId){place(destination(dockId));select();}
 }
 function sail(id){
  if(!island(id)||island(id).disabled)return Promise.resolve();
  finish?.();const from={...position},to=destination(id);dockId=id;select();
  if(reduced.matches || document.querySelector('.map-guide')?.dataset.motion!=='active'){place(to);island(id).scrollIntoView({block:'center',behavior:'instant'});return Promise.resolve();}
  boat.dataset.voyage='rowing';window.NextSkillBuddyMotion?.stop(document.querySelector('.skill-buddy'));
  return new Promise(resolve=>{const start=performance.now();finish=()=>{cancelAnimationFrame(frame);frame=null;place(to);delete boat.dataset.voyage;finish=null;island(id)?.focus({preventScroll:true});resolve();};function tick(now){const t=Math.min(1,(now-start)/1800),e=t*t*(3-2*t);place({x:from.x+(to.x-from.x)*e+Math.sin(Math.PI*e)*35,y:from.y+(to.y-from.y)*e});window.scrollTo({top:map.getBoundingClientRect().top+scrollY+position.y-innerHeight*.5,behavior:'instant'});if(t<1)frame=requestAnimationFrame(tick);else finish();}frame=requestAnimationFrame(tick);});
 }
 new MutationObserver(()=>requestAnimationFrame(redraw)).observe(route,{childList:true});
 window.addEventListener('resize',()=>{finish?.();redraw();});reduced.addEventListener('change',()=>{finish?.();redraw();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finish?.();});
 window.NextSkillArchipelago={sail};document.fonts.ready.then(redraw);redraw();
})();
