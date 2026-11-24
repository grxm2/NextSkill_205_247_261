(() => {
    'use strict';
    const scene = document.getElementById('ocean-journey');
    if (!scene || !document.querySelector('.ocean-home')) return;
    const root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const guide = document.querySelector('.map-guide');
    const camera = scene.querySelector('.ow-camera');
    const intro = scene.querySelector('.ow-intro');
    const vessel = scene.querySelector('.ow-vessel');
    const harbor = scene.querySelector('.ow-harbor');
    const harborModel = harbor.querySelector('.harbor-model');
    const harborHorizon = Number(harborModel.dataset.portalHorizonY || .68);
    const stickyStage = scene.parentElement;
    const track = scene.closest('.ow-track');
    const navbar = document.querySelector('.ns-navbar');
    const seaEffects = scene.querySelector('.ow-open-sea-effects');
    const backdrop = scene.querySelector('.ocean-backdrop');
    const buoy = scene.querySelector('.ow-home-buoy');
    const seat = scene.querySelector('.ow-boat-anchor');
    const waterSurface = scene.querySelector('.ow-sea');
    scene.style.setProperty('--ow-dock-horizon', harborHorizon);
    let backdropWaterline = null;
    let seaMotions = [], seaIntensity = -1;
    let media, timeline, travelScroll, lastStage = -1;
    let paused = guide?.dataset.motion === 'paused';
    let suspended = false;
    let directScroll = false;
    let boarded = false;
    let navigationArmed = false, dockingNotified = false, portalLocked = false;
    let sceneSize, resizeTimer, mediaFrame, tideOffset = 0, mediaPosition;
    let viewportWidth = innerWidth, viewportHeight = innerHeight, stablePosition = null;
    let compactVoyage = false;
    const touch = matchMedia('(pointer: coarse)');
    const narrowShore = matchMedia('(width < 768px) and (orientation: portrait), (width < 1024px) and (orientation: landscape) and (height < 480px)');
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
    function arrivalOffset() {
        const art = harborModel.getBoundingClientRect();
        const modelTop = art.top - scene.getBoundingClientRect().top;
        // The arrival sits in the open canal, on the same centerline used by
        // the portal animation. There is no deck or timber threshold to cross.
        const waterline = Number(harborModel.dataset.portalWaterlineY || .94);
        const top = modelTop + art.height * waterline - vessel.offsetHeight * .85;
        return Math.min(top, scene.clientHeight - vessel.offsetHeight - 20) - vessel.offsetTop;
    }
    function arrivalX() {
        const art = harborModel.getBoundingClientRect();
        const finalLeft = art.left - camera.getBoundingClientRect().left - harbor.offsetLeft;
        const center = Number(harborModel.dataset.portalX || .5);
        const left = finalLeft + art.width * center - vessel.offsetWidth * .5;
        return Math.max(12, Math.min(scene.clientWidth - vessel.offsetWidth - 12, left)) - vessel.offsetLeft;
    }
    function measureScene() {
        scene.style.setProperty('--ow-dashboard-end', `${intro.offsetTop + intro.offsetHeight}px`);
        const shoreSeaTop = waterSurface.offsetTop;
        const canal = harbor.offsetTop + harborModel.offsetHeight * harborHorizon;
        tideOffset = compactVoyage ? 0 : Math.min(0, canal - Math.min(scene.clientHeight * .065, 48) - shoreSeaTop);
        // On wide scenes reserve the canvas room for the horizon movement once.
        scene.style.setProperty('--ow-water-reserve', `${-tideOffset}px`);
        waterSurface.dataset.worldTop = String(shoreSeaTop);
        sceneSize = sceneDimensions();
    }
    function sceneDimensions() {
        return [scene.clientWidth, scene.clientHeight, intro.offsetHeight, navbar?.offsetHeight, track.offsetHeight].join('/');
    }
    function departureClearance() {
        const island = scene.querySelector('.ow-start-land');
        const art = island?.querySelector('.ow-island-art');
        if (!island || !art || !vessel) return 0;
        // Use the painted shore, including its small scale around the waterline.
        const artRect = art.getBoundingClientRect();
        const beachBottom = artRect.top - scene.getBoundingClientRect().top + artRect.height * .83;
        const hullTop = vessel.offsetTop + vessel.offsetHeight * .45;
        const passengerTop = vessel.offsetTop + seat.offsetTop + seat.offsetHeight * .08;
        let clearance = beachBottom - (narrowShore.matches ? Math.min(passengerTop, hullTop) : hullTop) + 12;
        if (buoyOnDepartureRoute()) {
            const water = waterSurface.getBoundingClientRect();
            const buoyBottom = waterSurface.offsetTop + (buoy.getBoundingClientRect().bottom - water.top);
            // The buoy sweeps past as the camera pans. Keep the passenger
            // and oar clear of it in the foreground sailing lane.
            clearance = Math.max(clearance, buoyBottom + 10 - passengerTop);
        }
        // The transparent art extends past the painted keel and can overhang.
        const available = scene.clientHeight - vessel.offsetTop - vessel.offsetHeight * .85 - 12;
        return Math.max(0, Math.min(clearance, available));
    }
    function buoyOnDepartureRoute() {
        if (!buoy) return false;
        const style = getComputedStyle(buoy);
        // Use its world position, which is independent of the camera's scroll.
        return parseFloat(style.left) + buoy.clientWidth + 8 > vessel.offsetLeft + vessel.offsetWidth * .18;
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
        alignBackdrop();
        document.dispatchEvent(new Event('nextskill:ocean-view'));
        // Cave entry owns the boat and its passenger once the harbor is reached.
        if (portalLocked) return;
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
        harbor.inert = stage !== 2;
        if (stage === 0 && !scene.dataset.arrival) window.NextSkillBuddyMotion?.play('wave', undefined, { motion: !reduced.matches && !paused });
        if (stage === 2 && previousStage !== -1 && !reduced.matches && !paused) window.NextSkillBuddyMotion?.play('cheer');
    }
    function destroy() {
        stopTravel(); timeline = null;
        cancelAnimationFrame(mediaFrame);
        backdropWaterline = null;
        setOpenSea(0); seaMotions = [];
        lastStage = -1;
    }
    function stopTravel() {
        if (!travelScroll) return;
        const travel = travelScroll;
        travelScroll = null;
        travel.kill();
        scene.classList.remove('ow-tour-traveling');
        timeline?.scrollTrigger?.scrubDuration(paused ? 0 : scrubDuration());
    }
    function build(isStatic, compact) {
        compactVoyage = compact;
        root.classList.toggle('ow-static', isStatic);
        root.classList.toggle('ow-enhanced', !isStatic);
        measureScene();
        if (isStatic) {
            harbor.inert = false;
            alignBackdrop();
            dock();
            return;
        }
        timeline = gsap.timeline({
            defaults: { ease: 'none' },
            // Status follows the rendered playhead, including the final scrub frames.
            onUpdate() { announce(this.progress() * harborStop); },
            scrollTrigger: {
                id: 'ocean-master',
                trigger: track,
                start: () => track.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(stickyStage).top),
                end: () => `+=${track.clientHeight - scene.clientHeight}`,
                scrub: paused ? true : scrubDuration(),
                invalidateOnRefresh: true
            }
        });
        // Frame the cave before the final part of the boat's approach.
        const shoreEnd = harborStop * .13;
        const cameraArrival = harborStop * (compact ? .86 : 1);
        const approach = harborStop * (compact ? .54 : .62);
        const pushOff = harborStop * .07;
        const clearWater = harborStop * (buoyOnDepartureRoute() ? .13 : .07);
        timeline.to(camera, { x: () => -scene.clientWidth * .074, duration: harborStop * .06, ease: 'power1.in' }, pushOff)
            .to(camera, { x: () => -harbor.offsetLeft, duration: cameraArrival - shoreEnd, ease: compact ? 'power1.out' : 'none' }, shoreEnd)
            .to(intro, { x: () => -intro.offsetWidth, autoAlpha: 0, duration: compact ? .17 : .23 }, 0)
            .to('.ow-distance', { x: () => -scene.clientWidth * .24, duration: harborStop }, 0)
            .to('.ow-clouds', { x: () => -scene.clientWidth * .5, duration: harborStop }, 0)
            .to('.ow-seabirds', { x: () => scene.clientWidth * .03, yPercent: -8, duration: harborStop }, 0)
            // Push off from the sand, then reach the sailing lane.
            .to(vessel, { y: departureClearance, duration: clearWater, ease: 'power1.out' }, 0)
            .to(vessel, { x: arrivalX, duration: harborStop - pushOff, ease: 'sine.inOut' }, pushOff)
            .to(vessel, { y: arrivalOffset, duration: harborStop - approach, ease: 'sine.inOut' }, approach);
        if (!compact) {
            timeline.to([waterSurface, scene.querySelector('.ow-distance')], { y: () => tideOffset, duration: harborStop - approach }, approach);
        }
        directScroll = paused;
        collectSeaMotions();
        syncIdle(); announce(timeline.progress() * harborStop);
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
    const stationaryControls = '[data-theme-toggle], [data-home-dashboard], .sj-footer, #nextskill-agent, #buddy-agent-menu, #nimo-speech';
    ['wheel','touchstart','pointerdown'].forEach(type=>window.addEventListener(type,event=>{
        if (event.target instanceof Element && event.target.closest(stationaryControls)) return;
        if (!portalLocked) navigationArmed = true;
        stopTravel();
    },{passive:true}));
    window.addEventListener('keydown', event => {
        if (event.defaultPrevented) return;
        if (event.target instanceof Element && event.target.closest(stationaryControls)) return;
        if (['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
            if (!portalLocked) navigationArmed = true;
            stopTravel();
        }
    });
    const observer = new MutationObserver(() => { paused = guide?.dataset.motion === 'paused'; syncIdle(); });
    if (guide) observer.observe(guide,{attributes:true,attributeFilter:['data-motion']});
    document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
    function journeyPosition() {
        const trigger = timeline?.scrollTrigger;
        if (!trigger || trigger.end <= trigger.start || scrollY < trigger.start || scrollY > trigger.end + 1) return null;
        return Math.min(1, (scrollY - trigger.start) / (trigger.end - trigger.start));
    }
    function positionBeforeLayout() {
        // A smaller viewport can clamp scroll before either ResizeObserver or
        // GSAP's orientation handler runs. Keep the last pre-resize position.
        return viewportWidth === innerWidth && viewportHeight === innerHeight ? journeyPosition() : stablePosition;
    }
    function rememberPosition() {
        if (viewportWidth === innerWidth && viewportHeight === innerHeight && !window.ScrollTrigger?.isRefreshing) {
            stablePosition = journeyPosition();
        }
    }
    function restorePosition(progress) {
        const trigger = timeline?.scrollTrigger;
        if (!trigger || progress === null || progress === undefined) return;
        window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * progress, behavior: 'instant' });
        trigger.update();
        trigger.getTween()?.progress?.(1);
        timeline.progress(progress);
        stablePosition = progress;
    }
    const layout = new ResizeObserver(scheduleResize);
    function scheduleResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const position = mediaPosition ?? positionBeforeLayout();
            mediaPosition = null;
            viewportWidth = innerWidth; viewportHeight = innerHeight;
            if (suspended || sceneSize === sceneDimensions()) return;
            measureScene();
            if (timeline) {
                stopTravel();
                ScrollTrigger.refresh();
                restorePosition(position);
                if (navigationArmed && (position ?? 0) < 1 && scene.dataset.cvPhase === 'traveling') go(harborStop, true, true);
            }
            alignBackdrop();
        }, 150);
    }
    function activate() {
        if (window.gsap && window.ScrollTrigger) {
            media = gsap.matchMedia();
            media.add({
                motion: '(prefers-reduced-motion: no-preference)',
                still: '(prefers-reduced-motion: reduce)',
                compact: '(width < 768px), (width < 1024px) and (orientation: portrait), (orientation: landscape) and (height < 480px)'
            }, ({ conditions }) => {
                const position = mediaPosition;
                mediaPosition = null;
                build(conditions.still, conditions.compact);
                if (timeline) mediaFrame = requestAnimationFrame(() => {
                    ScrollTrigger.refresh();
                    restorePosition(position);
                    if (navigationArmed && (position ?? 0) < 1 && scene.dataset.cvPhase === 'traveling') go(harborStop, true, true);
                });
                return destroy;
            }, scene);
        } else build(true, false);
        [scene, intro, track, navbar].filter(Boolean).forEach(element => layout.observe(element));
    }
    if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        // The stable scene size drives refreshes. Mobile address bars can
        // change the visual viewport without changing any scene dimensions.
        ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load', ignoreMobileResize: true });
        gsap.addEventListener('matchMediaInit', () => { mediaPosition = positionBeforeLayout(); });
    }
    window.addEventListener('scroll', rememberPosition, { passive: true });
    window.addEventListener('resize', scheduleResize, { passive: true });
    window.addEventListener('orientationchange', scheduleResize, { passive: true });
    document.addEventListener('visibilitychange',syncIdle);
    window.NextSkillMotion?.subscribe(state => { paused = state.paused; syncIdle(); }, { element: scene, kind: 'ambient' });
    if (buoy) window.NextSkillMotion?.subscribe(state => {
        buoy.classList.toggle('ow-buoy-paused', !state.ambientAllowed);
    }, { element: buoy, kind: 'ambient' });
    window.addEventListener('pagehide', () => {
        suspended = true; navigationArmed = false; clearTimeout(resizeTimer);
        layout.disconnect();
        media?.revert(); media = null; mediaPosition = null;
    });
    window.addEventListener('pageshow', () => { if (suspended) { suspended = false; activate(); } });
    document.fonts.ready.then(scheduleResize);
    activate();
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
