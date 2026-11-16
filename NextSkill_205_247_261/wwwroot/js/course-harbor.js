(() => {
    'use strict';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    document.querySelectorAll('[data-harbor-model]').forEach(model => {
        const scene = model.closest('.ow-scene');
        let lastArrival, arrivalTimer, ambientAllowed = !reduced.matches;
        function motion() {
            const visibleStage = !scene || document.documentElement.classList.contains('ow-static') || scene.dataset.stage === '2';
            model.dataset.harborMotion = ambientAllowed && visibleStage && !reduced.matches && !document.hidden ? 'active' : 'paused';
        }
        function doors(open, arrival = false) {
            clearTimeout(arrivalTimer);
            model.dataset.harborArrival = arrival && ambientAllowed && !reduced.matches ? 'true' : 'false';
            model.dataset.doorState = open ? 'open' : 'closed';
            if (arrival) arrivalTimer = setTimeout(() => { model.dataset.harborArrival = 'false'; }, 1100);
        }
        function stage() {
            const arrived = !scene || document.documentElement.classList.contains('ow-static') || scene.dataset.voyage === 'docked' || scene.dataset.cvPhase === 'entering';
            if (arrived !== lastArrival) {
                lastArrival = arrived;
                doors(arrived, arrived && !!scene);
            }
            motion();
        }
        // The voyage state follows ScrollTrigger and the automatic boat tour.
        if (scene) new MutationObserver(stage).observe(scene, { attributes: true, attributeFilter: ['data-stage', 'data-voyage'] });
        if (window.NextSkillMotion) window.NextSkillMotion.subscribe(state => { ambientAllowed = state.ambientAllowed; motion(); }, { element: model, kind: 'ambient' });
        reduced.addEventListener('change', stage);
        document.addEventListener('visibilitychange', motion);
        window.addEventListener('pagehide', () => { clearTimeout(arrivalTimer); model.dataset.harborMotion = 'paused'; });
        window.addEventListener('pageshow', stage);
        stage();
    });
})();
