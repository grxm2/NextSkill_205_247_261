(() => {
    'use strict';
    const sea = document.querySelector('[data-sea-world]');
    if (!sea) return;
    const main = sea.closest('main, [data-catalog-ocean]');
    const surface = sea.querySelector('.underwater-surface');
    const waves = sea.querySelector('.surface-ocean-waves');
    const anchor = sea.querySelector('.ocean-horizon-anchor');
    const hero = document.querySelector('[data-catalog-hero]');
    const catalogTrack = hero?.querySelector('.catalog-boat-track');
    const catalogBoat = catalogTrack?.querySelector('.catalog-boat');
    const layers = [...sea.querySelectorAll('.island-water-layer')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const compactIsland = matchMedia('(width < 768px)');
    let frame = 0, shore = anchor.getBoundingClientRect().top;
    let displayedHeight = 0, resizeTimer = 0;
    let enabled = false;
    // Both documents use wall-clock phase, so crests do not restart at navigation.
    function phase() {
        sea.getAnimations({subtree:true}).forEach(animation => {
            const duration = animation.effect?.getTiming().duration;
            if (typeof duration === 'number' && duration > 0) animation.currentTime = Date.now() % duration;
        });
    }
    function update() {
        frame = 0;
        const y = window.scrollY;
        surface.style.transform = `translate3d(0, ${shore - displayedHeight * .265 - y}px, 0)`;
        if (enabled) {
            if (!compactIsland.matches) {
                layers[0].style.transform = `translate3d(0, ${Math.sin(y / 1250) * 32}px, 0)`;
            }
            const amplitude = compactIsland.matches ? 18 : 48;
            layers[1].style.transform = `translate3d(0, ${Math.sin(y / 700) * -amplitude}px, 0)`;
        }
    }
    function queue() { if (!frame) frame = requestAnimationFrame(update); }
    function measure() {
        displayedHeight = Math.max(surface.offsetHeight, sea.clientWidth * 941 / 1672);
        waves.style.setProperty('--ocean-wave-offset', `${displayedHeight * .265}px`);
        if (catalogBoat) {
            // The berth is measured in layout coordinates even while the boat sails.
            shore = catalogTrack.getBoundingClientRect().top + scrollY + catalogBoat.offsetTop - 2;
        }
        update();
    }
    function queueMeasure() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(measure, 90);
    }
    function sync(state) {
        enabled = state ? state.ambientAllowed : !reduced.matches && !document.hidden;
        sea.classList.toggle('is-paused', !enabled);
        if (reduced.matches) layers.forEach(layer => { layer.style.transform = ''; });
        queue();
    }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', hero ? queueMeasure : measure, { passive: true });
    if (hero) {
        const size = new ResizeObserver(queueMeasure);
        size.observe(hero);
        const navbar = document.querySelector('[data-navbar]');
        if (navbar) size.observe(navbar);
        screen.orientation?.addEventListener('change', queueMeasure);
    }
    document.addEventListener('visibilitychange', () => sync(window.NextSkillMotion?.snapshot({ element: main, kind: 'ambient' })));
    reduced.addEventListener('change', () => sync(window.NextSkillMotion?.snapshot({ element: main, kind: 'ambient' })));
    if (window.NextSkillMotion) window.NextSkillMotion.subscribe(sync, { element: main, kind: 'ambient' });
    else sync();
    window.NextSkillSeaWorld = {
        // The back of the beach meets the sea before the foreground pier.
        // Keep the camera, arrival and vessel on this same artwork coordinate.
        surfaceShore(element) {
            const rect = element.getBoundingClientRect();
            return rect.top + scrollY + rect.height * .74;
        },
        referenceHorizon: () => anchor.getBoundingClientRect().top,
        setShore(value) { shore=value;update(); },
        snapshot: () => ({horizon:shore-scrollY,width:innerWidth,height:innerHeight}),
        measure
    };
    document.fonts.ready.then(measure);
    phase();measure();
    window.addEventListener('pageshow', () => { phase();measure(); });
    window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); clearTimeout(resizeTimer); frame=0; });
})();
