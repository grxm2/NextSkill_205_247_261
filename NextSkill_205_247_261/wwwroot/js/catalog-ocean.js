(() => {
    'use strict';
    const page = document.querySelector('[data-catalog-ocean]');
    if (!page) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const ocean = page.querySelector('[data-sea-world]');
    const hero = page.querySelector('[data-catalog-hero]');
    const harbor = hero.querySelector('[data-harbor-model]');
    const layers = [...page.querySelectorAll('[data-catalog-parallax]')];
    let frame = 0, ambientAllowed = !reduced.matches, origin = 0, entered = false;

    function parallax() {
        frame = 0;
        if (!ambientAllowed && !reduced.matches) return;
        const distance = reduced.matches ? 0 : Math.min(650, Math.max(0, scrollY - origin));
        layers.forEach(layer => {
            layer.style.transform = `translate3d(0,${-distance * Number(layer.dataset.catalogParallax)}px,0)`;
        });
    }
    function queue() { if (!frame) frame = requestAnimationFrame(parallax); }
    function measure() { origin = page.getBoundingClientRect().top + scrollY; queue(); }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
    window.addEventListener('pageshow', measure);
    measure();

    function enterHarbor() {
        if (entered) return;
        entered = true;
        harbor.dataset.harborArrival = !reduced.matches && ambientAllowed ? 'true' : 'false';
        harbor.dataset.doorState = 'open';
    }
    harbor.dataset.doorState = 'closed';
    if ('IntersectionObserver' in window) {
        const arrival = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) { enterHarbor(); arrival.disconnect(); }
        }, { threshold: .15 });
        arrival.observe(hero);
    } else enterHarbor();

    if (window.NextSkillMotion) {
        window.NextSkillMotion.subscribe(state => {
            ambientAllowed = state.ambientAllowed;
            ocean.dataset.catalogAmbient = ambientAllowed ? 'active' : 'paused';
            queue();
        }, { element: page, kind: 'ambient' });
        window.NextSkillMotion.subscribe(state => {
            const active = state.ambientAllowed;
            hero.dataset.catalogAmbient = active ? 'active' : 'paused';
            harbor.dataset.harborMotion = active ? 'active' : 'paused';
        }, { element: hero, kind: 'ambient' });
    }

    // Default HTML stays visible without JavaScript or motion support.
    if ('IntersectionObserver' in window) {
        const reveal = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                reveal.unobserve(entry.target);
                if (reduced.matches || !window.NextSkillMotion?.snapshot({element:entry.target}).ambientAllowed) return;
                entry.target.animate([
                    { opacity: 0, transform: 'translate3d(0,12px,0)' },
                    { opacity: 1, transform: 'translate3d(0,0,0)' }
                ], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
            });
        }, { threshold: .08 });
        page.querySelectorAll('[data-catalog-reveal]').forEach(card => reveal.observe(card));
    }

    // Day/night, storage sync and the celestial orbit belong to journey-theme.js.
})();
