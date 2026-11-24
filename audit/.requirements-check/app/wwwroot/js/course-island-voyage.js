/* Acknowledged course selection -> rightward sailing -> clouds -> real MVC island. */
(() => {
    'use strict';
    const page = document.querySelector('[data-catalog-ocean]');
    const cloud = document.getElementById('journey-cloud-transition');
    if (!page || !cloud) return;
    const surface = page.querySelector('.underwater-surface');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const key = 'nextskill.journey-arrival';
    const animations = new Set(), timers = new Map();
    let generation = 0, covering, navigating = false, fast = false, stage, boat, home, source, sourceScroll=0;
    let voyageViewport, resizeTimer;
    let inert = [];
    const gentle = () => fast || reduced.matches || document.hidden || window.NextSkillMotion?.snapshot().paused;
    const delay = ms => new Promise(resolve => { const id=setTimeout(()=>{timers.delete(id);resolve();},ms);timers.set(id,resolve); });
    const animate = (node,frames,duration) => {
        if (gentle()) return Promise.resolve();
        const animation=node.animate(frames,{duration,easing:'cubic-bezier(.77,0,.175,1)',fill:'both'});
        animations.add(animation);return animation.finished.catch(()=>{});
    };
    function forward() {
        fast=true;animations.forEach(a=>{try{a.finish();}catch{}});
        timers.forEach((resolve,id)=>{clearTimeout(id);resolve();});timers.clear();
    }
    function restore(focus=false) {
        clearTimeout(resizeTimer);
        generation++;forward();animations.forEach(a=>a.cancel());animations.clear();
        if(boat && home){home.parent.insertBefore(boat,home.next?.parentNode===home.parent?home.next:null);if(home.style===null)boat.removeAttribute('style');else boat.setAttribute('style',home.style);if(home.ambient===null)boat.removeAttribute('data-catalog-ambient');else boat.setAttribute('data-catalog-ambient',home.ambient);}
        stage?.remove();stage=null;boat=null;home=null;
        inert.forEach(([node,value])=>{node.inert=value;});inert=[];
        if(cloud.open)cloud.close();cloud.className='';cloud.style.removeProperty('--jc-cover-duration');
        document.documentElement.classList.remove('journey-transition-active','course-departing');
        covering=null;navigating=false;window.NextSkillAgent?.refresh();window.NextSkillMotion?.refresh();
        if(focus)source?.focus({preventScroll:true});
    }
    async function sail(run) {
        if(gentle())return;
        // Return the camera to the waterfront before departing, including when
        // a course was selected further down the catalog. No diagonal boat leg.
        const water=window.NextSkillSeaWorld?.snapshot();
        const vessel=page.querySelector('.catalog-boat');
        const viewportHeight=surface?.offsetHeight || innerHeight;
        const clearance=Math.max(32,Math.min(88,viewportHeight*.12));
        const cameraY=Math.max(0,(water?.horizon||0)+scrollY+(vessel?.offsetHeight||90)+clearance-viewportHeight);
        if(Math.abs(scrollY-cameraY)>2){
            let waiting=true;
            const stopped=new Promise(resolve=>{
                let stable=0;
                function check(){
                    if(!waiting)return;
                    stable=Math.abs(scrollY-cameraY)<1?stable+1:0;
                    if(stable>=3||run!==generation||gentle()){resolve();return;}
                    requestAnimationFrame(check);
                }
                requestAnimationFrame(check);
            });
            window.scrollTo({top:cameraY,behavior:'smooth'});
            await Promise.race([stopped,delay(1200)]);
            waiting=false;
            if(run===generation)window.scrollTo({top:cameraY,behavior:'instant'});
        }
        if(run!==generation||gentle())return;
        window.NextSkillSeaWorld?.measure();
        boat=page.querySelector('.catalog-boat');
        if(!boat)return;
        const rect=boat.getBoundingClientRect();
        // Keep the current waterline and tilt when moving the boat to the overlay.
        const bob=getComputedStyle(boat.querySelector('.catalog-boat-idle')).transform;
        home={parent:boat.parentNode,next:boat.nextSibling,style:boat.getAttribute('style'),ambient:boat.getAttribute('data-catalog-ambient')};
        const {width,height,left:x,top:y}=rect;
        stage=document.createElement('div');stage.className='catalog-page course-voyage-stage';
        Object.assign(stage.style,{position:'fixed',inset:'0',padding:'0',margin:'0',minHeight:'0',zIndex:'200010',pointerEvents:'none'});
        stage.innerHTML='<button type="button" class="course-voyage-skip">ข้ามแอนิเมชัน →</button>';
        document.body.append(stage);stage.append(boat);
        boat.dataset.catalogAmbient='active';
        Object.assign(boat.style,{position:'absolute',left:`${x}px`,top:`${y}px`,bottom:'auto',width:`${width}px`,height:`${height}px`,transform:'none'});
        boat.style.setProperty('--catalog-departure-bob',bob);
        stage.querySelector('button').addEventListener('click',forward);
        stage.querySelector('button').focus({preventScroll:true});
        inert=[...document.body.children].filter(n=>n!==stage&&n!==cloud&&!['SCRIPT','STYLE','LINK'].includes(n.tagName)).map(n=>[n,n.inert]);
        inert.forEach(([node])=>{node.inert=true;});
        window.NextSkillAgent?.refresh();
        const drift=animate(boat,[{transform:'translate3d(0,0,0)'},{transform:`translate3d(${innerWidth-x+width}px,0,0)`}],1900);
        const coast=page.querySelector('.catalog-harbor');
        if(coast)animate(coast,[{transform:'translate3d(0,0,0)'},{transform:'translate3d(-48px,0,0)'}],1900);
        await delay(1650);
        if(run!==generation)return;
        await Promise.all([drift,cover(run)]);
    }
    async function cover(run) {
        if(run!==generation)return;
        cloud.className='is-covering';cloud.style.setProperty('--jc-cover-duration',gentle()?'0ms':'650ms');
        cloud.querySelector('.jc-label').textContent='กำลังเตรียมเกาะบทเรียนของคุณ…';
        if(!cloud.open)cloud.showModal();
        document.documentElement.classList.add('journey-transition-active');
        void cloud.offsetWidth;cloud.classList.add('is-covered');
        if(!gentle())await delay(650);
    }
    function begin(trigger) {
        if(covering)return covering;
        source=trigger;sourceScroll=scrollY;fast=false;const run=++generation;
        voyageViewport={width:innerWidth,height:surface?.offsetHeight || innerHeight};
        document.documentElement.classList.add('course-departing');
        covering=(async()=>{await sail(run);if(run===generation&&!cloud.open)await cover(run);})();
        return covering;
    }
    window.NextSkillCourseVoyage={
        begin,
        cancel(){try{sessionStorage.removeItem(key);}catch{}restore(true);},
        async navigate(value,id){
            if(navigating)return;navigating=true;
            const url=new URL(value,location.href);
            if(url.origin!==location.origin||url.pathname.toLowerCase()!=='/learning/island'||Number(url.searchParams.get('courseId'))!==id)throw new Error('ไม่พบเกาะบทเรียนที่เลือก');
            await begin(source);const run=generation;
            const response=await fetch(url.href,{credentials:'same-origin',headers:{Accept:'text/html'},signal:AbortSignal.timeout(12000)});
            if(!response.ok||response.redirected||!(await response.text()).includes('id="learning-initial-state"'))throw new Error('ยังเตรียมเกาะบทเรียนไม่ได้ กรุณาลองอีกครั้ง');
            if(run!==generation)return;
            try{sessionStorage.setItem(key,JSON.stringify({courseId:id,url:url.pathname+url.search,at:Date.now(),source:'catalog',skip:gentle(),sea:window.NextSkillSeaWorld?.snapshot()}));}catch{}
            location.assign(url.href);
        }
    };
    cloud.addEventListener('cancel',event=>{event.preventDefault();forward();});
    reduced.addEventListener('change',()=>{if(reduced.matches)forward();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)forward();});
    window.addEventListener('resize',()=>{
        if(!covering)return;
        clearTimeout(resizeTimer);
        resizeTimer=setTimeout(()=>{
            const height=surface?.offsetHeight || innerHeight;
            if(covering && (innerWidth!==voyageViewport.width || height!==voyageViewport.height))forward();
        },90);
    },{passive:true});
    window.NextSkillMotion?.subscribe(state=>{if(covering&&(state.reduced||state.paused||state.hidden))forward();});
    window.addEventListener('pagehide',()=>{const departed=!!covering;restore();if(departed)window.scrollTo({top:sourceScroll,behavior:'instant'});});
    window.addEventListener('pageshow',event=>{if(event.persisted)restore();});
})();
