(() => {
    'use strict';
    const scene = document.getElementById('ocean-journey');
    const layer = scene?.querySelector('[data-ocean-life]');
    if (!scene || !layer || !Element.prototype.animate) return;
    const fish = layer.querySelector('[data-ocean-fish]');
    const airspace = layer.querySelector('[data-ocean-airspace]');
    const tail = fish.querySelector('[data-fish-tail]');
    const fin = fish.querySelector('[data-fish-fin]');
    const splash = layer.querySelector('[data-ocean-splash]');
    const entrySplash = layer.querySelector('[data-ocean-entry-splash]');
    const ripple = layer.querySelector('[data-ocean-ripple]');
    const entryRipple = layer.querySelector('[data-ocean-entry-ripple]');
    // Reuse a bounded school and its effects; do not allocate on each jump.
    const copyEffect = (element, attribute) => {
        const copy = element.cloneNode(false);
        copy.removeAttribute(attribute);
        element.after(copy);
        return copy;
    };
    const followers = ['ocean-fish-reef', 'ocean-fish-silver'].map((templateId, index) => {
        const element = document.getElementById(templateId).content.firstElementChild.cloneNode(true);
        const space = document.createElement('div');
        space.className = 'ocean-life-airspace';
        space.append(element);
        layer.insertBefore(space, layer.querySelector('.ocean-life-effects'));
        return {
            element, space, species:templateId, tail:element.querySelector('[data-fish-tail]'), fin:element.querySelector('[data-fish-fin]'),
            splash:copyEffect(splash, 'data-ocean-splash'), entrySplash:copyEffect(entrySplash, 'data-ocean-entry-splash'),
            ripple:copyEffect(ripple, 'data-ocean-ripple'), entryRipple:copyEffect(entryRipple, 'data-ocean-entry-ripple'),
            delay:350 * (index + 1)
        };
    });
    const camera = scene.querySelector('.ow-camera');
    const birds = [...scene.querySelectorAll('[data-ocean-bird]')];
    const guide = document.querySelector('.map-guide');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia('(max-width:700px), (pointer:coarse)');
    const easeOut = 'cubic-bezier(0.23,1,0.32,1)';
    const exclusionSelector = '.ow-intro h1,.ow-intro > p,.ow-intro-actions,.ow-journey-caption,.ow-controls,.ow-vessel,.ow-harbor,.ow-land,.sj-header';
    const fishDuration = 1200;
    const frameCount = 61;
    const birdAnimations = [];
    const birdFlights = [];
    let visible = false;
    let suspended = false;
    let timer = null;
    let active = false;
    let generation = 0;
    let animations = [];
    let lastMovement = performance.now();
    let lastSpawn = null;
    let lastSchool = [];
    let totalEvents = 0;

    function allowed() {
        const shared = window.NextSkillMotion?.snapshot({ element:scene, kind:'ambient' });
        return !suspended && visible && !reduced.matches && !document.hidden
            && guide?.dataset.motion !== 'paused' && guide?.dataset.motion !== 'reduced'
            && !document.querySelector('dialog[open]') && (shared ? shared.ambientAllowed : true);
    }
    function clearTimer() { if (timer !== null) clearTimeout(timer); timer = null; }
    function cancel() {
        generation++;
        animations.forEach(animation => animation.cancel());
        animations = [];
        active = false;
    }
    function schedule() {
        if (timer !== null || active || !allowed()) return;
        const first = totalEvents === 0;
        const min = first ? 700 : (compact.matches ? 1000 : 800);
        const range = first ? 700 : 1000;
        timer = setTimeout(() => {
            timer = null;
            if (!spawn(Math.random)) schedule();
        }, min + Math.random() * range);
    }
    function reconcile() {
        const running = allowed();
        if (!running) clearTimer();
        // A pause freezes the actual phase, including a fish halfway through its arc.
        // Only reduced motion or changed geometry removes an in-flight event.
        if (reduced.matches) cancel();
        [...animations, ...birdAnimations].forEach(animation => {
            if (running && animation.playState === 'paused') animation.play();
            else if (!running && animation.playState === 'running') animation.pause();
        });
        if (running) schedule();
    }
    function moved() {
        lastMovement = performance.now();
        // Keep an existing timer rather than recreating it for every camera frame.
        schedule();
    }
    function resized() {
        cancel();
        birdFlights.forEach(({ animation, bird }) => animation.effect.setKeyframes(flightFrames(bird)));
        moved();
        reconcile();
    }
    const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    function measureWater() {
        // Read geometry once per school, never during animation frames.
        const bounds = layer.getBoundingClientRect();
        const water = scene.querySelector('.ow-sea')?.getBoundingClientRect();
        if (!water || bounds.width <= 0 || bounds.height <= 0) return null;
        const clip = { left:Math.max(bounds.left, 0) + 16, right:Math.min(bounds.right, innerWidth) - 16,
            top:Math.max(bounds.top, water.top, 0) + 12, bottom:Math.min(bounds.bottom, water.bottom, innerHeight) - 16 };
        const exclusions = [...scene.querySelectorAll(exclusionSelector), ...document.querySelectorAll('.sj-header')]
            .filter(element => !element.hidden && getComputedStyle(element).visibility !== 'hidden' && Number(getComputedStyle(element).opacity) > .05)
            .flatMap(element => {
                const art = element.matches('.ow-start-land') && element.querySelector('.ow-island-art');
                const rect = (art || element).getBoundingClientRect();
                if (!rect.width || !rect.height || !intersects(rect, clip)) return [];
                if (art) {
                    // The SVG canvas contains a large transparent area. Protect
                    // the beach and palm canopy separately instead of excluding it.
                    const pad = compact.matches ? 12 : 18;
                    return [
                        { left:rect.left + rect.width * .11 - pad, right:rect.left + rect.width * .9 + pad,
                          top:rect.top + rect.height * .52 - pad, bottom:rect.top + rect.height * .96 + pad },
                        { left:rect.left + rect.width * .38 - pad, right:rect.right + pad,
                          top:rect.top - pad, bottom:rect.top + rect.height * .69 + pad }
                    ];
                }
                return [{ left:rect.left - 24, right:rect.right + 24, top:rect.top - 24, bottom:rect.bottom + 24 }];
            });
        return { bounds, clip, exclusions, height:layer.clientHeight };
    }
    function chooseZone(random, geometry, narrow = false, occupied = [], preferredDepth = null) {
        const { bounds, clip, exclusions } = geometry;
        const base = compact.matches
            ? { width:30, height:18, dx:narrow ? (innerWidth <= 340 ? 18 : 28) : 84, apex:46, splashWidth:28, splashHeight:19, rippleWidth:50, rippleHeight:19 }
            : { width:44, height:26, dx:138, apex:76, splashWidth:40, splashHeight:26, rippleWidth:72, rippleHeight:26 };
        // Distant species use a smaller footprint and lower arc, so they can
        // safely occupy water closer to the horizon without hiding content.
        const speciesScale = preferredDepth === null ? 1 : preferredDepth < .5 ? .68 : .88;
        const shape = Object.fromEntries(Object.entries(base).map(([key, value]) => [key, value * speciesScale]));
        const fishRadius = Math.hypot(shape.width, shape.height) / 2;
        const endRadius = Math.max(fishRadius, shape.rippleWidth / 2);
        const bottomRadius = Math.max(fishRadius, shape.rippleHeight / 2);
        const minX = clip.left + endRadius;
        const maxX = clip.right - shape.dx - endRadius;
        const minY = clip.top + shape.apex + fishRadius;
        const maxY = clip.bottom - bottomRadius;
        if (minX > maxX || minY > maxY) return null;
        const candidates = [];
        for (let row = 0; row <= 6; row++) for (let column = 0; column <= 12; column++) {
            const x = minX + (maxX - minX) * column / 12;
            const y = minY + (maxY - minY) * row / 6;
            const footprint = { left:x - endRadius, right:x + shape.dx + endRadius,
                top:y - shape.apex - fishRadius, bottom:y + bottomRadius };
            if (!exclusions.some(rect => intersects(rect, footprint)) && !occupied.some(rect => intersects(rect, footprint))) {
                const depth = Math.max(0, Math.min(1, (y - clip.top) / (clip.bottom - clip.top)));
                candidates.push({ x:x - bounds.left, y:y - bounds.top, footprint, depth });
            }
        }
        if (!candidates.length) return compact.matches && !narrow ? chooseZone(random, geometry, true, occupied, preferredDepth) : null;
        const nearest = preferredDepth === null ? 0 : Math.min(...candidates.map(candidate => Math.abs(candidate.depth - preferredDepth)));
        const preferred = preferredDepth === null ? [] : candidates.filter(candidate => Math.abs(candidate.depth - preferredDepth) <= nearest + .08);
        const choices = preferred.length ? preferred : candidates;
        const candidate = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
        const direction = random() > .5 ? 1 : -1;
        return { ...shape, ...candidate, x:candidate.x + (direction < 0 ? shape.dx : 0), direction, fishRadius, exclusions, clip,
            baseWidth:base.width, baseHeight:base.height, baseSplashWidth:base.splashWidth, baseSplashHeight:base.splashHeight,
            baseRippleWidth:base.rippleWidth, baseRippleHeight:base.rippleHeight,
            scale:speciesScale * (.58 + .42 * candidate.depth) };
    }
    function animate(element, frames, duration, options = {}) {
        const animation = element.animate(frames, { duration, easing:'linear', fill:'both', ...options });
        animations.push(animation);
        return animation.finished;
    }
    function surfaceEffects(zone, x, launch, follower = null) {
        const splashElement = follower ? (launch ? follower.splash : follower.entrySplash) : (launch ? splash : entrySplash);
        const rippleElement = follower ? (launch ? follower.ripple : follower.entryRipple) : (launch ? ripple : entryRipple);
        const delay = (launch ? fishDuration * .06 : fishDuration * .91) + (follower?.delay || 0);
        const splashAt = (sx, sy, rise = 0) => `translate3d(${x - zone.baseSplashWidth / 2}px,${zone.y - zone.baseSplashHeight + rise}px,0) scale(${sx * zone.scale},${sy * zone.scale})`;
        const rippleAt = scale => `translate3d(${x - zone.baseRippleWidth / 2}px,${zone.y - zone.baseRippleHeight / 2}px,0) scale(${scale * zone.scale})`;
        return [
            animate(splashElement, [
                { transform:splashAt(.55,.25,5), opacity:0 },
                { transform:splashAt(.85,1), opacity:.9, offset:.24 },
                { transform:splashAt(1.1,.7,3), opacity:.5, offset:.58 },
                { transform:splashAt(1.2,.35,6), opacity:0 }
            ], launch ? 360 : 460, { delay }),
            animate(rippleElement, [
                { transform:rippleAt(.35), opacity:0 },
                { transform:rippleAt(.5), opacity:.7, offset:.12 },
                { transform:rippleAt(1), opacity:0 }
            ], launch ? 850 : 1500, { delay, easing:easeOut })
        ];
    }
    function spawn(random) {
        if (active || !allowed()) return false;
        const geometry = measureWater();
        if (!geometry) return false;
        const zone = chooseZone(random, geometry);
        if (!zone) return false;
        clearTimer();
        active = true;
        totalEvents++;
        lastSpawn = zone;
        const zones = [zone];
        const school = followers.map((follower, index) => {
            const preferredDepth = index === 0 ? .25 : .8;
            const next = chooseZone(random, geometry, false, zones.map(item => item.footprint), preferredDepth)
                || chooseZone(random, geometry, false, [], preferredDepth)
                || { ...zone, scale:zone.scale * (index === 0 ? .68 : .88) };
            zones.push(next);
            return { follower, zone:next };
        });
        lastSchool = zones;
        const token = ++generation;
        // Each fish has its own fixed waterline at its chosen distance.
        const setWaterline = (space, item) => { space.style.clipPath = `inset(0 0 ${Math.max(0, geometry.height - item.y - 1)}px 0)`; };
        setWaterline(airspace, zone);
        school.forEach(item => setWaterline(item.follower.space, item.zone));
        const makeFrames = item => Array.from({ length:frameCount }, (_, index) => {
            const t = index / (frameCount - 1);
            const x = item.x + item.direction * item.dx * t - item.baseWidth / 2;
            const y = item.y + item.fishRadius - 4 * item.apex * t * (1 - t) - item.baseHeight / 2;
            const rotation = item.direction * Math.atan2(-4 * item.apex + 8 * item.apex * t, item.dx) * 180 / Math.PI;
            return { offset:t, transform:`translate3d(${x}px,${y}px,0) rotate(${rotation}deg) scaleX(${item.direction}) scale(${item.scale})`, opacity:1 };
        });
        document.dispatchEvent(new CustomEvent('ocean:fish-jump', { detail:{ x:zone.x, y:zone.y, priority:'ambient' } }));
        const effects = [
            animate(fish, makeFrames(zone), fishDuration),
            animate(tail, [ { transform:'rotate(-12deg)' }, { transform:'rotate(12deg)' }, { transform:'rotate(-12deg)' } ], fishDuration / 7, { iterations:7 }),
            animate(fin, [ { transform:'rotate(0deg)' }, { transform:'rotate(-14deg)' }, { transform:'rotate(0deg)' } ], fishDuration / 4, { iterations:4 }),
            ...surfaceEffects(zone, zone.x + zone.direction * zone.dx * .06, true),
            ...surfaceEffects(zone, zone.x + zone.direction * zone.dx * .91, false),
            ...school.flatMap(({ follower, zone:fishZone }) => [
                animate(follower.element, makeFrames(fishZone), fishDuration, { delay:follower.delay }),
                animate(follower.tail, [ { transform:'rotate(-12deg)' }, { transform:'rotate(12deg)' }, { transform:'rotate(-12deg)' } ], fishDuration / 7, { iterations:7, delay:follower.delay }),
                animate(follower.fin, [ { transform:'rotate(0deg)' }, { transform:'rotate(-14deg)' }, { transform:'rotate(0deg)' } ], fishDuration / 4, { iterations:4, delay:follower.delay }),
                ...surfaceEffects(fishZone, fishZone.x + fishZone.direction * fishZone.dx * .06, true, follower),
                ...surfaceEffects(fishZone, fishZone.x + fishZone.direction * fishZone.dx * .91, false, follower)
            ])
        ];
        Promise.all(effects).catch(() => { /* Geometry or reduced-motion cancellation. */ }).finally(() => {
            if (token === generation) { cancel(); schedule(); }
        });
        return true;
    }

    function flightBounds() {
        const style = getComputedStyle(scene.querySelector('.ow-seabirds'));
        const scale = Math.max(1, parseFloat(style.width)) / 400;
        const left = parseFloat(style.left) || 0;
        // Include the entire parallax travel: loop boundaries always stay beyond the scene edge.
        return { start:(innerWidth - left + innerWidth * .37) / scale + 80, end:-left / scale - 80 };
    }
    function flightFrames(bird) {
        const { start, end } = flightBounds();
        const origin = Number(bird.dataset.flightOrigin);
        const scale = Number(bird.dataset.flightScale) || 1;
        return Array.from({ length:61 }, (_, frame) => {
            const t = frame / 60;
            const phase = t * Math.PI * 2;
            return { offset:t, transform:`translate3d(${(start + (end - start) * t - origin) / scale}px,${Math.sin(phase) * 6}px,0) rotate(${Math.sin(phase) * 2}deg)` };
        });
    }
    birds.forEach((bird, index) => {
        const duration = 48000 + index * 5500;
        const glide = bird.animate(flightFrames(bird), { duration, iterations:Infinity, easing:'linear' });
        const bounds = flightBounds();
        glide.currentTime = duration * (bounds.start - Number(bird.dataset.flightOrigin)) / (bounds.start - bounds.end);
        glide.pause();
        birdFlights.push({ animation:glide, bird });
        birdAnimations.push(glide);
        bird.querySelectorAll('[data-ocean-wing]').forEach(wing => {
            const direction = wing.dataset.oceanWing === 'left' ? 1 : -1;
            // Short pairs of wingbeats separated by a long glide, with no loop seam.
            const frames = Array.from({ length:121 }, (_, frame) => {
                const t = frame / 120;
                const burst = t < .24 ? t / .24 : t > .76 ? (t - .76) / .24 : 0;
                const angle = Math.sin(Math.PI * burst) * Math.sin(Math.PI * 4 * burst) * 24 * direction;
                return { offset:t, transform:`rotate(${angle}deg)` };
            });
            const flap = wing.animate(frames, { duration:12000 + index * 1900, iterations:Infinity, easing:'linear' });
            flap.currentTime = index * 1700;
            flap.pause();
            birdAnimations.push(flap);
        });
    });

    const visibility = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting && entries[0].intersectionRatio > .1;
        reconcile();
    }, { threshold:[0, .1] });
    visibility.observe(scene);
    // Track camera movement for diagnostics without delaying fish during travel.
    if (camera) new MutationObserver(moved).observe(camera, { attributes:true, attributeFilter:['style'] });
    new MutationObserver(moved).observe(scene, { attributes:true, attributeFilter:['data-stage'] });
    const modeObserver = new MutationObserver(reconcile);
    if (guide) modeObserver.observe(guide, { attributes:true, attributeFilter:['data-motion'] });
    document.querySelectorAll('dialog').forEach(dialog => modeObserver.observe(dialog, { attributes:true, attributeFilter:['open'] }));
    window.NextSkillMotion?.subscribe(reconcile, { element:scene, kind:'ambient' });
    document.addEventListener('nextskill:ocean-travel-start', () => {
        if (active || !allowed()) return;
        clearTimer();
        if (!spawn(Math.random)) schedule();
    });
    window.addEventListener('scroll', moved, { passive:true });
    window.addEventListener('resize', resized, { passive:true });
    document.addEventListener('visibilitychange', reconcile);
    reduced.addEventListener('change', reconcile);
    compact.addEventListener('change', resized);
    window.addEventListener('pagehide', () => { suspended = true; reconcile(); });
    window.addEventListener('pageshow', () => { suspended = false; moved(); reconcile(); });

    // Development-only deterministic QA controls retain the same safety gates.
    if (layer.dataset.development === 'true') {
        window.NextSkillOceanLifeTest = Object.freeze({
            force(seed = 1) {
                let value = Number(seed) >>> 0;
                const random = () => { value = (Math.imul(1664525, value) + 1013904223) >>> 0; return value / 4294967296; };
                const started = spawn(random);
                return { started, allowed:allowed(), stable:performance.now() - lastMovement >= 300, active };
            },
            snapshot() {
                return { active, paused:active && !allowed(), timerCount:timer === null ? 0 : 1,
                    animationCount:animations.filter(item => item.playState === 'running').length,
                    birdCount:birds.length, birdAnimationCount:birdAnimations.filter(item => item.playState === 'running').length,
                    entityCount:layer.children.length, totalEvents, fishDuration, frameCount,
                    allowed:allowed(), stable:performance.now() - lastMovement >= 300,
                    lastSpawn, lastSchool, state:window.NextSkillMotion?.snapshot({ element:scene, kind:'ambient' }) || null };
            }
        });
    }
})();
