(() => {
    'use strict';
    const scene = document.getElementById('ocean-journey');
    if (!scene || !document.querySelector('.ocean-home')) return;
    const root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const guide = document.querySelector('.map-guide');
    const camera = scene.querySelector('.ow-camera');
    const vessel = scene.querySelector('.ow-vessel');
    const track = scene.closest('.ow-track');
    let context, timeline, travelScroll, lastStage = -1;
    let paused = guide?.dataset.motion === 'paused';
    let suspended = false;
    let directScroll = false;
    let boarded = false;
    const touch = matchMedia('(pointer: coarse)');
    const scrubDuration = () => touch.matches ? .32 : .48;
    const harborStop = .62;
    function fitVesselOffset(offset) {
        // Leave room for the hull and its gentle rocking inside the scene.
        const available = scene.clientHeight - vessel.offsetTop - vessel.offsetHeight - 20;
        return Math.max(0, Math.min(offset, available));
    }
    function arrivalOffset() {
        const baseline = innerWidth < 701 ? (innerHeight < 741 ? 70 : 45) : 30;
        if (innerWidth >= 701) return fitVesselOffset(baseline);
        const board = scene.querySelector('.ow-harbor-board');
        const seat = scene.querySelector('.ow-boat-anchor');
        if (!board || !seat) return fitVesselOffset(baseline);
        // The course list can grow after loading; keep Nimo below it when
        // space permits, and retain the existing viewport clearance.
        const bottom = board.getBoundingClientRect().bottom - scene.getBoundingClientRect().top;
        return fitVesselOffset(Math.max(baseline, bottom + 12 - vessel.offsetTop - seat.offsetTop));
    }
    function departureClearance() {
        const island = scene.querySelector('.ow-start-land');
        const art = island?.querySelector('.ow-island-art');
        if (!island || !art || !vessel) return 0;
        // Keep the visible hull below the sand while the shore moves past.
        // Layout coordinates stay stable even while the camera is translated.
        const beachBottom = island.offsetTop + art.getBoundingClientRect().height * .83;
        const hullTop = vessel.offsetTop + vessel.offsetHeight * .45;
        return fitVesselOffset(Math.max(0, beachBottom - hullTop + 12));
    }
    function announce(progress) {
        if (progress > .025 && !boarded) { boarded = true; window.NextSkillVoyage?.board(); }
        else if (progress <= .025 && boarded) { boarded = false; window.NextSkillVoyage?.returnToShore(); }
        const stage = progress < .16 ? 0 : progress < .48 ? 1 : 2;
        const voyage = progress > .025 && progress < harborStop - .04 ? 'rowing' : stage === 2 ? 'docked' : 'shore';
        // Keep the standing avatar visible during the jump, even when the user
        // scrolls manually while Nimo is boarding.
        if (!scene.dataset.arrival && scene.dataset.voyage !== voyage && (scene.dataset.voyage !== 'boarding' || voyage !== 'rowing')) scene.dataset.voyage = voyage;

        if (stage === lastStage) return;
        const previousStage = lastStage;
        lastStage = stage;
        scene.dataset.stage = stage;
        scene.querySelector('.ow-harbor').inert = stage !== 2;
        if (stage === 0 && !scene.dataset.arrival) window.NextSkillBuddyMotion?.play('wave', undefined, { motion: !reduced.matches && !paused });
        if (stage === 2 && previousStage !== -1 && !reduced.matches && !paused) window.NextSkillBuddyMotion?.play('cheer');
    }
    function destroy() {
        stopTravel(); context?.revert(); context = null; timeline = null;
        lastStage = -1;
        root.classList.remove('ow-enhanced');
    }
    function stopTravel() {
        if (!travelScroll) return;
        const travel = travelScroll;
        travelScroll = null;
        travel.kill();
        scene.classList.remove('ow-tour-traveling');
        timeline?.scrollTrigger?.scrubDuration(paused ? 0 : scrubDuration());
    }
    function build() {
        destroy();
        const isStatic = reduced.matches || !window.gsap || !window.ScrollTrigger;
        root.classList.toggle('ow-static', isStatic);
        if (isStatic || suspended) { scene.querySelector('.ow-harbor').inert = false; return; }
        root.classList.add('ow-enhanced');
        gsap.registerPlugin(ScrollTrigger);
        context = gsap.context(() => {
            timeline = gsap.timeline({
                defaults:{ease:'none'},
                // Status follows the rendered playhead, including the final scrub frames.
                onUpdate() { announce(this.progress() * harborStop); },
                scrollTrigger:{id:'ocean-master',trigger:track || scene,start:'top top',end:()=>`+=${Math.max(scene.clientHeight * 2.9, 2000)}`,scrub:paused ? true : scrubDuration(),invalidateOnRefresh:true}
            });
            // Give the boat room to move away from shore before the camera
            // begins its continuous move across open water.
            timeline.to(camera,{x:()=>-innerWidth*.074,duration:harborStop*.06,ease:'power1.in',force3D:true},harborStop*.07)
                .to(camera,{x:()=>-innerWidth*2.2,duration:harborStop*.87,ease:'none',force3D:true},harborStop*.13)
                .to('.ow-intro',{x:()=>-innerWidth*.65,autoAlpha:0,duration:.23},0)
                .to('.ow-distance',{x:()=>-innerWidth*.24,duration:harborStop},0)
                .to('.ow-clouds',{x:()=>-innerWidth*.5,duration:harborStop},0)
                 .to('.ow-swell-0',{xPercent:-3,y:-8,duration:harborStop},0)
                .to('.ow-swell-1',{xPercent:-7,y:-14,duration:harborStop},0)
                .to('.ow-swell-2',{xPercent:-12,y:-22,duration:harborStop},0)
                .to('.ow-swell-3',{xPercent:-19,y:15,duration:harborStop},0)
                .to('.ow-swell-4',{xPercent:-27,y:24,duration:harborStop},0)
                .to('.ow-seabirds',{x:()=>innerWidth*.03,y:-10,duration:harborStop},0)
                // First move the hull clear of the sand. The camera starts
                // travelling once that move is complete.
                .to(vessel,{y:departureClearance,duration:harborStop*.07,ease:'power1.out',force3D:true},0)
                .to(vessel,{x:()=>innerWidth<701?Math.max(0,innerWidth*.10-vessel.offsetLeft):-innerWidth*.33,duration:harborStop*.93,ease:'sine.inOut',force3D:true},harborStop*.07)
                .to(vessel,{y:arrivalOffset,duration:harborStop*.62,ease:'sine.inOut'},harborStop*.38);
        }, scene);
        directScroll = paused;
        syncIdle(); ScrollTrigger.refresh(); announce(timeline.progress() * harborStop);
    }
    function syncIdle() {
        const state = window.NextSkillMotion?.snapshot({ element: scene, kind: 'ambient' });
        const stopped = state ? !state.ambientAllowed : paused || document.hidden || !!document.querySelector('dialog[open]');
        scene.classList.toggle('ow-motion-paused', stopped);
        const trigger = timeline?.scrollTrigger;
        // Pause removes inertial catch-up while retaining manual scroll/navigation.
        if (trigger && directScroll !== paused) {
            directScroll = paused;
            trigger.scrubDuration(paused ? 0 : scrubDuration());
        }
        const scrub = trigger?.getTween();
        if (stopped) {
            stopTravel();
            if (typeof scrub?.pause === 'function') scrub.pause();
        } else if (typeof scrub?.play === 'function') scrub.play();
    }
    function go(progress, motion = false, tour = false) {
        stopTravel();
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
                // The tour already eases scroll. A second scrub tween makes the camera
                // chase it and adds extra work on every frame.
                trigger.scrubDuration(0);
                scene.classList.add('ow-tour-traveling');
                document.dispatchEvent(new CustomEvent('nextskill:ocean-travel-start'));
                travelScroll = gsap.to(position,{top:target,duration:4.2,ease:'power1.inOut',onUpdate:()=>window.scrollTo({top:position.top,behavior:'instant'}),onComplete:stopTravel});
            } else window.scrollTo({top:target,behavior:motion && !reduced.matches && !paused?'smooth':'instant'});
        } else {
            const target = progress < .2 ? scene : document.getElementById('course-harbor');
            target.scrollIntoView({behavior:'instant',block:'start'});
        }
    }
    document.addEventListener('click', async event => {
        const button = event.target.closest('[data-ocean-go]');
        const link = event.target.closest('a[href]');
        if (button) {
            event.preventDefault();
            const requested = Number(button.dataset.oceanGo);
            // The main action always starts the boat tour, including pages
            // rendered from an older cached view that used a different value.
            const tour = requested === .2 || button.matches('.ow-intro-actions .ns-button--primary');
            if (tour) event.stopImmediatePropagation();
            // A deliberate request to watch the voyage resumes the site's
            // paused motion; the device's reduced-motion setting still wins.
            if (tour && paused && !reduced.matches) {
                if (window.NextSkillMotion) window.NextSkillMotion.setPaused(false);
                else { paused = false; if (guide) guide.dataset.motion = 'active'; }
            }
            if (requested > 0 && await window.NextSkillVoyage?.board() === false) return;
            // A keyboard activation should start the same voyage as a click.
            go(tour ? harborStop : requested,tour || event.detail>0,tour);
        }
        else if (link && link.origin===location.origin && ['/Home','/Home/Index'].includes(link.pathname) && ['#journey-world','#course-harbor','#ocean-journey'].includes(link.hash)) {
            event.preventDefault(); event.stopImmediatePropagation(); go(link.hash==='#journey-world'?.78:link.hash==='#course-harbor'?.62:0,event.detail>0);
        }
    },true);
    ['wheel','touchstart','pointerdown'].forEach(type=>window.addEventListener(type,event=>{
        if (event.target instanceof Element && event.target.closest('[data-theme-toggle]')) return;
        stopTravel();
    },{passive:true}));
    window.addEventListener('keydown',event=>{if(event.target instanceof Element && event.target.closest('[data-theme-toggle]'))return;if(['Escape','ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))stopTravel();});
    const observer = new MutationObserver(() => { paused = guide?.dataset.motion === 'paused'; syncIdle(); });
    if (guide) observer.observe(guide,{attributes:true,attributeFilter:['data-motion']});
    document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
    reduced.addEventListener('change',build);
    document.addEventListener('visibilitychange',syncIdle);
    window.NextSkillMotion?.subscribe(state => { paused = state.paused; syncIdle(); }, { element: scene, kind: 'ambient' });
    window.addEventListener('pagehide',()=>{suspended=true;destroy();});
    window.addEventListener('pageshow',()=>{if(suspended){suspended=false;build();}});
    document.fonts.ready.then(()=>window.ScrollTrigger?.refresh());
    build();
    if (scene.querySelector('[data-ocean-life]')?.dataset.development === 'true') {
        window.NextSkillOceanWorldTest = Object.freeze({ snapshot: () => ({
            targetProgress:timeline?.scrollTrigger.progress ?? 0,
            renderedProgress:timeline?.progress() ?? 0,
            scrubDuration:paused ? 0 : scrubDuration(),
            stage:lastStage, paused, static:root.classList.contains('ow-static'),
            ambientAllowed:!scene.classList.contains('ow-motion-paused')
        }) });
    }
    if (location.hash==='#journey-world') requestAnimationFrame(()=>go(.78));
    // Selection is saved immediately by the existing course controller. This short
    // departure never delays a click, authentication, or the server request.
    document.addEventListener('click', event=>{
        if (!event.target.closest('[data-select-course]') || reduced.matches || paused || !window.gsap) return;
        window.NextSkillBuddyMotion?.play('wave');
    });
})();
