(() => {
    'use strict';
    const page = document.querySelector('[data-catalog-ocean]');
    if (!page) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia('(max-width: 767px)');
    const hero = page.querySelector('[data-catalog-hero]');
    const harbor = hero.querySelector('[data-harbor-model]');
    const chips = page.querySelector('[data-catalog-chip-scroll]');
    let entered = false;
    let chipFrame = 0;

    function showChipEdges() {
        chipFrame = 0;
        chips.toggleAttribute('data-more-start', chips.scrollLeft > 1);
        chips.toggleAttribute('data-more-end', chips.scrollWidth - chips.clientWidth - chips.scrollLeft > 1);
    }
    function queueChipEdges() {
        if (!chipFrame) chipFrame = requestAnimationFrame(showChipEdges);
    }
    chips.addEventListener('scroll', queueChipEdges, { passive: true });
    new ResizeObserver(queueChipEdges).observe(chips);
    document.fonts.ready.then(() => {
        const current = chips.querySelector('[aria-current="true"]');
        const clipped = current && current.getBoundingClientRect().right - chips.getBoundingClientRect().right;
        if (clipped > 0) chips.scrollLeft += clipped + 8;
        queueChipEdges();
    });

    function enterHarbor() {
        if (entered) return;
        entered = true;
        harbor.dataset.harborArrival = String(!reduced.matches && hero.dataset.catalogAmbient === 'active');
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
                const shift = compact.matches ? 0 : entry.target.clientHeight * .025;
                entry.target.animate([
                    { opacity: 0, transform: `translate3d(0,${shift}px,0)` },
                    { opacity: 1, transform: 'translate3d(0,0,0)' }
                ], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
            });
        }, { threshold: .08 });
        page.querySelectorAll('[data-catalog-reveal]').forEach(card => reveal.observe(card));
    }

    // Day/night, storage sync and the celestial orbit belong to journey-theme.js.
})();
