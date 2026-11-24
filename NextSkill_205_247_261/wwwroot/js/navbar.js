(() => {
    'use strict';
    const header = document.querySelector('[data-navbar]');
    if (!header) return;
    const toggle = header.querySelector('[data-navbar-toggle]');
    const menu = header.querySelector('#nextskill-main-menu');
    const wide = matchMedia('(min-width: 1024px)');
    const courseDetails = document.querySelector('[data-course-details]');
    let open = false;
    function setOpen(value, returnFocus = false) {
        open = value && !wide.matches;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก');
        menu.hidden = !wide.matches && !open;
        if (returnFocus) toggle.focus();
    }
    toggle.hidden = false;
    toggle.addEventListener('click', () => setOpen(!open));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            setOpen(false, true);
        }
    });
    document.addEventListener('click', event => {
        if (open && !header.contains(event.target)) {
            const focusInside = menu.contains(document.activeElement);
            setOpen(false, focusInside);
        }
    });
    menu.addEventListener('click', event => {
        if (event.target.closest('.ns-navbar__link, .ns-navbar__favorites')) setOpen(false);
        if (open && courseDetails && event.target.closest('[data-theme-toggle]')) setOpen(false, true);
    });
    wide.addEventListener('change', () => {
        const active = document.activeElement;
        setOpen(false, !wide.matches && menu.contains(active));
        if (wide.matches && active === toggle) menu.querySelector('a')?.focus();
    });
    setOpen(false);
})();
