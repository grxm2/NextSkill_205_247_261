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
    const track = document.getElementById('sea-course-track');
    const previous = document.querySelector('.sea-carousel-prev');
    const next = document.querySelector('.sea-carousel-next');
    const heroDock = document.querySelector('.sea-niko [data-buddy-anchor]');
    const journeyDock = document.getElementById('sea-journey-buddy');
    const dockPractice = document.querySelector('.sea-dock-practice');
    // A single Niko moves between two reserved homes, retaining appearance and state.
    function dockCompanion() {
        if (!heroDock || !journeyDock) return;
        const bounds = heroDock.getBoundingClientRect();
        const atHero = bounds.bottom > 32 && bounds.top < innerHeight - 32;
        heroDock.dataset.buddyAnchor = atHero ? 'arrival' : 'harbor';
        journeyDock.dataset.buddyAnchor = atHero ? 'journey' : 'arrival';
        window.NextSkillAgent?.refresh();
    }
    const dockObserver = heroDock && 'IntersectionObserver' in window
        ? new IntersectionObserver(dockCompanion, { rootMargin: '-32px 0px', threshold: 0 }) : null;
    dockObserver?.observe(heroDock);
    window.addEventListener('resize', dockCompanion, options);
    dockPractice?.addEventListener('click', () => {
        const dialog = document.getElementById('niko-practice-dialog');
        dialog?.addEventListener('close', () => dockPractice.focus({ preventScroll: true }), { once: true });
        document.getElementById('niko-practice-start')?.click();
    }, options);
    let paused = false, visible = true, frame = 0, x = 0, y = 0;
<<<<<<< Updated upstream
    let renderedX = 0, renderedY = 0, scrollDepth = 0, geometryDirty = true, lastTime = 0;
=======
    try { paused = localStorage.getItem('sealearn.scene.paused') === 'true'; } catch {}
    function syncCourses() {
        if (!track || !previous || !next) return;
        previous.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    }
    function moveCourses(direction) {
        if (!track) return;
        const card = track.querySelector('.sea-course');
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        const distance = card ? card.getBoundingClientRect().width + gap : track.clientWidth;
        track.scrollBy({ left: distance * direction, behavior: reduce.matches ? 'instant' : 'smooth' });
    }
    previous?.addEventListener('click', () => moveCourses(-1), options);
    next?.addEventListener('click', () => moveCourses(1), options);
    track?.addEventListener('scroll', syncCourses, { passive: true, signal: controller.signal });
    track?.addEventListener('keydown', event => {
        if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Home' || event.key === 'End') {
            track.scrollTo({ left: event.key === 'Home' ? 0 : track.scrollWidth, behavior: reduce.matches ? 'instant' : 'smooth' });
        } else moveCourses(event.key === 'ArrowRight' ? 1 : -1);
    }, options);
    window.addEventListener('resize', syncCourses, options);
    document.fonts?.ready.then(syncCourses);
>>>>>>> Stashed changes
    function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
        renderedX = renderedY = lastTime = 0;
        layers.forEach(layer => { layer.style.transform = ''; layer.style.willChange = ''; });
    }
    function enabled() { return !paused && !reduce.matches && desktop.matches && visible && !document.hidden; }
    function paint(time) {
        frame = 0;
        if (!enabled()) {
            // A preference can change before its MediaQueryList event is delivered.
            // Clear the in-flight transform and refresh the control in that frame.
            sync();
            return;
        }
        // Read geometry only after scrolling/resizing; pointer easing never forces layout.
        if (geometryDirty) {
            scrollDepth = Math.max(-30, Math.min(45, -hero.getBoundingClientRect().top * .08));
            geometryDirty = false;
        }
        // Frame-rate independent easing. Stop requesting frames once the scene settles.
        const blend = 1 - Math.exp(-Math.min(time - (lastTime || time - 16), 64) / 85);
        lastTime = time;
        renderedX += (x - renderedX) * blend;
        renderedY += (y + scrollDepth - renderedY) * blend;
        const settled = Math.abs(x - renderedX) < .05 && Math.abs(y + scrollDepth - renderedY) < .05;
        if (settled) { renderedX = x; renderedY = y + scrollDepth; }
        layers.forEach(layer => {
            const depth = Number(layer.dataset.seaDepth);
            layer.style.transform = `translate3d(${renderedX * depth}px,${renderedY * depth}px,0)`;
            layer.style.willChange = settled ? '' : 'transform';
        });
        if (!settled) queue(); else lastTime = 0;
    }
    function queue() { if (enabled() && !frame) frame = requestAnimationFrame(paint); }
    function sync() {
        stop();
        x = y = 0;
        geometryDirty = true;
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
<<<<<<< Updated upstream
    function updateGeometry() { geometryDirty = true; queue(); }
    window.addEventListener('scroll', updateGeometry, { passive: true, signal: controller.signal });
    window.addEventListener('resize', updateGeometry, options);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop(); else updateGeometry();
    }, options);
    button.addEventListener('click', () => { paused = !paused; sync(); }, options);
=======
    window.addEventListener('scroll', queue, { passive: true, signal: controller.signal });
    button.addEventListener('click', () => {
        paused = !paused;
        try { localStorage.setItem('sealearn.scene.paused', String(paused)); } catch {}
        sync();
    }, options);
>>>>>>> Stashed changes
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
    function revealDestination(hash) {
        if (!hash || hash === '#') return;
        let target;
        try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return; }
        if (!target) return;
        if (target instanceof HTMLDetailsElement) target.open = true;
    }
    document.addEventListener('click', event => {
        const link = event.target.closest('a[href^="#"]');
        if (link) revealDestination(link.hash);
    }, options);
    window.addEventListener('hashchange', () => revealDestination(location.hash), options);
    revealDestination(location.hash);
    // Tear down for page exit, and restore after a back-forward-cache navigation.
    window.addEventListener('pagehide', event => {
        stop();
        observer?.disconnect();
        dockObserver?.disconnect();
        if (!event.persisted) controller.abort();
    });
    window.addEventListener('pageshow', event => {
        if (event.persisted) { observer?.observe(hero); dockObserver?.observe(heroDock); sync(); syncCourses(); dockCompanion(); }
    });
    syncCourses();
    dockCompanion();
    sync();
})();
