/* Depart from the vessel in the current scene before handing off to the clouds. */
(() => {
    'use strict';
    const cloud = document.getElementById('journey-cloud-transition');
    const template = document.getElementById('course-voyage-controls');
    if (!cloud || !template) return;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const key = 'nextskill.journey-arrival';
    const easing = getComputedStyle(document.documentElement).getPropertyValue('--ns-ease-in-out').trim();
    const catalog = document.querySelector('[data-catalog-ocean]');
    const home = document.querySelector('[data-catalog-departure]');
    let active;

    function gentle(trip) {
        return trip.fast || reduced.matches || document.hidden || window.NextSkillMotion?.snapshot().paused;
    }

    function wait(trip, duration) {
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                trip.release = null;
                resolve();
            }, duration);
            trip.release = () => { clearTimeout(timer); trip.release = null; resolve(); };
        });
    }

    function skip() {
        if (!active) return;
        active.fast = true;
        if (active.animation?.playState === 'running') active.animation.pause();
        active.release?.();
        if (cloud.open) cloud.style.setProperty('--jc-cover-duration', '0ms');
    }

    function restore(restoreFocus = false) {
        const trip = active;
        if (!trip) return;
        skip();
        active = null;
        trip.transport?.abort();
        trip.animation?.cancel();
        trip.restoreBoat?.();
        trip.skipButton?.remove();
        trip.inertBefore?.forEach(([node, wasInert]) => { node.inert = wasInert; });
        if (cloud.open) cloud.close();
        cloud.classList.remove('is-covering', 'is-covered');
        cloud.style.removeProperty('--jc-cover-duration');
        document.documentElement.classList.remove('journey-transition-active', 'course-voyage-active');
        if (trip.previousScroll !== undefined) window.scrollTo({ top: trip.previousScroll, behavior: 'instant' });
        window.NextSkillAgent?.refresh();
        window.NextSkillMotion?.refresh();
        if (restoreFocus) {
            const source = trip.trigger?.getClientRects().length ? trip.trigger : document.querySelector('[data-navbar-toggle]');
            source?.focus({ preventScroll: true });
        }
    }

    function lockForVoyage(trip) {
        const skipButton = template.content.firstElementChild.cloneNode(true);
        trip.skipButton = skipButton;
        document.body.append(skipButton);
        document.documentElement.classList.add('course-voyage-active');
        skipButton.addEventListener('click', skip);
        skipButton.focus({ preventScroll: true });
        trip.inertBefore = [...document.body.children]
            .filter(node => node !== skipButton && node !== cloud && !['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE'].includes(node.tagName))
            .map(node => [node, node.inert]);
        trip.inertBefore.forEach(([node]) => { node.inert = true; });
        window.NextSkillSpeech?.dismiss();
    }

    async function sail(trip) {
        const boat = document.querySelector('.catalog-boat, .archipelago-boat[data-vehicle="boat"], #ocean-journey .ow-arrival-motion');
        const seat = boat?.querySelector('[data-buddy-anchor]');
        if (!seat || !boat.getBoundingClientRect().width) return;
        lockForVoyage(trip);

        if (home) {
            window.NextSkillOceanWorld?.hold();
            trip.restoreBoat = () => {
                window.NextSkillOceanWorld?.release();
                window.NextSkillVoyage?.returnToShore();
            };
        }
        let berth = boat.getBoundingClientRect();
        if (berth.top < 0 || berth.bottom > innerHeight) {
            trip.previousScroll = scrollY;
            const shore = Math.max(0, scrollY + berth.bottom - innerHeight * .79);
            window.scrollTo({ top: shore, behavior: 'smooth' });
            await wait(trip, 540);
            if (active !== trip || gentle(trip)) return;
            window.scrollTo({ top: shore, behavior: 'instant' });
        }
        if (home) await window.NextSkillVoyage?.board();
        if (active !== trip || gentle(trip)) return;
        if (catalog) window.NextSkillSeaWorld?.measure();
        berth = boat.getBoundingClientRect();
        if (berth.bottom <= 0 || berth.top >= innerHeight) return;

        const toIsland = /\/learning\/island\/?$/i.test(trip.url.pathname);
        const toHome = /^\/$|\/home(?:\/index)?\/?$/i.test(trip.url.pathname);
        const portal = catalog && toHome ? window.NextSkillCatalogVoyage?.returnThroughPortal(boat) : null;
        const previousRestore = trip.restoreBoat;
        const previousPose = boat.getAttribute('data-voyage');
        seat.setAttribute('data-voyage-seat', '');
        boat.dataset.voyage = 'rowing';
        trip.restoreBoat = () => {
            if (previousPose === null) boat.removeAttribute('data-voyage');
            else boat.dataset.voyage = previousPose;
            seat.removeAttribute('data-voyage-seat');
            portal?.restore?.();
            previousRestore?.();
        };
        window.NextSkillAgent?.refresh();

        const right = Math.max(0, document.documentElement.clientWidth - berth.right + berth.width * .55);
        const left = Math.min(0, -berth.left - berth.width * .55);
        const frames = portal?.frames ?? [
            { transform: 'translate3d(0,0,0)' },
            { transform: `translate3d(${toIsland ? right : left}px,0,0)` }
        ];
        const duration = portal ? 1850 : 1500;
        trip.animation = boat.animate(frames, {
            duration, easing, fill: 'both', composite: portal ? 'replace' : 'add'
        });
        if (catalog && toIsland) trip.sea = window.NextSkillSeaWorld?.snapshot();
        await wait(trip, duration - 390);
    }

    async function departure(trip) {
        if (gentle(trip)) return;
        if (typeof Element.prototype.animate === 'function') await sail(trip);
        if (active !== trip || gentle(trip)) return;

        cloud.className = 'is-covering';
        cloud.querySelector('.jc-label').textContent = trip.courseId
            ? 'กำลังเดินทางสู่เกาะของคุณ…' : 'กำลังเดินทางไปกับ Nimo…';
        if (!cloud.open) cloud.showModal();
        document.documentElement.classList.add('journey-transition-active');
        void cloud.offsetWidth;
        cloud.classList.add('is-covered');
        await wait(trip, 650);
    }

    async function readyIsland(trip) {
        trip.transport = new AbortController();
        const response = await fetch(trip.url.href, {
            credentials: 'same-origin',
            headers: { Accept: 'text/html' },
            signal: AbortSignal.any([trip.transport.signal, AbortSignal.timeout(12000)])
        });
        if (!response.ok || response.redirected || !(await response.text()).includes('id="learning-initial-state"'))
            throw new Error('ยังเตรียมเกาะบทเรียนไม่ได้ กรุณาลองอีกครั้ง');
    }

    async function navigate(trip) {
        if (active) return;
        trip.width = innerWidth;
        trip.height = innerHeight;
        active = trip;
        try {
            await Promise.all([departure(trip), trip.courseId ? readyIsland(trip) : Promise.resolve()]);
            if (active !== trip) return;
            const marker = { url: trip.url.pathname + trip.url.search, at: Date.now(), skip: gentle(trip) };
            if (trip.sea) marker.sea = trip.sea;
            if (trip.courseId) Object.assign(marker, { courseId: trip.courseId, source: catalog ? 'catalog' : 'details' });
            else marker.navigation = true;
            try { sessionStorage.setItem(key, JSON.stringify(marker)); } catch {}
            location.assign(trip.url.href);
        } catch (error) {
            if (active !== trip) return;
            restore(true);
            throw error;
        }
    }

    window.NextSkillCourseVoyage = {
        cancel(trigger) { if (active?.trigger === trigger) restore(true); },
        navigate(value, courseId, trigger) {
            const url = new URL(value, location.href);
            if (url.origin !== location.origin || !/\/learning\/island\/?$/i.test(url.pathname)
                || Number(url.searchParams.get('courseId')) !== courseId) throw new Error('ไม่พบเกาะบทเรียนที่เลือก');
            return navigate({ url, courseId, trigger });
        }
    };

    document.addEventListener('click', event => {
        const trigger = event.target.closest('a[data-navbar-voyage][href]');
        if (!trigger || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey
            || event.shiftKey || trigger.hasAttribute('download') || (trigger.target && trigger.target !== '_self')) return;
        const url = new URL(trigger.href);
        if (url.origin !== location.origin || url.pathname.toLowerCase() === location.pathname.toLowerCase()) return;
        event.preventDefault();
        navigate({ url, trigger }).catch(() => location.assign(url.href));
    });
    document.addEventListener('keydown', event => {
        if (!active || event.key !== 'Escape') return;
        event.preventDefault();
        skip();
    });
    cloud.addEventListener('cancel', event => { if (active) { event.preventDefault(); skip(); } });
    reduced.addEventListener('change', () => { if (reduced.matches) skip(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) skip(); });
    window.addEventListener('resize', () => {
        if (active && (innerWidth !== active.width || Math.abs(innerHeight - active.height) > 120)) skip();
    }, { passive: true });
    window.NextSkillMotion?.subscribe(state => { if (state.reduced || state.paused || state.hidden) skip(); });
    window.addEventListener('pagehide', () => restore());
    window.addEventListener('pageshow', event => { if (event.persisted) restore(); });
})();
