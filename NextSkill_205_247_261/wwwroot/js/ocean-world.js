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
    const seaEffects = scene.querySelector('.ow-open-sea-effects');
    const backdrop = scene.querySelector('.ocean-backdrop');
    const waterSurface = scene.querySelector('.ow-sea');
    let backdropWaterline = null;
    let seaMotions = [], seaIntensity = -1;
    let context, timeline, travelScroll, lastStage = -1;
    let paused = guide?.dataset.motion === 'paused';
    let suspended = false;
    let directScroll = false;
    let boarded = false;
    let navigationArmed = false, dockingNotified = false, portalLocked = false;
    let viewportWidth = innerWidth, resizeTimer, shoreSeaTop = 0;
    const touch = matchMedia('(pointer: coarse)');
    const scrubDuration = () => touch.matches ? .32 : .48;
    const harborStop = .62;
    function dock() {
        if (!scene.hasAttribute('data-catalog-departure') || !navigationArmed || dockingNotified || portalLocked) return;
        dockingNotified = true; navigationArmed = false;
        requestAnimationFrame(() => {
            if (!suspended) document.dispatchEvent(new CustomEvent('nextskill:ocean-docked'));
        });
    }
    function setOpenSea(progress) {
        const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
        // Ramp up after departure and settle before the course board arrives.
        const intensity = Math.round(smooth((progress - .07) / .12) * (1 - smooth((progress - .43) / .13)) * 1000) / 1000;
        if (intensity === seaIntensity) return;
        seaIntensity = intensity;
        if (seaEffects) seaEffects.style.opacity = String(intensity);
        scene.classList.toggle('ow-open-sea', intensity > .01);
        // Changing playback rate keeps the current pose/time instead of restarting
        // a CSS loop as its speed changes. Pause remains owned by NextSkillMotion.
        seaMotions.forEach(({ animation, maximum }) => animation.updatePlaybackRate(1 + (maximum - 1) * intensity));
    }
    function collectSeaMotions() {
        seaMotions = [
            ['.ow-swell-drift', 2.2]
        ].flatMap(([selector, maximum]) => [...scene.querySelectorAll(selector)].flatMap(element =>
            element.getAnimations().map(animation => ({ animation, maximum }))));
        seaIntensity = -1;
    }
    function fitVesselOffset(offset) {
        // Leave room for the hull and its gentle rocking inside the scene.
        const available = scene.clientHeight - vessel.offsetTop - vessel.offsetHeight - 20;
        return Math.max(0, Math.min(offset, available));
    }
    function arrivalOffset() {
        const model = scene.querySelector('.ow-dock .harbor-model');
        if (!model) return fitVesselOffset(30);
        const art = model.getBoundingClientRect();
        const modelTop = art.top - scene.getBoundingClientRect().top;
        // The arrival sits in the open canal, on the same centerline used by
        // the portal animation. There is no deck or timber threshold to cross.
        const waterline = Number(model.dataset.portalWaterlineY || .94);
        const top = modelTop + art.height * waterline - vessel.offsetHeight * .85;
        return Math.min(top, scene.clientHeight - vessel.offsetHeight - 20) - vessel.offsetTop;
    }
    function arrivalX() {
        const model = scene.querySelector('.ow-dock .harbor-model');
        if (!model) return -innerWidth * .33;
        const art = model.getBoundingClientRect();
        const finalLeft = art.left - camera.getBoundingClientRect().left - innerWidth * 2.2;
        const center = Number(model.dataset.portalX || .5);
        const left = finalLeft + art.width * center - vessel.offsetWidth * .5;
        return Math.max(12, Math.min(scene.clientWidth - vessel.offsetWidth - 12, left)) - vessel.offsetLeft;
    }
    function harborSeaTop() {
        const model = scene.querySelector('.ow-dock .harbor-model');
        const art = model.getBoundingClientRect();
        const canal = art.top - scene.getBoundingClientRect().top + art.height * Number(model.dataset.portalHorizonY || .68);
        return Math.min(shoreSeaTop, canal - 48);
    }
    function departureClearance() {
        const island = scene.querySelector('.ow-start-land');
        const art = island?.querySelector('.ow-island-art');
        if (!island || !art || !vessel) return 0;
        // Use the painted shore, including its small scale around the waterline.
        const artRect = art.getBoundingClientRect();
        const beachBottom = artRect.top - scene.getBoundingClientRect().top + artRect.height * .83;
        const hullTop = vessel.offsetTop + vessel.offsetHeight * .45;
        return fitVesselOffset(Math.max(0, beachBottom - hullTop + 12));
    }
    function alignBackdrop() {
        if (!backdrop || !waterSurface || !backdrop.offsetHeight) return;
        // The sea can rise at the harbor and the backdrop has its own parallax.
        // Use the rendered water plane, including the depth scene's scale.
        const water = waterSurface.getBoundingClientRect(), bounds = backdrop.getBoundingClientRect();
        const scale = bounds.height / backdrop.offsetHeight || 1;
        const level = Math.round((water.top - bounds.top) / scale * 10) / 10;
        if (level === backdropWaterline) return;
        backdropWaterline = level;
        backdrop.style.setProperty('--sea-level', `${level}px`);
    }
    function announce(progress) {
        setOpenSea(progress);
        // Re-measure the mooring after responsive layout settles.
        if (progress >= harborStop - .0001) gsap.set(vessel, { x: arrivalX(), y: arrivalOffset() });
        alignBackdrop();
        document.dispatchEvent(new Event('nextskill:ocean-view'));
        if (progress > .025 && !boarded) { boarded = true; window.NextSkillVoyage?.board(); }
        else if (progress <= .025 && boarded) { boarded = false; window.NextSkillVoyage?.returnToShore(); }
        const stage = progress < .16 ? 0 : progress < .48 ? 1 : 2;
        const voyage = progress > .025 && progress < harborStop - .04 ? 'rowing' : stage === 2 ? 'docked' : 'shore';
        // Keep the standing avatar visible during the jump, even when the user
        // scrolls manually while Nimo is boarding.
        if (!scene.dataset.arrival && scene.dataset.voyage !== voyage && (scene.dataset.voyage !== 'boarding' || voyage !== 'rowing')) scene.dataset.voyage = voyage;
        if (progress < harborStop - .04) dockingNotified = false;
        if (progress >= harborStop - .0001) dock();

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
        backdropWaterline = null;
        setOpenSea(0); seaMotions = [];
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
        if (isStatic || suspended) {
            scene.querySelector('.ow-harbor').inert = false;
            alignBackdrop();
            if (isStatic && !suspended) dock();
            return;
        }
        root.classList.add('ow-enhanced');
        gsap.registerPlugin(ScrollTrigger);
        shoreSeaTop = scene.querySelector('.ow-sea').offsetTop;
        // The horizon can rise later, but the material's world origin stays at
        // the original waterline. Resizing the visible sea must not stretch it.
        waterSurface.dataset.worldTop = String(shoreSeaTop);
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
                .to('.ow-sea-mist--far',{xPercent:-5,y:-6,duration:harborStop},0)
                .to('.ow-sea-mist--mid',{xPercent:-14,y:12,duration:harborStop},0)
                .to('.ow-sea-mist--near',{xPercent:-23,y:22,duration:harborStop},0)
                .to('.ow-sea-foam--far',{xPercent:-12,y:12,duration:harborStop},0)
                .to('.ow-sea-foam--near',{xPercent:-24,y:28,duration:harborStop},0)
                 .to('.ow-swell-0',{xPercent:-3,y:-8,duration:harborStop},0)
                .to('.ow-swell-1',{xPercent:-7,y:-14,duration:harborStop},0)
                .to('.ow-swell-2',{xPercent:-12,y:-22,duration:harborStop},0)
                .to('.ow-swell-3',{xPercent:-19,y:15,duration:harborStop},0)
                .to('.ow-swell-4',{xPercent:-27,y:24,duration:harborStop},0)
                .to('.ow-seabirds',{x:()=>innerWidth*.03,y:-10,duration:harborStop},0)
                // First move the hull clear of the sand. The camera starts
                // travelling once that move is complete.
                .to(vessel,{y:departureClearance,duration:harborStop*.07,ease:'power1.out',force3D:true},0)
                .to(vessel,{x:arrivalX,duration:harborStop*.93,ease:'sine.inOut',force3D:true},harborStop*.07)
                .to(vessel,{y:arrivalOffset,duration:harborStop*.62,ease:'sine.inOut'},harborStop*.38);
            // Bring the horizon up to the pier on compact or tall layouts;
            // its 48px sky-to-water blend ends at the back of the timber deck.
            const start = harborStop * .62, duration = harborStop * .38;
            timeline.to('.ow-sea', { top: harborSeaTop, duration }, start)
                .to('.ow-distance', { top: () => harborSeaTop() - scene.querySelector('.ow-distance').offsetHeight, duration }, start);
        }, scene);
        directScroll = paused;
        collectSeaMotions();
        syncIdle(); ScrollTrigger.refresh(); announce(timeline.progress() * harborStop);
    }
    function syncIdle() {
        const state = window.NextSkillMotion?.snapshot({ element: scene, kind: 'ambient' });
        const stopped = state ? !state.ambientAllowed : paused || document.hidden || !!document.querySelector('dialog[open]');
        scene.classList.toggle('ow-motion-paused', stopped);
        const trigger = timeline?.scrollTrigger;
        if (stopped) stopTravel();
        // Keep scroll positions in sync while ambient motion is paused. Pausing
        // the scrub tween itself can strand the camera after a dialog or resize.
        const immediate = stopped || paused;
        if (trigger && directScroll !== immediate) {
            directScroll = immediate;
            trigger.scrubDuration(immediate ? 0 : scrubDuration());
        }
    }
    function go(progress, motion = false, tour = false) {
        clearTimeout(resizeTimer);
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
    const stationaryControls = '[data-theme-toggle], [data-home-dashboard]';
    ['wheel','touchstart','pointerdown'].forEach(type=>window.addEventListener(type,event=>{
        if (event.target instanceof Element && event.target.closest(stationaryControls)) return;
        if (!portalLocked) navigationArmed = true;
        stopTravel();
    },{passive:true}));
    window.addEventListener('keydown', event => {
        if (event.target instanceof Element && event.target.closest(stationaryControls)) return;
        if (['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
            if (!portalLocked) navigationArmed = true;
            stopTravel();
        }
    });
    const observer = new MutationObserver(() => { paused = guide?.dataset.motion === 'paused'; syncIdle(); });
    if (guide) observer.observe(guide,{attributes:true,attributeFilter:['data-motion']});
    document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
    reduced.addEventListener('change',build);
    // Recreate the camera's responsive endpoints together after a width change.
    // Keep the current stop (shore/sea/harbor) instead of retaining a stale scrub.
    window.addEventListener('resize', () => {
        if (innerWidth === viewportWidth) return;
        viewportWidth = innerWidth;
        const progress = lastStage === 2 ? 1 : timeline?.progress();
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (suspended) return;
            build();
            const trigger = timeline?.scrollTrigger;
            if (trigger && progress !== undefined) {
                window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * progress, behavior: 'instant' });
                trigger.update();
                timeline.progress(progress);
                announce(progress * harborStop);
            }
        }, 350);
    }, { passive: true });
    document.addEventListener('visibilitychange',syncIdle);
    window.NextSkillMotion?.subscribe(state => { paused = state.paused; syncIdle(); }, { element: scene, kind: 'ambient' });
    window.addEventListener('pagehide',()=>{suspended=true;navigationArmed=false;clearTimeout(resizeTimer);destroy();});
    window.addEventListener('pageshow',()=>{if(suspended){suspended=false;navigationArmed=false;build();}});
    document.fonts.ready.then(()=>window.ScrollTrigger?.refresh());
    new ResizeObserver(alignBackdrop).observe(waterSurface);
    build();
    window.NextSkillOceanWorld = {
        async travelToHarbor() {
            if (!timeline || reduced.matches || paused) return false;
            if (travelScroll) return true;
            navigationArmed = true; dockingNotified = false;
            if (await window.NextSkillVoyage?.board() === false) return true;
            if (timeline.progress() >= .9999) dock();
            else go(harborStop, true, true);
            return true;
        },
        hold() { portalLocked = true; navigationArmed = false; stopTravel(); },
        release() { portalLocked = false; navigationArmed = false; }
    };
    if (scene.querySelector('[data-ocean-life]')?.dataset.development === 'true') {
        window.NextSkillOceanWorldTest = Object.freeze({ snapshot: () => ({
            targetProgress:timeline?.scrollTrigger.progress ?? 0,
            renderedProgress:timeline?.progress() ?? 0,
            scrubDuration:paused ? 0 : scrubDuration(),
            stage:lastStage, paused, static:root.classList.contains('ow-static'),
            ambientAllowed:!scene.classList.contains('ow-motion-paused'), seaIntensity
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
