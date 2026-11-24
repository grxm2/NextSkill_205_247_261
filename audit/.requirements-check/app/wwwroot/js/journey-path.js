(() => {
    'use strict';
    const root = document.getElementById('learning-path');
    const control = document.getElementById('journey-motion');
    const traveler = document.getElementById('journey-traveler');
    if (!root || !control || !traveler) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const storageKey = 'nextskill.journey.motion.v1';
    const maps = [...root.querySelectorAll('.journey-steps')].map(canvas => ({
        canvas, svg: canvas.querySelector('svg'), path: canvas.querySelector('.map-track'),
        nodes: [...canvas.querySelectorAll('.journey-step')], points: [], length: 0
    }));
    let paused = false;
    try { paused = JSON.parse(localStorage.getItem(storageKey))?.paused === true; } catch {}
    let keyboard = false;
    let frame = 0;
    let needsMeasure = true;
    let alive = true;
    let welcomed = false;
    let welcomeAnimation;
    let modalOpen = !!document.querySelector('dialog[open]');

    function allowed() { return !paused && !reduce.matches && !document.hidden && !modalOpen && !keyboard; }
    function curve(points) {
        if (!points.length) return '';
        let d = `M${points[0].x} ${points[0].y}`;
        for (let index = 1; index < points.length; index++) {
            const a = points[index - 1], b = points[index], middle = (a.y + b.y) / 2;
            d += ` C${a.x} ${middle} ${b.x} ${middle} ${b.x} ${b.y}`;
        }
        return d;
    }
    function measure() {
        // Read all geometry first. Labels, zoom and viewport width cannot detach the road from a node.
        const geometry = maps.map(map => {
            const box = map.canvas.getBoundingClientRect();
            return { box, points: map.nodes.map(node => {
                const button = node.querySelector('.level-node').getBoundingClientRect();
                return { x: button.left + button.width / 2 - box.left, y: button.top + button.height / 2 - box.top };
            }) };
        });
        maps.forEach((map, index) => {
            const { box, points } = geometry[index];
            if (!box.width || !box.height) return;
            map.points = points;
            map.svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
            const d = curve(points);
            map.svg.querySelectorAll('.map-ribbon-edge,.map-track,.map-ribbon-stitch').forEach(path => path.setAttribute('d', d));
            const completed = map.nodes.findIndex(node => !node.classList.contains('completed'));
            const count = completed < 0 ? points.length : completed;
            map.svg.querySelector('.map-track-complete').setAttribute('d', count ? curve(points.slice(0, Math.min(points.length, count + 1))) : '');
            map.length = map.path.getTotalLength();
        });
        needsMeasure = false;
    }
    function paint() {
        frame = 0;
        if (!alive) return;
        if (needsMeasure) measure();
        if (!allowed()) { traveler.style.opacity = '0'; return; }
        const focus = innerHeight * .58;
        const visible = maps.map(map => ({ map, box: map.canvas.getBoundingClientRect() }))
            .filter(({ map, box }) => map.length > 0 && box.bottom > 0 && box.top < innerHeight)
            .sort((a, b) => Math.max(0, a.box.top - focus, focus - a.box.bottom) - Math.max(0, b.box.top - focus, focus - b.box.bottom));
        const active = visible[0];
        if (!active || focus < active.box.top - 45 || focus > active.box.bottom + 45) { traveler.style.opacity = '0'; return; }
        const { map, box } = active;
        const y = Math.max(map.points[0].y, Math.min(map.points.at(-1).y, focus - box.top));
        // The ribbon is monotonic in Y. Find its actual point, rather than guessing from a percentage.
        let low = 0, high = map.length;
        for (let index = 0; index < 11; index++) { const middle = (low + high) / 2; if (map.path.getPointAtLength(middle).y < y) low = middle; else high = middle; }
        const distance = (low + high) / 2;
        const point = map.path.getPointAtLength(distance);
        const tangent = map.path.getPointAtLength(Math.min(map.length, distance + 2));
        const previous = map.path.getPointAtLength(Math.max(0, distance - 2));
        const angle = Math.atan2(tangent.y - previous.y, tangent.x - previous.x) * 180 / Math.PI;
        if (traveler.parentElement !== map.svg) map.svg.append(traveler);
        traveler.querySelector('.traveler-position').style.transform = `translate(${point.x}px,${point.y}px)`;
        traveler.querySelector('.traveler-needle').style.transform = `rotate(${angle}deg)`;
        [...traveler.querySelectorAll('.traveler-tail')].forEach((tail, index) => {
            const behind = map.path.getPointAtLength(Math.max(0, distance - (3 - index) * 12));
            tail.style.transform = `translate(${behind.x}px,${behind.y}px)`;
        });
        traveler.style.opacity = '1';
    }
    function request(measureAgain = false) {
        needsMeasure ||= measureAgain;
        if (alive && !frame) frame = requestAnimationFrame(paint);
    }
    function sync() {
        root.dataset.motion = reduce.matches ? 'reduced' : paused ? 'paused' : modalOpen || document.hidden || keyboard ? 'suspended' : 'active';
        control.disabled = reduce.matches;
        control.setAttribute('aria-pressed', String(paused || reduce.matches));
        const label = reduce.matches ? 'ลดเอฟเฟกต์ตามการตั้งค่าอุปกรณ์' : paused ? 'เปิดเอฟเฟกต์เส้นทาง' : 'พักเอฟเฟกต์เส้นทาง';
        control.setAttribute('aria-label', label); control.title = label;
        if (!allowed()) { traveler.style.opacity = '0'; welcomeAnimation?.cancel(); }
        request();
    }
    control.addEventListener('click', () => {
        paused = !paused;
        try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, paused })); } catch {}
        if (paused) window.scrollTo({ top: scrollY, left: scrollX, behavior: 'instant' });
        sync();
    });
    document.addEventListener('keydown', event => {
        if (['Tab','ArrowDown','ArrowUp','PageDown','PageUp','Home','End','Enter',' '].includes(event.key)) { keyboard = true; sync(); }
    });
    function pointerMode() { if (keyboard) { keyboard = false; sync(); } }
    document.addEventListener('pointerdown', pointerMode, { passive: true });
    document.addEventListener('wheel', pointerMode, { passive: true });
    window.addEventListener('scroll', () => request(), { passive: true });
    window.addEventListener('resize', () => request(true), { passive: true });
    document.addEventListener('visibilitychange', sync);
    reduce.addEventListener('change', sync);
    const sizes = new ResizeObserver(() => request(true));
    maps.forEach(map => sizes.observe(map.canvas));
    const dialogs = new MutationObserver(() => { modalOpen = !!document.querySelector('dialog[open]'); sync(); });
    document.querySelectorAll('dialog').forEach(dialog => dialogs.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
    const aura = root.querySelector('.journey-aura');
    const welcome = new IntersectionObserver(entries => {
        if (welcomed || !allowed() || !entries.some(entry => entry.isIntersecting)) return;
        welcomed = true;
        welcomeAnimation = aura?.animate([{ transform: 'scale(.98)', opacity: .8 }, { transform: 'scale(1.18)', opacity: .2 }, { transform: 'scale(1)', opacity: 1 }], { duration: 250, easing: 'cubic-bezier(0.23,1,0.32,1)' });
    }, { rootMargin: '-12% 0px -20% 0px', threshold: .5 });
    const current = root.querySelector('.current .level-node');
    if (current) welcome.observe(current);
    window.addEventListener('storage', event => {
        if (event.key !== storageKey && event.key !== null) return;
        try { paused = JSON.parse(localStorage.getItem(storageKey))?.paused === true; } catch { paused = false; }
        sync();
    });
    window.addEventListener('pagehide', () => { alive = false; cancelAnimationFrame(frame); frame = 0; welcomeAnimation?.cancel(); sizes.disconnect(); dialogs.disconnect(); welcome.disconnect(); });
    window.addEventListener('pageshow', () => {
        alive = true;
        maps.forEach(map => sizes.observe(map.canvas));
        document.querySelectorAll('dialog').forEach(dialog => dialogs.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
        if (current) welcome.observe(current);
        modalOpen = !!document.querySelector('dialog[open]'); sync(); request(true);
    });
    window.NextSkillJourney = { isPaused: () => paused || reduce.matches };
    document.fonts?.ready.then(() => request(true));
    sync();
})();
