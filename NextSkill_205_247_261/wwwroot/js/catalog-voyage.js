(() => {
    'use strict';
    const overlay = document.getElementById('catalog-voyage');
    if (!overlay) return;
    const root = document.documentElement;
    const scene = document.querySelector('[data-catalog-departure]');
    const catalog = document.querySelector('[data-catalog-ocean]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const catalogKey = 'nextskill.catalog-voyage.v1';
    const islandKey = 'nextskill.journey-arrival';
    const status = overlay.querySelector('.cv-status');
    const skip = overlay.querySelector('.cv-skip');
    const recovery = overlay.querySelector('.cv-recovery');
    const animations = new Set(), delays = new Map();
    let busy = false, fastForward = false, generation = 0, transport, deadline;
    let source, inertBefore = [], requested;
    const portalClips = new Map();

    function portalPoint(art, x, y, track) {
        const gate = art.getBoundingClientRect(), frame = track.getBoundingClientRect();
        return { x: gate.left + gate.width * x - frame.left, y: gate.top + gate.height * y - frame.top };
    }
    function clipToPortal(track, art) {
        // Clip the moving child in its stationary parent's coordinate system:
        // the whole foreground is open water; above the mouth only the arch is visible.
        if (!track) return;
        const d = art.dataset;
        const left = Number(d.portalLeft || .425), right = Number(d.portalRight || .70);
        const mouth = Number(d.portalEntryY || .75), spring = Number(d.portalSpringY || .56);
        const top = Number(d.portalArchTop || .40);
        const l = portalPoint(art, left, mouth, track), r = portalPoint(art, right, mouth, track);
        const ls = portalPoint(art, left, spring, track), rs = portalPoint(art, right, spring, track);
        const peak = portalPoint(art, (left + right) / 2, top, track);
        const span = Math.max(innerWidth, innerHeight) * 2;
        if (!portalClips.has(track)) portalClips.set(track, track.style.clipPath);
        track.style.clipPath = `path('M ${-span} ${l.y} L ${l.x} ${l.y} L ${ls.x} ${ls.y} C ${ls.x} ${peak.y} ${rs.x} ${peak.y} ${rs.x} ${rs.y} L ${r.x} ${r.y} L ${span} ${r.y} L ${span} ${span} L ${-span} ${span} Z')`;
    }

    const gentle = () => fastForward || reduced.matches || document.hidden || window.NextSkillMotion?.snapshot().paused;
    function delay(ms) {
        return new Promise(resolve => {
            const timer = setTimeout(() => { delays.delete(timer); resolve(); }, ms);
            delays.set(timer, resolve);
        });
    }
    function animate(element, frames, duration, easing = 'cubic-bezier(.77,0,.175,1)') {
        if (!element || gentle()) return Promise.resolve();
        const animation = element.animate(frames, { duration, easing, fill: 'both' });
        animations.add(animation);
        // Keep the final pose until navigation or cleanup, including skip/resize.
        return animation.finished.catch(() => {});
    }
    function finishMotion() {
        fastForward = true;
        animations.forEach(animation => { try { animation.finish(); } catch {} });
        delays.forEach((resolve, timer) => { clearTimeout(timer); resolve(); });
        delays.clear();
    }
    function lock() {
        inertBefore = [...document.body.children].filter(node => node !== overlay && !['SCRIPT', 'LINK', 'STYLE'].includes(node.tagName))
            .map(node => [node, node.inert]);
        inertBefore.forEach(([node]) => { node.inert = true; });
    }
    function unlock() { inertBefore.forEach(([node, inert]) => { node.inert = inert; }); inertBefore = []; }
    function cleanup(focus = false) {
        const fallback = requested?.courseId ? '/Learning/Island' : '/Home/Courses';
        const previousScroll = focus && requested?.courseId ? requested.scroll : null;
        generation++; busy = false;
        clearTimeout(deadline); transport?.abort(); transport = null;
        finishMotion(); animations.forEach(animation => animation.cancel()); animations.clear();
        portalClips.forEach((clip, track) => { track.style.clipPath = clip; }); portalClips.clear();
        scene?.querySelector('.cv-depth-scene')?.style.removeProperty('transform-origin');
        overlay.hidden = true; overlay.classList.remove('cv-is-covered', 'cv-is-opaque');
        delete overlay.dataset.phase; recovery.hidden = true; skip.hidden = false;
        root.classList.remove('cv-arrival-pending', 'cv-arrival-running', 'cv-departure-active');
        if (scene) {
            delete scene.dataset.cvPhase;
            scene.dataset.voyage = scene.dataset.stage === '2' ? 'docked' : 'shore';
            window.NextSkillOceanWorld?.release();
        }
        requested = null;
        unlock();
        if (previousScroll !== null) window.scrollTo({ top: previousScroll, behavior: 'instant' });
        if (focus) {
            // At the harbor the hero CTA has already left the camera. Return
            // keyboard focus to a visible navigation control instead.
            const visible = node => node && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
            const target = [source, document.querySelector(`.ns-navbar__link[href="${fallback}"]`), document.querySelector('[data-navbar-toggle]')].find(visible);
            target?.focus({ preventScroll: true });
        }
        window.NextSkillMotion?.refresh();
    }
    function show() {
        overlay.hidden = false; recovery.hidden = true; skip.hidden = false;
        overlay.dataset.phase = 'sailing';
        if (scene) { window.NextSkillOceanWorld?.hold(); root.classList.add('cv-departure-active'); }
        lock(); skip.focus({ preventScroll: true });
    }
    async function cover(run) {
        status.textContent = 'กำลังเตรียมเส้นทางการเรียนรู้ของคุณ…';
        overlay.dataset.phase = 'covering';
        // Commit the banks outside the viewport before moving them inward.
        void overlay.offsetWidth;
        overlay.classList.add('cv-is-covered');
        if (!gentle()) await delay(700);
        if (run !== generation) return;
        overlay.classList.add('cv-is-opaque');
        overlay.dataset.phase = 'covered';
        await delay(gentle() ? 160 : 240);
    }
    async function sail(run) {
        // The scroll controller owns the outer vessel/camera transforms. The
        // doorway approach moves only the child once the long sea voyage ends.
        const vessel = scene.querySelector('.ow-arrival-motion');
        const art = scene.querySelector('.cv-departure-harbor .harbor-model');
        scene.dataset.cvPhase = 'entering';
        status.textContent = 'กำลังเข้าสู่ประตูมิติแห่งการเรียนรู้…';
        await window.NextSkillVoyage?.board();
        scene.dataset.voyage = 'rowing';
        art.dataset.doorState = 'open';
        if (run !== generation || gentle()) return;
        const boat = vessel.getBoundingClientRect(), gate = art.getBoundingClientRect();
        // Keep the bow on the canal's centerline from approach to vanishing
        // point; only depth changes, never a diagonal shortcut through stone.
        const center = Number(art.dataset.portalX || .5);
        const entry = Number(art.dataset.portalEntryY || .75);
        const depthX = Number(art.dataset.portalDepthX || center), depthY = Number(art.dataset.portalDepthY || .70);
        const pose = (x, y, scale) => ({
            transform: `translate3d(${gate.left + gate.width * x - (boat.left + boat.width * .5)}px,${gate.top + gate.height * y - (boat.top + boat.height * .85)}px,0) scale(${scale})`, opacity: 1
        });
        clipToPortal(scene.querySelector('.ow-vessel'), art);
        const camera = scene.querySelector('.cv-depth-scene');
        if (camera) {
            const frame = camera.getBoundingClientRect();
            camera.style.transformOrigin = `${gate.left + gate.width * center - frame.left}px ${gate.top + gate.height * entry - frame.top}px`;
            animate(camera, [{transform:'scale(1)'},{transform:'scale(1.035)'}], 2800);
        }
        const travel = animate(vessel, [
            { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
            { ...pose(center, entry, .70), offset: .38 },
            { ...pose(center + (depthX-center)*.65, entry + (depthY-entry)*.65, .40), offset: .72 },
            { ...pose(depthX, depthY, .20), offset: .96 },
            { ...pose(depthX, depthY, .18), opacity: 0 }
        ], 2800);
        await delay(2000);
        if (run !== generation) return;
        scene.dataset.cvPhase = 'entering';
        status.textContent = 'ผ่านประตูสู่โลกแห่งการเรียนรู้…';
        // The boat stays visible while crossing the mouth and receding inside;
        // clouds cover the final disappearance at the far end of the corridor.
        await Promise.all([travel, cover(run)]);
    }
    function fail(url, courseId) {
        clearTimeout(deadline);
        overlay.dataset.phase = 'error';
        overlay.classList.add('cv-is-covered', 'cv-is-opaque');
        status.textContent = courseId ? 'ยังเปิดเกาะบทเรียนไม่ได้ ลองอีกครั้งได้เลย' : 'ยังเปิดหน้าคอร์สไม่ได้ ลองอีกครั้งได้เลย';
        skip.hidden = true; recovery.hidden = false;
        const retry = recovery.querySelector('[data-cv-retry]');
        retry.href = url.href;
        retry.textContent = courseId ? 'ลองเปิดเกาะของฉันอีกครั้ง' : 'ลองเปิดหน้าคอร์สอีกครั้ง';
        retry.focus({ preventScroll: true });
    }
    async function depart({ url, trigger, courseId }) {
        if (busy) return;
        busy = true; fastForward = false; source = trigger;
        const run = ++generation;
        show();
        transport = new AbortController();
        deadline = setTimeout(() => transport?.abort(), 12000);
        // Warm the real GET while sailing; never select a course or change progress here.
        const targetMarkup = courseId ? 'id="learning-initial-state"' : 'data-catalog-ocean';
        const ready = fetch(url.href, { credentials: 'same-origin', signal: transport.signal, headers: { Accept: 'text/html' } })
            .then(async response => ({ ok: response.ok && !response.redirected && (await response.text()).includes(targetMarkup) }))
            .catch(() => ({ ok: false }));
        if (!gentle()) await sail(run);
        if (run !== generation) return;
        if (overlay.dataset.phase !== 'covered') await cover(run);
        const result = await ready;
        if (run !== generation) return;
        clearTimeout(deadline);
        if (!result.ok) { fail(url, courseId); return; }
        const marker = { url: url.pathname + url.search, at: Date.now(), skip: courseId ? gentle() : fastForward };
        if (courseId) Object.assign(marker, { courseId, source: 'home' });
        try { sessionStorage.setItem(courseId ? islandKey : catalogKey, JSON.stringify(marker)); } catch {}
        location.assign(url.href);
    }
    async function arrive() {
        let marker;
        try { marker = JSON.parse(sessionStorage.getItem(catalogKey)); sessionStorage.removeItem(catalogKey); } catch {}
        const age = Date.now() - marker?.at;
        if (!catalog || !marker || marker.url !== location.pathname + location.search || age < 0 || age >= 30000) {
            root.classList.remove('cv-arrival-pending'); return;
        }
        busy = true; fastForward = marker.skip === true;
        const run = ++generation;
        overlay.classList.add('cv-is-covered', 'cv-is-opaque');
        show(); overlay.dataset.phase = 'covered';
        clearTimeout(window.catalogVoyageFallback);
        root.classList.remove('cv-arrival-pending');
        status.textContent = 'ถึงอ่าวแห่งการเรียนรู้แล้ว';
        const art = catalog.querySelector('.catalog-harbor .harbor-model');
        art.dataset.doorState = 'open';
        // Only wait for the visible scene and first covers, with a bounded decode deadline.
        await Promise.race([
            Promise.all([
                document.fonts.ready,
                ...[...catalog.querySelectorAll('.catalog-harbor-scene img, .ns-course-card-art img[loading="eager"]')].map(image => image.decode().catch(() => {})),
                ...[...catalog.querySelectorAll('.catalog-harbor image')].map(resource => {
                    const image = new Image(); image.src = resource.getAttribute('href');
                    return image.decode().catch(() => {});
                })
            ]),
            delay(1200)
        ]);
        if (run !== generation) return;
        root.classList.add('cv-arrival-running');
        const boat = catalog.querySelector('.catalog-boat');
        const b = boat.getBoundingClientRect(), g = art.getBoundingClientRect();
        const arrivalPose = (x, y, scale) => ({transform:`translate3d(${g.left+g.width*x-(b.left+b.width*.5)}px,${g.top+g.height*y-(b.top+b.height*.85)}px,0) scale(${scale})`});
        clipToPortal(catalog.querySelector('.catalog-boat-track'), art);
        const arrival = animate(boat, [
            { ...arrivalPose(Number(art.dataset.portalDepthX || .59),Number(art.dataset.portalDepthY || .70),.20), opacity: 0 },
            { opacity: 1, offset: .15 },
            { ...arrivalPose(Number(art.dataset.portalX || .56),Number(art.dataset.portalEntryY || .75),.70), opacity: 1, offset: .58 },
            { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 }
        ], 1400);
        overlay.dataset.phase = 'revealing';
        void overlay.offsetWidth;
        overlay.classList.remove('cv-is-opaque', 'cv-is-covered');
        const content = [catalog.querySelector('.catalog-hero-copy'), catalog.querySelector('.catalog-tools'), catalog.querySelector('.ns-course-section-heading')];
        content.forEach((node, index) => animate(node, [
            { opacity: 0, transform: 'translate3d(0,8px,0)' },
            { opacity: 1, transform: 'translate3d(0,0,0)' }
        ], 240 + index * 40, 'cubic-bezier(.23,1,.32,1)'));
        await Promise.all([arrival, delay(gentle() ? 160 : 700)]);
        if (run !== generation) return;
        cleanup();
        const heading = document.getElementById('catalog-title');
        heading.tabIndex = -1; heading.focus({ preventScroll: true });
    }
    skip.addEventListener('click', finishMotion);
    overlay.querySelector('[data-cv-cancel]').addEventListener('click', () => cleanup(true));
    document.addEventListener('keydown', event => {
        if (!busy || event.key !== 'Escape') return;
        event.preventDefault();
        if (overlay.dataset.phase === 'error') cleanup(true); else finishMotion();
    });
    if (scene) {
        document.addEventListener('click', async event => {
            const link = event.target.closest('a[href]');
            if (!link || overlay.contains(link) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || link.hasAttribute('download') || link.target && link.target !== '_self') return;
            const url = new URL(link.href, location.href);
            if (url.origin !== location.origin) return;
            const courseId = Number(url.searchParams.get('courseId'));
            const resume = link.hasAttribute('data-continue-voyage') && url.pathname.toLowerCase() === '/learning/island' && Number.isSafeInteger(courseId) && courseId > 0;
            if (!resume && !/^\/Home\/Courses\/?$/i.test(url.pathname)) return;
            event.preventDefault();
            if (busy) return;
            const trip = { url, trigger: link, courseId: resume ? courseId : null, scroll: requested?.scroll ?? scrollY };
            requested = trip;
            scene.dataset.cvPhase = 'traveling';
            if (!await window.NextSkillOceanWorld?.travelToHarbor() && requested === trip) depart(trip);
        });
        document.addEventListener('nextskill:ocean-docked', () => {
            if (busy) return;
            depart(requested || { url: new URL('/Home/Courses', location.origin), trigger: scene.querySelector('[data-catalog-voyage]') });
        });
        window.NextSkillMotion?.subscribe(state => {
            scene.classList.toggle('ow-motion-paused', !state.ambientAllowed);
            if (busy && (state.reduced || state.paused || state.hidden)) finishMotion();
        }, { element: scene, kind: 'ambient' });
    }
    reduced.addEventListener('change', () => { if (busy && reduced.matches) finishMotion(); });
    document.addEventListener('visibilitychange', () => { if (busy && document.hidden) finishMotion(); });
    window.addEventListener('resize', () => { if (busy) finishMotion(); });
    window.addEventListener('pagehide', () => {
        const previousScroll = requested?.courseId ? requested.scroll : null;
        cleanup();
        if (previousScroll !== null) window.scrollTo({ top: previousScroll, behavior: 'instant' });
    });
    window.addEventListener('pageshow', event => { if (event.persisted) cleanup(); });
    if (catalog) arrive();
    if (catalog) {
        document.getElementById('buddy-agent-handle')?.setAttribute('tabindex', '-1');
        window.NextSkillMotion?.subscribe(state => { if (busy && (state.paused || state.reduced || state.hidden)) finishMotion(); });
    }
})();
