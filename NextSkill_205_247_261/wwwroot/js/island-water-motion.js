(() => {
    'use strict';
    const sea = document.querySelector('[data-sea-world]');
    if (!sea) return;
    const main = sea.closest('main, [data-catalog-ocean]');
    const surface = sea.querySelector('.underwater-surface');
    const waves = sea.querySelector('.surface-ocean-waves');
    const anchor = sea.querySelector('.ocean-horizon-anchor');
    const hero = document.querySelector('[data-catalog-hero]');
    const layers = [...sea.querySelectorAll('.island-water-layer')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, shore = anchor.getBoundingClientRect().top;
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
        const height = Math.max(innerHeight, innerWidth * 941 / 1672);
        waves.style.top = `${height * .265}px`;
        surface.style.transform = `translate3d(0, ${shore - height * .265 - y}px, 0)`;
        if (enabled) {
            layers[0].style.transform = `translate3d(0, ${Math.sin(y / 1250) * 32}px, 0)`;
            layers[1].style.transform = `translate3d(0, ${Math.sin(y / 700) * -48}px, 0)`;
        }
    }
    function queue() { if (!frame) frame = requestAnimationFrame(update); }
    function measure() {
        if (hero) {
            const controls = hero.querySelector('.catalog-hero-copy').getBoundingClientRect();
            shore = Math.max(anchor.getBoundingClientRect().top, controls.bottom + scrollY + 64);
            const top = hero.getBoundingClientRect().top + scrollY;
            hero.style.setProperty('--catalog-shore-local', `${shore - top}px`);
        }
        update();
    }
    function sync(state) {
        enabled = state ? state.ambientAllowed : !reduced.matches && !document.hidden;
        sea.classList.toggle('is-paused', !enabled);
        if (reduced.matches) layers.forEach(layer => { layer.style.transform = ''; });
        queue();
    }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    document.addEventListener('visibilitychange', () => sync(window.NextSkillMotion?.snapshot({ element: main, kind: 'ambient' })));
    reduced.addEventListener('change', () => sync(window.NextSkillMotion?.snapshot({ element: main, kind: 'ambient' })));
    if (window.NextSkillMotion) window.NextSkillMotion.subscribe(sync, { element: main, kind: 'ambient' });
    else sync();
    window.NextSkillSeaWorld = {
        referenceHorizon: () => anchor.getBoundingClientRect().top,
        setShore(value) { shore=value;update(); },
        snapshot: () => ({horizon:shore-scrollY,width:innerWidth,height:innerHeight}),
        measure
    };
    document.fonts.ready.then(measure);
    phase();measure();
    window.addEventListener('pageshow', () => { phase();measure(); });
    window.addEventListener('pagehide', () => { cancelAnimationFrame(frame);frame=0; });
})();
