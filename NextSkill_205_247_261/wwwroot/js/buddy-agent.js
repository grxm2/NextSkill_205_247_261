(() => {
    'use strict';
    const layer = document.getElementById('buddy-layer');
    const root = document.getElementById('nextskill-agent');
    if (!layer || !root) return;
    const robot = root.querySelector('.skill-buddy');
    const handle = document.getElementById('buddy-agent-handle');
    const menu = document.getElementById('buddy-agent-menu');
    const pause = document.getElementById('agent-pause');
    const status = document.getElementById('agent-status');
    const guide = document.querySelector('.map-guide');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = false;
    try { paused = JSON.parse(localStorage.getItem('nextskill.agent.v1'))?.paused === true; } catch {}

    // Placement is structural. Old drag coordinates and follow settings are discarded.
    function save() {
        try { localStorage.setItem('nextskill.agent.v1', JSON.stringify({ placementVersion: 4, paused })); } catch {}
    }
    function motionAllowed() { return !paused && !reduce.matches && !document.hidden; }
    function closeMenu(restoreFocus = false) {
        menu.hidden = true;
        handle.setAttribute('aria-expanded', 'false');
        if (restoreFocus && !root.hidden) handle.focus({ preventScroll: true });
    }
    function positionMenu() {
        if (menu.hidden) return;
        const box = root.getBoundingClientRect();
        const width = menu.offsetWidth;
        const height = menu.offsetHeight;
        const rightFits = box.right + width + 14 <= innerWidth - 12;
        const desiredX = rightFits ? box.right + 14 : box.left - width - 14;
        menu.style.left = `${Math.max(12, Math.min(innerWidth - width - 12, desiredX))}px`;
        menu.style.top = `${Math.max(12, Math.min(innerHeight - height - 12, box.top - 12))}px`;
    }
    function refresh() {
        const modal = [...document.querySelectorAll('dialog[open]')].at(-1);
        const coach = document.getElementById('buddy-coach');
        const slot = modal ? modal.querySelector('[data-buddy-anchor]')
            : coach && !coach.hidden ? coach.querySelector('[data-buddy-anchor]')
            : document.querySelector('[data-buddy-anchor="arrival"]');
        const parent = modal || document.body;
        if (layer.parentElement !== parent) parent.append(layer);
        root.hidden = !slot;
        if (slot) {
            if (root.parentElement !== slot) slot.append(root);
            const scale = Math.min(1, slot.clientWidth / 200, slot.clientHeight / 230);
            root.style.transform = `scale(${scale})`;
            root.dataset.context = slot.dataset.buddyAnchor;
            robot.dataset.context = slot.dataset.buddyAnchor;
        }
        window.NextSkillBuddyMotion?.refresh();
        positionMenu();
    }
    function sync() {
        pause.disabled = reduce.matches;
        pause.setAttribute('aria-pressed', String(paused || reduce.matches));
        pause.textContent = reduce.matches ? 'ลดการเคลื่อนไหวตามอุปกรณ์' : paused ? 'ขยับต่อได้เลย' : 'พักการเคลื่อนไหว';
        if (!motionAllowed()) delete robot.dataset.speaking;
        window.NextSkillBuddyMotion?.refresh();
    }
    function appearance() {
        try {
            const value = JSON.parse(localStorage.getItem('nextskill.companion.v1'));
            if (value?.version !== 1) return;
            if (['sprout', 'sky', 'sunshine', 'berry'].includes(value.colour)) robot.dataset.colour = value.colour;
            const stars = Number.isInteger(value.stars) && value.stars >= 0 ? value.stars : 0;
            robot.dataset.accessory = value.accessory === 'scarf' && stars >= 3 ? 'scarf' : value.accessory === 'star' && stars >= 1 ? 'star' : 'none';
            robot.dataset.level = String(stars >= 6 ? 3 : stars >= 3 ? 2 : 1);
            if (typeof value.name === 'string') document.querySelectorAll('[data-buddy-name]').forEach(node => { node.textContent = value.name.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 18) || 'Niko'; });
        } catch {}
    }

    handle.addEventListener('click', () => {
        menu.hidden = !menu.hidden;
        handle.setAttribute('aria-expanded', String(!menu.hidden));
        positionMenu();
        if (!menu.hidden) menu.querySelector('button')?.focus({ preventScroll: true });
    });
    pause.addEventListener('click', () => {
        const control = document.getElementById('buddy-motion');
        if (control) control.click();
        else { paused = !paused; save(); sync(); }
    });
    menu.querySelectorAll('[data-agent-action]').forEach(button => button.addEventListener('click', () => {
        closeMenu();
        const action = button.dataset.agentAction;
        if (action === 'practice') document.getElementById('niko-practice-start')?.click();
        if (action === 'studio') document.getElementById('studio-launch')?.click();
        if (action === 'tour') document.getElementById('buddy-tour-start')?.click();
        if (action === 'course-help') document.getElementById('niko-course-help')?.click();
    }));
    function buildPosePicker() {
        const container = document.getElementById('agent-pose-options');
        container.replaceChildren();
        window.NextSkillBuddyMotion.list().filter(entry => !['lift', 'land'].includes(entry.pose)).forEach(entry => {
            const button = document.createElement('button');
            button.type = 'button'; button.dataset.agentPose = entry.pose; button.textContent = entry.label;
            button.addEventListener('click', event => {
                window.NextSkillBuddyMotion.play(entry.pose, robot, { motion: event.detail > 0 });
                status.textContent = `คู่หู: ${entry.label}`;
            });
            container.append(button);
        });
    }
    document.addEventListener('nextskill:buddy-ready', buildPosePicker);
    document.addEventListener('nextskill:buddy-expression', event => { document.getElementById('agent-feeling').textContent = event.detail.label; });
    menu.querySelector('details').addEventListener('toggle', positionMenu);
    document.addEventListener('pointerdown', event => { if (!menu.hidden && !menu.contains(event.target) && !root.contains(event.target)) closeMenu(); }, true);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !menu.hidden) { event.preventDefault(); event.stopImmediatePropagation(); closeMenu(true); }
    });
    document.addEventListener('scroll', event => { if (!menu.hidden && !menu.contains(event.target)) closeMenu(); }, { capture: true, passive: true });
    const observer = new MutationObserver(() => { closeMenu(); refresh(); });
    document.querySelectorAll('dialog').forEach(dialog => observer.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
    const coach = document.getElementById('buddy-coach');
    if (coach) observer.observe(coach, { attributes: true, attributeFilter: ['hidden'] });
    if (guide) new MutationObserver(() => {
        if (guide.dataset.motion !== 'reduced') paused = guide.dataset.motion === 'paused';
        save(); sync();
    }).observe(guide, { attributes: true, attributeFilter: ['data-motion'] });
    const sizes = new ResizeObserver(refresh);
    document.querySelectorAll('[data-buddy-anchor]').forEach(slot => sizes.observe(slot));
    window.addEventListener('resize', refresh);
    reduce.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('storage', event => { if (event.key === 'nextskill.companion.v1') appearance(); });
    window.addEventListener('pagehide', () => { closeMenu(); sizes.disconnect(); observer.disconnect(); });
    window.addEventListener('pageshow', () => { document.querySelectorAll('[data-buddy-anchor]').forEach(slot => sizes.observe(slot)); document.querySelectorAll('dialog').forEach(dialog => observer.observe(dialog, { attributes: true, attributeFilter: ['open'] })); if (coach) observer.observe(coach, { attributes: true, attributeFilter: ['hidden'] }); refresh(); });
    window.NextSkillAgent = { visit: refresh, refresh, resume: refresh, motionAllowed, isPaused: () => paused };
    save(); appearance(); sync(); refresh();
    document.fonts?.ready.then(refresh);
})();
