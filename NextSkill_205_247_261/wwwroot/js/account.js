(() => {
    const eyeSvg = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>`;
    const eyeOffSvg = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
            <line x1="2" x2="22" y1="2" y2="22"/>
        </svg>`;

    document.querySelectorAll('.password-toggle-eye, .password-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            button.setAttribute('aria-pressed', String(isPassword));
            button.setAttribute('aria-label', isPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
            button.innerHTML = isPassword ? eyeOffSvg : eyeSvg;
            input.focus();
        });
    });

    const password = document.getElementById('Password');
    const confirm = document.getElementById('ConfirmPassword');
    if (password && confirm) {
        const validate = () => {
            if (confirm.value && password.value !== confirm.value) {
                confirm.setCustomValidity('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
            } else {
                confirm.setCustomValidity('');
            }
        };
        password.addEventListener('input', validate);
        confirm.addEventListener('input', validate);
    }

    document.querySelector('.validation-summary-errors')?.focus();

    const loginForm = document.querySelector('form.login-core-form');
    const loginOverlay = document.getElementById('nimoLoginLoadingOverlay');
    const loginProgress = document.getElementById('loadingProgressFill');
    let loginAnimation;
    loginForm?.addEventListener('submit', event => {
        if (event.defaultPrevented || !loginOverlay) return;
        if (loginOverlay.classList.contains('is-active')) {
            event.preventDefault();
            return;
        }
        loginOverlay.classList.add('is-active');
        loginOverlay.setAttribute('aria-hidden', 'false');
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches && document.body.dataset.motion !== 'paused') {
            loginAnimation = loginProgress?.animate?.([
                { transform: 'translateX(0)' }, { transform: 'translateX(233.33%)' }
            ], { duration: 850, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
        }
    });
    window.addEventListener('pageshow', () => {
        if (!loginOverlay?.classList.contains('is-active')) return;
        loginAnimation?.cancel();
        loginOverlay.classList.remove('is-active');
        loginOverlay.setAttribute('aria-hidden', 'true');
    });
})();
