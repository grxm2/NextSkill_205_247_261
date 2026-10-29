(() => {
    'use strict';
    const scene = document.getElementById('ocean-journey');
    if (!scene || !document.querySelector('.ocean-home')) return;
    const root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const guide = document.querySelector('.map-guide');
    const camera = scene.querySelector('.ow-camera');
    const vessel = scene.querySelector('.ow-vessel');
    let context, timeline, idle, travelScroll, lastStage = -1;
    let paused = guide.dataset.motion === 'paused';
    let suspended = false;
    const harborStop = .62;
    const captions = [
        'พร้อมแล้ว ค่อย ๆ เลื่อนเพื่อออกจากฝั่ง',
        'ฮึบ! ฮึบ! กำลังพายเรือพาไปที่ท่าเรือคอร์สนะ ⛵',
        'ถึงท่าเรือแล้ว! เลือกคอร์สก่อน แล้วเราจะผ่านเมฆไปเกาะบทเรียนด้วยกัน ✨'
    ];
    const locations = ['01 / เกาะเริ่มต้น', '02 / ทะเลเปิด', '03 / เลือกคอร์สก่อนเข้าด่าน'];
    let rowingTimer = null;
    function triggerScrollRowing() {
        if (!scene) return;
        scene.classList.add('ow-actively-scrolling');
        clearTimeout(rowingTimer);
        rowingTimer = setTimeout(() => {
            scene?.classList.remove('ow-actively-scrolling');
        }, 450);
    }
    function announce(progress) {
        if (progress > .025) window.NextSkillVoyage?.board();
        document.getElementById('ocean-progress').value = progress / harborStop;
        const stage = progress < .16 ? 0 : progress < .48 ? 1 : 2;
        scene.dataset.stage = stage;
        scene.querySelector(".ow-harbor").inert = stage !== 2;

        // Manage rowing while traveling vs docked at course harbor
        if (progress > 0.025 && progress < (harborStop - 0.04)) {
            scene.dataset.voyage = 'rowing';
            triggerScrollRowing();
        } else if (stage === 2) {
            scene.dataset.voyage = 'docked';
        } else if (stage === 0) {
            scene.dataset.voyage = 'shore';
        }

        if (stage === lastStage) return;
        lastStage = stage;
        document.getElementById('ocean-caption').textContent = captions[stage];
        document.getElementById('ocean-location').textContent = locations[stage];
        if (stage === 0) window.NextSkillBuddyMotion?.play('wave', undefined, { motion: !reduced.matches && !paused });
    }
    function destroy() {
        travelScroll?.kill(); idle?.kill(); context?.revert(); context = null; timeline = null; idle = null;
        root.classList.remove('ow-enhanced');
    }
    function build() {
        destroy();
        const isStatic = reduced.matches || !window.gsap || !window.ScrollTrigger;
        root.classList.toggle('ow-static', isStatic);
        if (isStatic || suspended) { scene.querySelector('.ow-harbor').inert = false; return; }
        root.classList.add('ow-enhanced');
        gsap.registerPlugin(ScrollTrigger);
        context = gsap.context(() => {
            timeline = gsap.timeline({defaults:{ease:'none'},scrollTrigger:{id:'ocean-master',trigger:scene,start:'top top',end:()=>`+=${Math.max(innerHeight * 2.9, 2000)}`,pin:true,scrub:1,invalidateOnRefresh:true,anticipatePin:1,onUpdate:self=>announce(self.progress * harborStop)}});
            timeline.to(camera,{x:()=>-innerWidth*.5,duration:.2,ease:'power1.in'},0)
                .to(camera,{x:()=>-innerWidth*2.2,duration:.42,ease:'power1.inOut'},.2)
                .to('.ow-intro',{x:()=>-innerWidth*.65,autoAlpha:0,duration:.23},0)
                .to('.ow-distance',{x:()=>-innerWidth*.24,duration:harborStop},0)
                .to('.ow-clouds',{x:()=>-innerWidth*.5,duration:harborStop},0)
                 .to('.ow-swell-0',{xPercent:-3,y:-8,duration:harborStop},0)
                .to('.ow-swell-1',{xPercent:-7,y:-14,duration:harborStop},0)
                .to('.ow-swell-2',{xPercent:-12,y:-22,duration:harborStop},0)
                .to('.ow-swell-3',{xPercent:-19,y:15,duration:harborStop},0)
                .to('.ow-swell-4',{xPercent:-27,y:24,duration:harborStop},0)
                .to('.ow-seabirds',{x:()=>-innerWidth*.37,y:-25,duration:harborStop},0)
                .to('.ow-start-land',{rotation:-2,y:35,duration:harborStop},0)
                .fromTo('.ow-harbor',{scale:.58},{scale:1,duration:.4,ease:'power1.out'},.2)
                .to(vessel,{x:()=>innerWidth*.05,y:12,duration:.2,ease:'power1.inOut'},0)
                .to(vessel,{x:()=>-innerWidth*(innerWidth<701?.15:.33),y:()=>innerWidth<701?(innerHeight<741?70:45):30,duration:.42,ease:'power1.inOut'},.2);
            idle = gsap.to('.ow-boat-idle',{y:-5,rotation:2,duration:2.4,ease:'sine.inOut',repeat:-1,yoyo:true});
        }, scene);
        syncIdle(); ScrollTrigger.refresh(); announce(timeline.scrollTrigger.progress * harborStop);
    }
    function syncIdle() {
        const stopped = paused || document.hidden || !!document.querySelector('dialog[open]');
        scene.classList.toggle('ow-motion-paused', stopped);
        if (idle) idle.paused(stopped);
    }
    function go(progress, motion = false, tour = false) {
        travelScroll?.kill();
        // Islands only exist on the saved course route; scrolling Home cannot
        // reveal an unselected preview, including direct map hash links.
        if (progress > harborStop) {
            document.querySelector('[data-smart-action="choose-course"]').click();
            return;
        }
        if (timeline) {
            const trigger = timeline.scrollTrigger;
            const target = trigger.start + (trigger.end-trigger.start)*(progress/harborStop);
            if(tour && motion && !reduced.matches && !paused) {
                const position = {top:scrollY};
                travelScroll = gsap.to(position,{top:target,duration:3.2,ease:'power1.inOut',onUpdate:()=>window.scrollTo({top:position.top,behavior:'instant'})});
            } else window.scrollTo({top:target,behavior:motion && !reduced.matches?'smooth':'instant'});
        } else {
            const target = progress < .2 ? scene : document.getElementById('course-harbor');
            target.scrollIntoView({behavior:'instant',block:'start'});
        }
    }
    document.addEventListener('click', async event => {
        const button = event.target.closest('[data-ocean-go]');
        const link = event.target.closest('a[href]');
        if (button) { event.preventDefault(); if (Number(button.dataset.oceanGo) > 0) await window.NextSkillVoyage?.board(); go(Number(button.dataset.oceanGo),event.detail>0,button.dataset.oceanTour === 'true'); }
        else if (link && link.origin===location.origin && ['/Home','/Home/Index'].includes(link.pathname) && ['#journey-world','#course-harbor','#ocean-journey'].includes(link.hash)) {
            event.preventDefault(); event.stopImmediatePropagation(); go(link.hash==='#journey-world'?.78:link.hash==='#course-harbor'?.62:0,event.detail>0);
        }
    },true);
    ['wheel','touchstart','pointerdown'].forEach(type=>window.addEventListener(type,()=>{
        travelScroll?.kill();
        if (scene && scene.dataset.stage !== '0') triggerScrollRowing();
    },{passive:true}));
    window.addEventListener('keydown',event=>{if(['Escape','ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))travelScroll?.kill();});
    const observer = new MutationObserver(() => { paused = guide.dataset.motion === 'paused'; syncIdle(); });
    observer.observe(guide,{attributes:true,attributeFilter:['data-motion']});
    document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
    reduced.addEventListener('change',build);
    document.addEventListener('visibilitychange',syncIdle);
    window.addEventListener('pagehide',()=>{suspended=true;destroy();});
    window.addEventListener('pageshow',()=>{if(suspended){suspended=false;build();}});
    document.fonts.ready.then(()=>window.ScrollTrigger?.refresh());
    build();
    if (location.hash==='#journey-world') requestAnimationFrame(()=>go(.78));
    // Selection is saved immediately by the existing course controller. This short
    // departure never delays a click, authentication, or the server request.
    document.addEventListener('click', event=>{
        if (!event.target.closest('[data-select-course]') || reduced.matches || paused || !window.gsap) return;
        window.NextSkillBuddyMotion?.play('wave');
        gsap.to('.ow-boat-idle',{x:40,duration:.35,ease:'power2.in',repeat:1,yoyo:true,overwrite:'auto'});
    });
})();
