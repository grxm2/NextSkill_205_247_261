(() => {
    'use strict';
    const root = document.documentElement;
    const storageKey = 'nextskill.theme.v1';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const buttons = [...document.querySelectorAll('[data-theme-toggle]')];
    const sky = document.querySelector('[data-journey-celestial]');
    const scene = sky?.closest('.ow-scene, .sj-learn, .practice-page, [data-catalog-ocean], .cj-hero');
    const appearance = ['background', 'border-radius', 'box-shadow', 'filter'];
    const details = [...appearance, 'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'transform', 'opacity', 'mix-blend-mode'];
    let flight = null;
    let cleanup;
    let lightFrame = 0;

    function copyStyles(source, target, properties) {
        const style = getComputedStyle(source);
        for (const property of properties) target.style.setProperty(property, style.getPropertyValue(property));
    }

    function makeFlight() {
        const sources = [...sky.querySelectorAll(':scope > :is(.journey-sun,.journey-moon)')];
        if (sources.length !== 2) return null;
        const viewportWidth = root.clientWidth;
        const viewportHeight = innerHeight;
        const landmarks = sources.map(source => {
            const rect = source.getBoundingClientRect();
            const transform = getComputedStyle(source).transform;
            const matrix = new DOMMatrixReadOnly(transform === 'none' ? undefined : transform);
            return { source, width: rect.width, height: rect.height, x: rect.left - matrix.m41, y: rect.top - matrix.m42 };
        });
        if (landmarks.some(orb => !orb.width || !orb.height || orb.y < 0 || orb.y > viewportHeight)) return null;

        // Past both viewport edges, including the largest glow and the sun's rays.
        const overshoot = Math.max(120, ...landmarks.map(orb => orb.width * 3.6));
        const span = viewportWidth + overshoot * 2;
        const layer = document.createElement('div');
        layer.className = 'journey-orbit-layer';
        layer.setAttribute('aria-hidden', 'true');
        const tracks = landmarks.map(orb => {
            const moon = orb.source.classList.contains('journey-moon');
            const center = orb.source.cloneNode(true);
            center.className = 'journey-orbit-body';
            center.dataset.orbitBody = moon ? 'moon' : 'sun';
            center.style.width = orb.width + 'px';
            center.style.height = orb.height + 'px';
            copyStyles(orb.source, center, appearance);
            [...center.children].forEach((child, index) => copyStyles(orb.source.children[index], child, details));
            layer.append(center);
            const angle = Math.acos(1 - 2 * (orb.x + overshoot) / span);
            const rise = Math.min(viewportHeight * .16, orb.y * .86, 128);
            return {
                center, name: moon ? 'moon' : 'sun',
                halfWidth: orb.width / 2, halfHeight: orb.height / 2,
                restingAngle: angle + (moon ? Math.PI : 0),
                horizon: orb.y + rise, radius: rise / Math.sin(angle)
            };
        });
        document.body.append(layer);
        sky.classList.add('journey-orbit-source');
        return { layer, tracks, span, overshoot, animations: [] };
    }

    function followLight() {
        if (!flight || !scene) return;
        const bounds = sky.getBoundingClientRect();
        for (const { name, center } of flight.tracks) {
            const star = center.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, (star.left + star.width / 2 - bounds.left) / bounds.width * 100));
            const y = Math.max(0, Math.min(100, (star.top + star.height / 2 - bounds.top) / bounds.height * 100));
            scene.style.setProperty('--journey-' + name + '-x', x + '%');
            scene.style.setProperty('--journey-' + name + '-y', y + '%');
            scene.style.setProperty('--journey-' + name + '-alpha', getComputedStyle(center).opacity);
        }
        lightFrame = requestAnimationFrame(followLight);
    }

    function settle() {
        clearTimeout(cleanup);
        cancelAnimationFrame(lightFrame);
        if (flight) {
            flight.animations.forEach(animation => animation.cancel());
            flight.layer.remove();
            flight = null;
            sky.classList.remove('journey-orbit-source');
        }
        for (const name of ['sun', 'moon']) {
            for (const variable of ['x', 'y', 'alpha']) scene?.style.removeProperty('--journey-' + name + '-' + variable);
        }
        root.classList.remove('theme-transitioning');
    }

    function runOrbit(dark, wasDark) {
        cancelAnimationFrame(lightFrame);
        const { animations, phase, distance, duration, tracks, span, overshoot } = flight;
        const progress = animations.length
            ? Math.max(0, Math.min(1, (animations[0].currentTime ?? 0) / duration))
            : 0;
        const start = animations.length ? phase + distance * progress : Number(wasDark);
        const forward = ((Number(dark) - start) % 2 + 2) % 2;
        // Retarget mid-flight from the current phase along the shorter arc.
        const remaining = animations.length && forward > 1 ? forward - 2 : forward;
        const travelTime = Math.max(1, 2500 * Math.abs(remaining));
        animations.forEach(animation => animation.cancel());
        flight.phase = start;
        flight.distance = remaining;
        flight.duration = travelTime;

        flight.animations = tracks.map(track => {
            const frames = Array.from({ length: 121 }, (_, index) => {
                const offset = index / 120;
                const angle = track.restingAngle + Math.PI * (start + remaining * offset);
                const elevation = Math.sin(angle);
                const x = span * (.5 - .5 * Math.cos(angle)) - overshoot;
                const y = track.horizon - track.radius * elevation;
                return {
                    offset,
                    transform: 'translate3d(' + (x - track.halfWidth) + 'px,' + (y - track.halfHeight) + 'px,0)',
                    // Switch hemispheres only after the full orb has left the viewport.
                    opacity: elevation >= 0 ? 1 : 0
                };
            });
            return track.center.animate(frames, { duration: travelTime, easing: 'linear', fill: 'both' });
        });

        cleanup = setTimeout(settle, Math.max(travelTime + 80, 1300));
        followLight();
    }

    function apply(theme, animate = false) {
        const dark = theme === 'dark';
        const wasDark = root.dataset.theme === 'dark';
        const canAnimate = animate && dark !== wasDark && sky && !reduced.matches
            && !document.hidden && !window.NextSkillMotion?.snapshot().paused;
        if (canAnimate) {
            flight ??= makeFlight();
            root.classList.add('theme-transitioning');
            // Commit the sky's previous colors before changing their targets.
            void root.offsetWidth;
            clearTimeout(cleanup);
        } else {
            settle();
        }
        root.dataset.theme = dark ? 'dark' : 'light';
        if (canAnimate) {
            if (flight) runOrbit(dark, wasDark);
            else cleanup = setTimeout(settle, 1300);
        }
        buttons.forEach(button => {
            button.hidden = false;
            button.setAttribute('aria-pressed', String(dark));
            button.title = dark ? 'เปิดธีมกลางวัน' : 'เปิดธีมกลางคืน';
        });
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b2035' : '#d8f4ff');
        document.dispatchEvent(new CustomEvent('nextskill:theme-change', { detail: { theme: root.dataset.theme } }));
    }

    buttons.forEach(button => button.addEventListener('click', () => {
        const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(storageKey, theme); } catch {}
        apply(theme, true);
    }));
    window.addEventListener('storage', event => {
        if (event.key === storageKey) apply(event.newValue === 'dark' ? 'dark' : 'light');
    });
    reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
    window.addEventListener('resize', settle);
    window.addEventListener('pagehide', settle);
    window.NextSkillMotion?.subscribe(state => { if (state.paused) settle(); });
    apply(root.dataset.theme === 'dark' ? 'dark' : 'light');
})();
