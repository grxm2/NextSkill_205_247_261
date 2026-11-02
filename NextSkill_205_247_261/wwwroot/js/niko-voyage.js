(() => {
 'use strict';
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const scene=document.querySelector('.ow-scene');
 const shore=document.querySelector('.ow-island-mascot');
 const seat=document.querySelector('.ow-boat-anchor');
 let boarded=false, boarding, jump, flight, arrivalBoat, generation=0;
 const allowed=()=>!reduce.matches && window.NextSkillAgent?.motionAllowed();
 function select(slot){
  document.querySelectorAll('[data-buddy-home="active"]').forEach(el=>el.removeAttribute('data-buddy-home'));
  slot.dataset.buddyHome='active';window.NextSkillAgent?.refresh();
 }
 function row(host){
  host.dataset.voyage='rowing';
  const robot=document.querySelector('.skill-buddy');
  window.NextSkillBuddyMotion?.stop(robot);
 }
 function cancelJump(){
  const previous=jump;jump=null;previous?.cancel();
 }
 function transfer(target,pose){
  const agent=document.getElementById('nextskill-agent');
  // Record the displayed position before cancelling an interrupted jump.
  const from=agent && !agent.hidden ? agent.getBoundingClientRect() : null;
  cancelJump();select(target);
  if(!agent || agent.parentElement!==target || !from || !allowed() || document.querySelector('dialog[open]'))return null;
  const to=agent.getBoundingClientRect();
  const visible=r=>r.width>0 && r.height>0 && r.right>0 && r.left<innerWidth && r.bottom>0 && r.top<innerHeight;
  if(!visible(from)||!visible(to))return null;
  const dx=from.left-to.left,dy=from.top-to.top;
  if(Math.hypot(dx,dy)>Math.max(innerWidth*1.25,700))return null;
  const arc=Math.min(96,Math.max(44,Math.hypot(dx,dy)*.28));
  const direction=Math.sign(dx)||1;
  window.NextSkillBuddyMotion?.play(pose);
  jump=target.animate([
   {transform:`translate3d(${dx}px,${dy}px,0) rotate(0deg)`,offset:0},
   {transform:`translate3d(${dx*.58}px,${dy*.58-arc}px,0) rotate(${direction*6}deg)`,offset:.42},
   {transform:`translate3d(${dx*.13}px,${dy*.13-arc*.28}px,0) rotate(${-direction*3}deg)`,offset:.8},
   {transform:'translate3d(0,0,0) rotate(0deg)',offset:1}
  ],{duration:760,easing:'cubic-bezier(.77,0,.175,1)'});
  return jump;
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
  const stopped=!allowed() || (!document.getElementById('journey-cloud-transition')?.open && !!document.querySelector('dialog[open]'));
  document.body.classList.toggle('voyage-paused',stopped);
  if(stopped){cancelJump();flight?.cancel();}
 }
 const guide=document.querySelector('.map-guide');if(guide)new MutationObserver(sync).observe(guide,{attributes:true,attributeFilter:['data-motion']});
 document.querySelectorAll('dialog').forEach(el=>new MutationObserver(sync).observe(el,{attributes:true,attributeFilter:['open']}));
 document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',sync);
 window.NextSkillMotion?.subscribe(sync, { element:scene || document.querySelector('.skill-buddy'),kind:'reaction' });
 window.addEventListener('resize',()=>{cancelJump();flight?.cancel();});
 window.addEventListener('pagehide',()=>{generation++;cancelJump();flight?.cancel();});
 window.NextSkillVoyage={board,returnToShore,cloudBoat,descend,finishArrival};
 if(shore)select(shore);sync();
})();
