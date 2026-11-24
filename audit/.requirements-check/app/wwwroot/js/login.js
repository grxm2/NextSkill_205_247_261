(() => {
    const form = document.getElementById('login-form');
    const password = document.getElementById('password');
    const toggle = document.querySelector('.toggle-password');
    const status = document.getElementById('login-status');

    toggle.addEventListener('click', () => {
        const visible = password.type === 'password';
        password.type = visible ? 'text' : 'password';
        toggle.textContent = visible ? 'ซ่อน' : 'แสดง';
        toggle.setAttribute('aria-pressed', String(visible));
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        status.hidden = false;
        status.textContent = 'นี่คือหน้าฟอร์มตัวอย่าง ยังไม่สามารถเข้าสู่ระบบได้จนกว่าจะเชื่อมต่อระบบบัญชีผู้ใช้';
    });
})();
