(() => {
    document.querySelectorAll('.password-toggle').forEach(button => {
        const label = button.getAttribute('aria-label');
        button.addEventListener('click', () => {
            const input = document.getElementById(button.dataset.target);
            const visible = input.type === 'password';
            input.type = visible ? 'text' : 'password';
            button.setAttribute('aria-pressed', String(visible));
            button.setAttribute('aria-label', visible ? label.replace('Show', 'Hide') : label);
        });
    });
    const password = document.getElementById('Password');
    const confirm = document.getElementById('ConfirmPassword');
    if (password && confirm) {
        const validate = () => confirm.setCustomValidity(
            confirm.value && password.value !== confirm.value ? 'Passwords do not match.' : '');
        password.addEventListener('input', validate);
        confirm.addEventListener('input', validate);
    }
    document.querySelector('.validation-summary-errors')?.focus();
})();
