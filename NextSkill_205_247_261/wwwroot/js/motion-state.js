(() => {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const subscriptions = new Set();
    const guide = document.querySelector('.map-guide');
    const storageKey = 'nextskill.agent.v1';
    let paused = false;
    let frame = 0;
    let suspended = false;
    try { paused = JSON.parse(localStorage.getItem(storageKey))?.paused === true; } catch {}

    function visible(element) {
        if (!element) return true;
        if (!element.isConnected || element.hidden || element.closest('[hidden]')) return false;
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
    }
    function snapshot(options = {}, cache = null) {
        const element = options.element;
        const modal = cache ? cache.modal : [...document.querySelectorAll('dialog[open]')].at(-1);
        let sceneVisible;
        if (cache && cache.visibility.has(element)) sceneVisible = cache.visibility.get(element);
        else {
            sceneVisible = visible(element);
            cache?.visibility.set(element, sceneVisible);
        }
        const hidden = document.hidden || suspended;
        const enabled = !paused && !reduce.matches && !hidden && sceneVisible;
        return Object.freeze({
            paused, reduced: reduce.matches, hidden, sceneVisible, dialogOpen: !!modal,
            ambientAllowed: enabled && !modal,
            reactionAllowed: enabled && (!modal || !!element && modal.contains(element))
        });
    }
    function mirror() {
        const mode = reduce.matches ? 'reduced' : paused ? 'paused' : 'active';
        if (guide && guide.dataset.motion !== mode) guide.dataset.motion = mode;
        if (document.body.dataset.motion !== mode) document.body.dataset.motion = mode;
    }
    function refresh() {
        frame = 0;
        mirror();
        // A scene can have several subscribers; measure each element only once
        // per refresh instead of forcing repeated layout reads while scrolling.
        const cache = { modal:[...document.querySelectorAll('dialog[open]')].at(-1), visibility:new Map() };
        subscriptions.forEach(subscription => {
            const state = snapshot(subscription.options, cache);
            const signature = JSON.stringify(state);
            if (signature === subscription.signature) return;
            subscription.signature = signature;
            subscription.callback(state);
        });
    }
    function queue() { if (!frame) frame = requestAnimationFrame(refresh); }
    function setPaused(value) {
        paused = value === true;
        try {
            const previous = JSON.parse(localStorage.getItem(storageKey)) || {};
            localStorage.setItem(storageKey, JSON.stringify({ ...previous, placementVersion: 4, paused }));
        } catch {}
        refresh();
    }
    function subscribe(callback, options = {}) {
        const subscription = { callback, options, signature: '' };
        subscriptions.add(subscription);
        if (options.element) intersection.observe(options.element);
        refresh();
        return () => {
            subscriptions.delete(subscription);
            if (options.element && ![...subscriptions].some(item => item.options.element === options.element)) intersection.unobserve(options.element);
        };
    }
    const intersection = new IntersectionObserver(queue, { threshold: [0, .01] });
    const dialogs = new MutationObserver(queue);
    document.querySelectorAll('dialog').forEach(dialog => dialogs.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
    if (guide) new MutationObserver(() => {
        if (guide.dataset.motion !== 'reduced') paused = guide.dataset.motion === 'paused';
        queue();
    }).observe(guide, { attributes: true, attributeFilter: ['data-motion'] });
    reduce.addEventListener('change', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('resize', queue, { passive: true });
    window.addEventListener('scroll', queue, { passive: true, capture: true });
    window.addEventListener('storage', event => {
        if (event.key !== storageKey) return;
        try { paused = JSON.parse(event.newValue)?.paused === true; } catch {}
        refresh();
    });
    window.addEventListener('pagehide', () => { suspended = true; cancelAnimationFrame(frame); frame = 0; refresh(); });
    window.addEventListener('pageshow', () => { suspended = false; refresh(); });
    window.NextSkillMotion = { snapshot, subscribe, setPaused, togglePaused: () => setPaused(!paused), refresh, visible };
    refresh();
})();
