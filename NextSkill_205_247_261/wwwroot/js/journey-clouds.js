(() => {
'use strict';
const key='nextskill.journey-arrival',reduced=matchMedia('(prefers-reduced-motion: reduce)'),cloud=document.getElementById('journey-cloud-transition');
if(!cloud)return;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let marker,boot,covering,navigating=false;
try{marker=JSON.parse(sessionStorage.getItem(key));boot=JSON.parse(document.getElementById('learning-initial-state')?.textContent||'null');}catch{}
const isArriving=!!(marker&&boot&&marker.courseId===boot.course.courseId&&Date.now()-marker.at<900000);
function clear(){try{sessionStorage.removeItem(key);}catch{}}
function remember(courseId){try{sessionStorage.setItem(key,JSON.stringify({courseId,at:Date.now()}));}catch{}}
function cover(){
 document.documentElement.classList.add('journey-transition-active');
 cloud.className='is-covered';
 if(!cloud.open)cloud.showModal();
 document.documentElement.classList.remove('journey-arrival-prepaint');
}
function close(){cloud.close();cloud.className='';document.documentElement.classList.remove('journey-transition-active','journey-arrival-prepaint');window.NextSkillAgent?.refresh();}
function begin(){if(!covering){cover();covering=new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}return covering;}
cloud.addEventListener('cancel',e=>e.preventDefault());
window.NextSkillJourneyTransition={isArriving,remember,begin,cancel(){navigating=false;covering=null;clear();close();},async navigate(url,id){if(navigating)return;navigating=true;remember(id);await begin();location.assign(url);}};
async function arrive(){
 if(!isArriving)return;
 clear();
 try{
  const map=document.getElementById('lesson-map'),current=document.querySelector('#lesson-route .is-current')||document.querySelector('#lesson-route .is-completed:last-child');
  await Promise.race([document.fonts.ready,wait(1200)]);
  if(map)window.scrollTo({top:map.getBoundingClientRect().top+scrollY-24,behavior:'instant'});
  await Promise.race([Promise.all([...document.querySelectorAll('#lesson-route img')].map(img=>img.decode?.().catch(()=>{}))),wait(1200)]);
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  if(!reduced.matches){cloud.classList.add('is-revealing');await wait(1900);}
  close();current?.focus({preventScroll:true});
 }finally{close();}
}
if(isArriving)cover();else document.documentElement.classList.remove('journey-arrival-prepaint');
document.addEventListener('nextskill:learning-ready',arrive,{once:true});
window.addEventListener('pageshow',e=>{if(e.persisted){navigating=false;covering=null;close();}});
})();
