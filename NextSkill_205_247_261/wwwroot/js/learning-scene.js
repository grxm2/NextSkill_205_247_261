// Scroll supplies the timeline. No scroll interception, timer loop, or external library.
(() => {
    'use strict';
    const layers = [...document.querySelectorAll('[data-scene-depth]')];
    const toggle = document.getElementById('scene-motion');
    if (!layers.length || !toggle) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = false;
    let frame = 0;

    function paint() {
        frame = 0;
        const active = !reduce.matches && !paused;
        const mobileScale = innerWidth < 600 ? 0.5 : 1;
        // Bounded displacement stays inside the generous layer overscan on long pages.
        const footer = document.querySelector(".dashboard-footer");
        const entry = footer ? innerHeight - footer.getBoundingClientRect().top : scrollY;
        const travel = Math.min(Math.max(entry, 0), 650) * mobileScale;
        layers.forEach(layer => {
            const y = active ? -(travel * Number(layer.dataset.sceneDepth)) : 0;
            layer.style.transform = `translate3d(0, ${y}px, 0)`;
        });
    }
    function requestPaint() {
        if (!frame && !document.hidden) frame = requestAnimationFrame(paint);
    }
    function sync() {
        document.documentElement.dataset.sceneMotion = reduce.matches ? 'reduced' : paused ? 'paused' : 'active';
        toggle.disabled = reduce.matches;
        toggle.setAttribute('aria-pressed', String(paused || reduce.matches));
        toggle.textContent = reduce.matches ? 'ลดการเคลื่อนไหวแล้ว' : paused ? 'เปิดคลื่นเคลื่อนไหว' : 'พักคลื่น';
        requestPaint();
    }
    toggle.addEventListener('click', () => { paused = !paused; sync(); });
    addEventListener('scroll', requestPaint, { passive: true });
    addEventListener('resize', requestPaint, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
        else requestPaint();
    });
    reduce.addEventListener('change', sync);
    sync();
})();
