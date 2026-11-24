(() => {
    const feedback = document.querySelector('[data-favorite-feedback]');
    if (!feedback) return;

    const status = feedback.querySelector('p');
    let clearStatus;

    function announce(message, success) {
        clearTimeout(clearStatus);
        feedback.classList.add('favorite-feedback--overlay');
        status.classList.toggle('ns-status--success', success);
        status.classList.toggle('ns-status--error', !success);
        status.hidden = false;
        status.textContent = message;
        clearStatus = setTimeout(() => {
            status.hidden = true;
            status.textContent = '';
        }, success ? 3500 : 6500);
    }

    document.addEventListener('submit', async event => {
        const form = event.target.closest('[data-favorite-toggle]');
        if (!form) return;

        event.preventDefault();
        const button = form.querySelector('button');
        if (button.getAttribute('aria-busy') === 'true') return;

        button.setAttribute('aria-busy', 'true');
        button.setAttribute('aria-disabled', 'true');
        try {
            const response = await fetch(form.action, {
                method: 'POST',
                headers: { Accept: 'application/json' },
                body: new FormData(form)
            });
            if (response.redirected || response.status === 401) {
                window.location.assign(form.dataset.loginUrl);
                return;
            }

            const result = await response.json();
            if (response.ok) {
                button.setAttribute('aria-pressed', String(result.isSaved));
                form.elements.namedItem('save').value = String(!result.isSaved);
            }
            announce(result.message, response.ok);
        } catch {
            announce('เปลี่ยนรายการโปรดไม่ได้ กรุณาลองอีกครั้ง', false);
        } finally {
            button.removeAttribute('aria-busy');
            button.removeAttribute('aria-disabled');
        }
    });
})();
