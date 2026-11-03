(() => {
 'use strict';
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const scene=document.querySelector('.ow-scene');
 const shore=document.querySelector('.ow-island-mascot');
 const seat=document.querySelector('.ow-boat-anchor');
 let boarded=false, boarding, jump, jumpSlot, flight, arrivalBoat, generation=0;
 const allowed=()=>!reduce.matches && window.NextSkillAgent?.motionAllowed();
 const sceneAllowed=()=>{
  const state=window.NextSkillMotion?.snapshot({element:scene,kind:'reaction'});
  return state ? state.reactionAllowed : !reduce.matches && !document.hidden && !window.NextSkillAgent?.isPaused();
 };
 function select(slot){
  document.querySelectorAll('[data-buddy-home="active"]').forEach(el=>el.removeAttribute('data-buddy-home'));
  slot.dataset.buddyHome='active';window.NextSkillAgent?.refresh();
 }
 function row(host){
  host.dataset.voyage='rowing';
  const robot=document.querySelector('.skill-buddy');
  window.NextSkillBuddyMotion?.stop(robot);
 }
 function cancelJump(settle=false){
  const previous=jump;jump=null;previous?.cancel();
  if(previous && settle && shore && seat)select(boarded ? seat : shore);
 }
 function transfer(target,pose){
  const agent=document.getElementById('nextskill-agent');
  // Capture the actual in-flight position before retargeting on a reversal.
  const from=agent && !agent.hidden ? agent.getBoundingClientRect() : null;
  // The boat or shore can momentarily be outside the viewport while the
  // camera is moving. Gate the jump on the scene, not the sprite's old bounds.
  const canAnimate=!!(scene && agent && from && from.width && from.height && sceneAllowed() && !document.querySelector('dialog[open]'));
  cancelJump();
  if(!canAnimate){select(target);return null;}
  if(!jumpSlot){
   jumpSlot=document.createElement('span');
   jumpSlot.className='ow-jump-anchor sj-mascot-anchor buddy-slot';
   jumpSlot.dataset.buddyAnchor='in-flight';
   scene.append(jumpSlot);
  }
  const sceneRect=scene.getBoundingClientRect(),to=target.getBoundingClientRect();
  const startX=from.left-sceneRect.left,startY=from.top-sceneRect.top;
  const arc=Math.min(96,Math.max(44,Math.hypot(from.left-to.left,from.top-to.top)*.28));
  jumpSlot.style.width=`${target.clientWidth}px`;jumpSlot.style.height=`${target.clientHeight}px`;
  jumpSlot.style.transform=`translate3d(${startX}px,${startY}px,0)`;
  select(jumpSlot);
  if(agent.parentElement!==jumpSlot){select(target);return null;}
  window.NextSkillBuddyMotion?.play(pose);
  let frame=0,startTime,resolve;
  const finished=new Promise(done=>{resolve=done;});
  const active={finished,cancel(){cancelAnimationFrame(frame);resolve(false);}};
  jump=active;
  function step(now){
   if(jump!==active)return;
   if(startTime===undefined)startTime=now;
   const t=Math.min(1,(now-startTime)/760),ease=t*t*(3-2*t);
   // Track the landing point as the user scrolls or reverses direction.
   const box=target.getBoundingClientRect(),sceneBox=scene.getBoundingClientRect();
   const x=startX+(box.left-sceneBox.left-startX)*ease;
   const y=startY+(box.top-sceneBox.top-startY)*ease-Math.sin(Math.PI*t)*arc;
   jumpSlot.style.transform=`translate3d(${x}px,${y}px,0)`;
   if(t<1){frame=requestAnimationFrame(step);return;}
   jump=null;select(target);resolve(true);
  }
  frame=requestAnimationFrame(step);
  return active;
 }
 async function board(){
  if(boarding)return boarding;
  if(boarded || !shore || !seat)return;
  boarded=true;
  const run=++generation;
  boarding=(async()=>{
   scene.dataset.voyage='boarding';
   const animation=transfer(seat,'jump');
   if(animation)await animation.finished.catch(()=>{});
   if(run!==generation || !boarded)return false;
   if(jump===animation)jump=null;
   if(scene.dataset.voyage!=='docked')row(scene);
   if(allowed())window.NextSkillBuddyMotion?.play('land');
   return true;
  })();
  const current=boarding;
  current.finally(()=>{if(boarding===current)boarding=null;});
  return current;
 }
 function returnToShore(){
  if(!shore || !boarded)return;
  const run=++generation;boarding=null;boarded=false;
  scene.dataset.voyage='shore';
  const animation=transfer(shore,'lift');
  if(animation)animation.finished.then(()=>{
   if(run!==generation || boarded)return;
   if(jump===animation)jump=null;
   if(allowed())window.NextSkillBuddyMotion?.play('land');
  }).catch(()=>{});
 }
 function markup(){return '<span class="voyage-seat sj-mascot-anchor buddy-slot" data-buddy-anchor="sailing"></span><img class="voyage-hull" src="/images/journey/rowing-hull.svg" alt=""/><img class="voyage-oar" src="/images/journey/rowing-oar.svg" alt=""/>';}
 function cloudBoat(cloud){
  if(!allowed())return;
  let boat=cloud.querySelector('.voyage-cloud-boat');
  if(!boat){boat=document.createElement('div');boat.className='voyage-cloud-boat';boat.innerHTML=markup();cloud.append(boat);}
  row(boat);window.NextSkillAgent?.refresh();
 }
 function descend(current){
  const boat=document.querySelector('.voyage-cloud-boat');if(!boat || !current)return;
  const rect=current.getBoundingClientRect();
  // Travel towards the current island on screen; no scripted scrolling loop.
  const x=Math.max(0,Math.min(innerWidth-210,rect.left-90));
  flight=boat.animate([{transform:'translate(0,-100px)',opacity:0},{transform:'translate(0,0)',opacity:1,offset:.2},{transform:`translate(${x-(innerWidth-210)/2}px,${Math.min(innerHeight*.25,rect.top+rect.height*.4-innerHeight*.34)}px)`,opacity:1,offset:1}],{duration:2200,easing:'cubic-bezier(.77,0,.175,1)',fill:'forwards'});
  const route=document.getElementById('lesson-route');
  if(route){arrivalBoat=document.createElement('div');arrivalBoat.className='voyage-arrival-boat';arrivalBoat.innerHTML=markup();arrivalBoat.style.top=`${current.offsetTop+current.offsetHeight*.4}px`;arrivalBoat.style.left=`${Math.max(0,current.offsetLeft-90)}px`;route.append(arrivalBoat);row(arrivalBoat);}
 }
 function finishArrival(){
  if(arrivalBoat){const b=document.querySelector('.voyage-cloud-boat')?.getBoundingClientRect(),r=arrivalBoat.parentElement.getBoundingClientRect();if(b){arrivalBoat.style.left=`${b.left-r.left}px`;arrivalBoat.style.top=`${b.top-r.top}px`;}select(arrivalBoat.querySelector('[data-buddy-anchor]'));arrivalBoat.classList.add('has-arrived');}
  flight?.cancel();document.querySelector('.voyage-cloud-boat')?.remove();
 }
 function sync(){
  const stopped=!(jump ? sceneAllowed() : allowed()) || (!document.getElementById('journey-cloud-transition')?.open && !!document.querySelector('dialog[open]'));
  document.body.classList.toggle('voyage-paused',stopped);
  if(stopped){cancelJump(true);flight?.cancel();}
 }
 const guide=document.querySelector('.map-guide');if(guide)new MutationObserver(sync).observe(guide,{attributes:true,attributeFilter:['data-motion']});
 document.querySelectorAll('dialog').forEach(el=>new MutationObserver(sync).observe(el,{attributes:true,attributeFilter:['open']}));
 document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',sync);
 window.NextSkillMotion?.subscribe(sync, { element:scene || document.querySelector('.skill-buddy'),kind:'reaction' });
 window.addEventListener('resize',()=>{cancelJump(true);flight?.cancel();});
 window.addEventListener('pagehide',()=>{generation++;cancelJump(true);flight?.cancel();});
 window.NextSkillVoyage={board,returnToShore,cloudBoat,descend,finishArrival};
 if(shore)select(shore);sync();
})();
