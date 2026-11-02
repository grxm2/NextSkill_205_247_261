(() => {
    'use strict';
    const header = document.querySelector('[data-navbar]');
    if (!header) return;
    const toggle = header.querySelector('[data-navbar-toggle]');
    const menu = header.querySelector('#nextskill-main-menu');
    const narrow = matchMedia('(max-width: 959.98px)');
    let open = false;
    function setOpen(value, returnFocus = false) {
        open = value && narrow.matches;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก');
        menu.hidden = narrow.matches && !open;
        if (returnFocus) toggle.focus();
    }
    toggle.hidden = false;
    toggle.addEventListener('click', () => setOpen(!open));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false, true); }
    });
    document.addEventListener('click', event => {
        if (open && !header.contains(event.target)) {
            const focusInside = menu.contains(document.activeElement);
            setOpen(false, focusInside);
        }
    });
    menu.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
    narrow.addEventListener('change', () => { const focusInside = menu.contains(document.activeElement); setOpen(false, narrow.matches && focusInside); });
    setOpen(false);
})();
