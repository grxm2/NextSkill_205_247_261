(() => {
    'use strict';
    const jump = document.getElementById('jump-current');
    const current = document.querySelector('.journey-step.current');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let highlightTimer;

    jump?.addEventListener('click', event => {
        if (!current) return;
        const motion = event.detail > 0 && !reduce.matches && !window.NextSkillJourney?.isPaused();
        current.scrollIntoView({ block: 'center', behavior: motion ? 'smooth' : 'instant' });
        current.querySelector('button')?.focus({ preventScroll: true });
        clearTimeout(highlightTimer);
        current.classList.remove('jump-highlight');
        if (motion) {
            requestAnimationFrame(() => {
                current.classList.add('jump-highlight');
                highlightTimer = setTimeout(() => current.classList.remove('jump-highlight'), 650);
            });
        }
    });

    const sections = document.querySelectorAll('#learning-path, #daily-quests');
    const links = document.querySelectorAll('.desktop-nav a[href^="#"], .mobile-nav a[href^="#"]');
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            const visible = entries.filter(entry => entry.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (!visible) return;
            links.forEach(link => {
                const active = link.hash === `#${visible.target.id}`;
                link.classList.toggle('active', active);
                if (active) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
        }, { rootMargin: '-10% 0px -55% 0px', threshold: 0 });
        sections.forEach(section => observer.observe(section));
        window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
    }
    window.addEventListener('pagehide', () => clearTimeout(highlightTimer), { once: true });
})();
