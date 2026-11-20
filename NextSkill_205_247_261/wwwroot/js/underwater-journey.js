(() => {
    'use strict';
    const route = document.getElementById('lesson-route');
    const sea = document.querySelector('.island-water-motion');
    if (!route || !sea) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const underwaterRoute = route.querySelector('.island-underwater-route');
    const surface = sea.querySelector('.underwater-surface');
    const deepDecor = document.createElement('div'); deepDecor.className = 'underwater-deep-decor';
    deepDecor.innerHTML = '<div class="deep-ocean-backdrop"></div><div class="deep-ocean-light"></div><img class="deep-ocean-plant deep-ocean-plant--left" src="/images/journey/reef-garden.svg" alt=""><img class="deep-ocean-plant deep-ocean-plant--right" src="/images/journey/reef-garden.svg" alt=""><div class="deep-fish-school deep-fish-school--far"><img src="/images/journey/ocean-fish.svg" alt=""><img src="/images/journey/ocean-fish.svg" alt=""><img src="/images/journey/ocean-fish.svg" alt=""></div><div class="deep-fish-school deep-fish-school--near"><img src="/images/journey/ocean-fish.svg" alt=""><img src="/images/journey/ocean-fish.svg" alt=""></div><div class="deep-bubble deep-bubble--one"></div><div class="deep-bubble deep-bubble--two"></div><div class="deep-bubble deep-bubble--three"></div>';
    sea.append(deepDecor);
    const deepLight = deepDecor.querySelector('.deep-ocean-light');
    let frame = 0;
    let measureTimeout;
    let shore = 0;
    let viewportHeight = 1;
    let hasUnderwaterRoute = false;
    let paused = false;
    function update() {
        frame = 0;
        const waterline = shore - scrollY;
        const depth = hasUnderwaterRoute ? Math.max(0, Math.min(1, (.65 - waterline / viewportHeight) / .7)) : 0;
        const fade = depth * depth * (3 - 2 * depth);
        const instant = reduced.matches || paused;
        deepDecor.style.setProperty('--island-waterline', `${waterline}px`);
        deepDecor.style.opacity = String(instant ? Number(depth >= .5) : fade);
        deepLight.style.translate = instant ? '' : `0 ${Math.max(-64, Math.min(0, waterline * .16))}px`;
        document.body.classList.toggle('is-underwater', depth >= .5);
    }
    function measureSurface() {
        const first = route.querySelector('[data-lesson-id="1"] img');
        if (!first) return;
        const world = window.NextSkillSeaWorld;
        shore = world.surfaceShore(first);
        viewportHeight = Math.max(1, surface.offsetHeight);
        hasUnderwaterRoute = !underwaterRoute.hidden;
        const frames = [...underwaterRoute.querySelectorAll('.island-stop-picture')];
        const depths = frames.map(frame => {
            const rect = frame.getBoundingClientRect();
            const distance = rect.top + scrollY + rect.height / 2 - shore;
            return Math.max(0, Math.min(1, distance / (viewportHeight * 2.4)));
        });
        frames.forEach((frame, index) => frame.style.setProperty('--island-art-depth', depths[index].toFixed(3)));
        world.setShore(shore);
        queue();
    }
    function queue() { if (!frame) frame = requestAnimationFrame(update); }
    function queueMeasure() {
        clearTimeout(measureTimeout);
        measureTimeout = setTimeout(measureSurface, 120);
    }
    function goTo(id, smooth = true) {
        const target = route.querySelector(`[data-lesson-id="${id}"]`);
        if (target) {
            target.scrollIntoView({ block: 'center', inline: 'center', behavior: smooth && !reduced.matches ? 'smooth' : 'instant' });
        }
    }
    new ResizeObserver(queueMeasure).observe(route);
    new MutationObserver(queueMeasure).observe(route, { childList: true });
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queueMeasure, { passive: true });
    window.addEventListener('orientationchange', queueMeasure, { passive: true });
    route.addEventListener('load', queueMeasure, true);
    window.addEventListener('pageshow', queueMeasure);
    window.addEventListener('pagehide', () => {
        clearTimeout(measureTimeout);
        cancelAnimationFrame(frame);
        frame = 0;
    });
    document.fonts.ready.then(measureSurface);
    reduced.addEventListener('change', queue);
    window.NextSkillMotion?.subscribe(state => {
        paused = state.paused;
        queue();
    });
    window.NextSkillUnderwater = { goTo };
    measureSurface();
})();
