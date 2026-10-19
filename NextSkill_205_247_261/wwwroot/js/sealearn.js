(() => {
    'use strict';
    const hero = document.querySelector('.sea-hero');
    if (!hero) return;
    const layers = [...hero.querySelectorAll('[data-sea-depth]')];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 1024px) and (pointer: fine)');
    const button = document.getElementById('sea-motion');
    const menuButton = document.querySelector('.sea-menu-button');
    const menu = document.getElementById('sea-menu');
    const controller = new AbortController();
    const options = { signal: controller.signal };
    let paused = false, visible = true, frame = 0, x = 0, y = 0;
    function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
        layers.forEach(layer => { layer.style.transform = ''; layer.style.willChange = ''; });
    }
    function enabled() { return !paused && !reduce.matches && desktop.matches && visible; }
    function paint() {
        frame = 0;
        if (!enabled()) return;
        const scrollDepth = Math.max(-30, Math.min(45, -hero.getBoundingClientRect().top * .08));
        layers.forEach(layer => {
            const depth = Number(layer.dataset.seaDepth);
            layer.style.transform = `translate3d(${x * depth}px,${(y + scrollDepth) * depth}px,0)`;
            layer.style.willChange = 'transform';
        });
    }
    function queue() { if (enabled() && !frame) frame = requestAnimationFrame(paint); }
    function sync() {
        stop();
        button.disabled = reduce.matches || !desktop.matches;
        button.setAttribute('aria-pressed', String(paused || reduce.matches || !desktop.matches));
        button.textContent = reduce.matches || !desktop.matches ? 'ฉากนิ่ง · ลดการเคลื่อนไหว' : paused ? 'เปิดเอฟเฟกต์ฉาก' : 'พักเอฟเฟกต์ฉาก';
        queue();
    }
    hero.addEventListener('pointermove', event => {
        if (!enabled()) return;
        const bounds = hero.getBoundingClientRect();
        x = (event.clientX - bounds.left - bounds.width / 2) * .015;
        y = (event.clientY - bounds.top - bounds.height / 2) * .015;
        queue();
    }, options);
    hero.addEventListener('pointerleave', () => { x = y = 0; queue(); }, options);
    // Scroll events only schedule a frame; all geometry reads happen once inside paint.
    window.addEventListener('scroll', queue, { passive: true, signal: controller.signal });
    button.addEventListener('click', () => { paused = !paused; sync(); }, options);
    reduce.addEventListener('change', sync, options);
    desktop.addEventListener('change', sync, options);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) queue(); else stop();
    }) : null;
    observer?.observe(hero);
    function closeMenu() { menu.removeAttribute('data-open'); menuButton.setAttribute('aria-expanded', 'false'); }
    menuButton.addEventListener('click', () => {
        const open = menuButton.getAttribute('aria-expanded') !== 'true';
        menuButton.setAttribute('aria-expanded', String(open));
        menu.toggleAttribute('data-open', open);
    }, options);
    menu.addEventListener('click', event => { if (event.target.closest('a,button')) closeMenu(); }, options);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.hasAttribute('data-open')) { closeMenu(); menuButton.focus(); } }, options);
    document.addEventListener('click', event => { if (!event.target.closest('.sea-nav')) closeMenu(); }, options);
    // Tear down for page exit, and restore after a back-forward-cache navigation.
    window.addEventListener('pagehide', event => {
        stop();
        observer?.disconnect();
        if (!event.persisted) controller.abort();
    });
    window.addEventListener('pageshow', event => {
        if (event.persisted) { observer?.observe(hero); sync(); }
    });
    sync();
})();
