(() => {
    'use strict';
    const route = document.getElementById('lesson-route');
    const sea = document.querySelector('.island-water-motion');
    if (!route || !sea) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const deepDecor = document.createElement('div'); deepDecor.className = 'underwater-deep-decor';
    deepDecor.innerHTML = '<div class="deep-ocean-backdrop"></div><div class="deep-ocean-light"></div><img class="deep-ocean-plant deep-ocean-plant--left" src="/images/journey/reef-garden.svg" alt=""><img class="deep-ocean-plant deep-ocean-plant--right" src="/images/journey/reef-garden.svg" alt=""><div class="deep-fish-school deep-fish-school--far"><img src="/images/journey/ocean-fish.svg" alt=""><img src="/images/journey/ocean-fish.svg" alt=""><img src="/images/journey/ocean-fish.svg" alt=""></div><div class="deep-fish-school deep-fish-school--near"><img src="/images/journey/ocean-fish.svg" alt=""><img src="/images/journey/ocean-fish.svg" alt=""></div><div class="deep-bubble deep-bubble--one"></div><div class="deep-bubble deep-bubble--two"></div><div class="deep-bubble deep-bubble--three"></div>';
    sea.append(deepDecor);
    let frame = 0, surfaceOffset = 0;
    function update() {
        frame = 0;
        // The waterline and the first island share document coordinates.
        // Scrolling is direct placement, so pause/reduced-motion do not detach them.
        const start = surfaceOffset + innerHeight * .265 - innerHeight * .3;
        const depth = Math.max(0, Math.min(1, (window.scrollY - start) / (innerHeight * .9)));
        deepDecor.style.opacity = String(reduced.matches ? (depth >= .5 ? 1 : 0) : depth);
        document.body.classList.toggle('is-underwater', depth >= .5);
    }
    function measureSurface() {
        const first = route.querySelector('[data-lesson-id="1"] img');
        if (!first) return;
        const shore = window.NextSkillSeaWorld.surfaceShore(first);
        // Background source waterline is approximately 26.5% down the image.
        const displayedHeight = Math.max(innerHeight, innerWidth * 941 / 1672);
        surfaceOffset = shore - displayedHeight * .265;
        window.NextSkillSeaWorld?.setShore(shore);
        queue();
    }
    function queue() { if (!frame) frame = requestAnimationFrame(update); }
    function goTo(id, smooth = true) {
        const target = route.querySelector(`[data-lesson-id="${id}"]`);
        if (target) target.scrollIntoView({ block:'center', behavior:smooth && !reduced.matches ? 'smooth' : 'instant' });
    }
    new MutationObserver(measureSurface).observe(route, { childList:true });
    window.addEventListener('scroll', queue, { passive:true });
    window.addEventListener('resize', measureSurface, { passive:true });
    route.addEventListener('load', measureSurface, true);
    document.fonts.ready.then(measureSurface);
    reduced.addEventListener('change', queue);
    window.NextSkillMotion?.subscribe(queue);
    window.NextSkillUnderwater = { goTo };
    measureSurface();
})();
