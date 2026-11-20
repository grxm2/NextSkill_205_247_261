(() => {
    'use strict';
    const root = document.documentElement;
    const storageKey = 'nextskill.theme.v1';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const buttons = [...document.querySelectorAll('[data-theme-toggle]')];
    const scene = document.querySelector('.ow-scene') || document.querySelector('.sj-learn, .practice-page, [data-catalog-ocean], .cj-hero');
    const skyLayer = scene?.querySelector('.ow-sky, .learning-celestial, .cj-celestial');
    let cleanup;
    let celestialAnimations = [];
    let lightFrame = 0;
    let orbit = null;

    function followLight() {
        const lights = [...document.querySelectorAll('.journey-sun,.journey-moon')];
        if (!skyLayer || !lights.length) return;
        const sky = skyLayer.getBoundingClientRect();
        lights.forEach(element => {
            const name = element.classList.contains('journey-sun') ? 'sun' : 'moon';
            const star = element.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, (star.left + star.width / 2 - sky.left) / sky.width * 100));
            const y = Math.max(0, Math.min(100, (star.top + star.height / 2 - sky.top) / sky.height * 100));
            scene.style.setProperty(`--journey-${name}-x`, `${x}%`);
            scene.style.setProperty(`--journey-${name}-y`, `${y}%`);
            scene.style.setProperty(`--journey-${name}-alpha`, getComputedStyle(element).opacity);
        });
        lightFrame = requestAnimationFrame(followLight);
    }

    function settle() {
        clearTimeout(cleanup);
        cancelAnimationFrame(lightFrame);
        lightFrame = 0;
        celestialAnimations.forEach(animation => animation.cancel());
        celestialAnimations = [];
        orbit = null;
        ['sun','moon'].forEach(name => ['x','y','alpha'].forEach(value => scene?.style.removeProperty(`--journey-${name}-${value}`)));
        root.classList.remove('theme-transitioning');
    }
    function apply(theme, animate = false) {
        const dark = theme === 'dark';
        const changed = root.dataset.theme !== theme;
        const canAnimate = animate && changed && !reduced.matches && !document.hidden && !window.NextSkillMotion?.snapshot().paused;
        const positions = canAnimate ? [...document.querySelectorAll('.journey-sun,.journey-moon')].map(element => {
            const style = getComputedStyle(element);
            const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
            return { element, x:matrix.m41, y:matrix.m42, box:element.getBoundingClientRect() };
        }) : [];
        const sun = positions.find(item => item.element.classList.contains('journey-sun'));
        const previousProgress = orbit && celestialAnimations[0]
            ? Math.max(0, Math.min(1, Number(celestialAnimations[0].currentTime || 0) / orbit.duration)) : 0;
        const previousAngle = orbit ? orbit.start + orbit.distance * previousProgress : null;
        celestialAnimations.forEach(animation => animation.cancel());
        celestialAnimations = [];
        cancelAnimationFrame(lightFrame);
        if (sun) {
            root.classList.add('theme-transitioning');
            // Enable transitions before changing their targets, including reversals.
            void root.offsetWidth;
            clearTimeout(cleanup);
        } else settle();
        root.dataset.theme = dark ? 'dark' : 'light';
        if (sun) {
            const sky = sun.element.parentElement.getBoundingClientRect();
            const sunLayoutX = sun.box.left - sun.x, sunLayoutY = sun.box.top - sun.y;
            const anchor = Math.max(.05, Math.min(.95, (sunLayoutX - sky.left) / sky.width));
            const anchorAngle = Math.acos(1 - 2 * anchor);
            const horizon = sky.height * .64;
            const radiusY = (horizon - (sunLayoutY - sky.top)) / Math.sin(anchorAngle);
            const start = previousAngle ?? (anchorAngle + (dark ? 0 : Math.PI));
            const target = anchorAngle + (dark ? Math.PI : 0);
            const distance = ((target - start) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
            const duration = Math.max(1, 2500 * distance / Math.PI);
            orbit = {start, distance, duration};
            positions.forEach(({element,x,y,box}) => {
                const layoutX = box.left - x, layoutY = box.top - y;
                const opposite = element.classList.contains('journey-moon') ? Math.PI : 0;
                const frames = Array.from({length:121}, (_,index) => {
                    const t = index / 120, angle = start + distance * t + opposite;
                    const elevation = Math.sin(angle);
                    const centerX = sky.left + sky.width * (.5 - .5 * Math.cos(angle));
                    const centerY = sky.top + horizon - radiusY * elevation;
                    return {offset:t, transform:`translate3d(${centerX-layoutX-element.offsetWidth/2}px,${centerY-layoutY-element.offsetHeight/2}px,0)`,
                        // A small horizon gap prevents keyframe interpolation
                        // from revealing both bodies at the same instant.
                        opacity:Math.max(0, Math.min(1, (elevation - .08) * 8))};
                });
                celestialAnimations.push(element.animate(frames,{duration,easing:'linear',fill:'both'}));
            });
            cleanup = setTimeout(settle, duration + 100);
            followLight();
        }
        buttons.forEach(button => {
            button.hidden = false;
            button.setAttribute('aria-pressed', String(dark));
            const label = dark ? 'เปิดธีมกลางวัน' : 'เปิดธีมกลางคืน';
            button.title = label;
        });
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b2035' : '#d8f4ff');
        document.dispatchEvent(new CustomEvent('nextskill:theme-change', { detail:{ theme:root.dataset.theme } }));
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
    window.addEventListener('pagehide', settle);
    window.NextSkillMotion?.subscribe(state => { if (state.paused) settle(); });
    apply(root.dataset.theme === 'dark' ? 'dark' : 'light');
})();
