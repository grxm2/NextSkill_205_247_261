(() => {
    'use strict';
    const main = document.querySelector('.sj-learn');
    if (!main) return;
    const sea = document.createElement('div');
    sea.className = 'island-water-motion';
    sea.setAttribute('aria-hidden', 'true');
    sea.innerHTML = '<div class="island-water-layer island-water-layer--far"><div class="island-water-drift"></div></div><div class="island-water-layer island-water-layer--near"><div class="island-water-drift"></div></div>';
    main.prepend(sea);
    const layers = [...sea.querySelectorAll('.island-water-layer')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let enabled = false;
    function update() {
        frame = 0;
        if (!enabled) return;
        const y = window.scrollY;
        layers[0].style.transform = `translate3d(0, ${Math.sin(y / 1250) * 32}px, 0)`;
        layers[1].style.transform = `translate3d(0, ${Math.sin(y / 700) * -48}px, 0)`;
    }
    function queue() { if (enabled && !frame) frame = requestAnimationFrame(update); }
    function sync(state) {
        enabled = state ? state.ambientAllowed : !reduced.matches && !document.hidden;
        sea.classList.toggle('is-paused', !enabled);
        if (!enabled && frame) { cancelAnimationFrame(frame); frame = 0; }
        if (reduced.matches) layers.forEach(layer => { layer.style.transform = ''; });
        if (enabled) queue();
    }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    document.addEventListener('visibilitychange', () => sync(window.NextSkillMotion?.snapshot({ element: main, kind: 'ambient' })));
    reduced.addEventListener('change', () => sync(window.NextSkillMotion?.snapshot({ element: main, kind: 'ambient' })));
    if (window.NextSkillMotion) window.NextSkillMotion.subscribe(sync, { element: main, kind: 'ambient' });
    else sync();
})();
