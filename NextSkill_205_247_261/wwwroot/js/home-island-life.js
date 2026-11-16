(() => {
    'use strict';
    const island = document.querySelector('.ow-start-land');
    const art = island?.querySelector('.ow-island-art');
    const life = island?.querySelector('[data-island-wildlife]');
    if (!art && !life) return;
    // The shared policy observes this island, not the viewport-sized ocean scene.
    // Its CSS animations freeze in place as the sailing camera leaves the shore.
    if (window.NextSkillMotion) {
        window.NextSkillMotion.subscribe(state => {
            const mode = state.ambientAllowed ? 'active' : 'paused';
            if (life) life.dataset.wildlifeMotion = mode;
            if (art) art.dataset.islandWind = mode;
        }, { element: island, kind: 'ambient' });
    }
})();
