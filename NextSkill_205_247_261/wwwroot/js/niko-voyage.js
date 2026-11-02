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
 async function board(){
  if(boarding)return boarding;
  if(boarded || !shore || !seat)return;
  boarded=true;
  const run=++generation;
  boarding=(async()=>{
   const from=shore.getBoundingClientRect();select(seat);
   const to=seat.getBoundingClientRect();
   scene.dataset.voyage='boarding';
   if(allowed() && !document.querySelector('dialog[open]')){
    const dx=from.left-to.left,dy=from.top-to.top;
    window.NextSkillBuddyMotion?.play('jump');
    jump=seat.animate([
     {transform:`translate(${dx}px,${dy}px) scale(1.05,.94)`,offset:0},
     {transform:`translate(${dx*.48}px,${Math.min(dy,0)-95}px) rotate(-9deg)`,offset:.48},
     {transform:'translate(0,0) scale(1.08,.9)',offset:.85},
     {transform:'translate(0,0) scale(1)',offset:1}
    ],{duration:850,easing:'ease-in-out'});
    await jump.finished.catch(()=>{});
   }
   if(run===generation){
    if(scene.dataset.voyage!=='docked')row(scene);
    window.NextSkillBuddyMotion?.stop(document.querySelector('.skill-buddy'));
    window.NextSkillBuddyMotion?.express('happy');
   }
  })();
  const current=boarding;
  current.finally(()=>{if(boarding===current)boarding=null;});
  return current;
 }
 function returnToShore(){
  if(!shore || !boarded)return;
  generation++;jump?.cancel();jump=null;boarding=null;boarded=false;
  scene.dataset.voyage='shore';select(shore);
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
  if(stopped){generation++;jump?.cancel();flight?.cancel();}
 }
 const guide=document.querySelector('.map-guide');if(guide)new MutationObserver(sync).observe(guide,{attributes:true,attributeFilter:['data-motion']});
 document.querySelectorAll('dialog').forEach(el=>new MutationObserver(sync).observe(el,{attributes:true,attributeFilter:['open']}));
 document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',sync);
 window.NextSkillMotion?.subscribe(sync, { element:scene || document.querySelector('.skill-buddy'),kind:'reaction' });
 window.addEventListener('resize',()=>{generation++;jump?.cancel();flight?.cancel();});
 window.addEventListener('pagehide',()=>{generation++;jump?.cancel();flight?.cancel();});
 window.NextSkillVoyage={board,returnToShore,cloudBoat,descend,finishArrival};
 if(shore)select(shore);sync();
})();
