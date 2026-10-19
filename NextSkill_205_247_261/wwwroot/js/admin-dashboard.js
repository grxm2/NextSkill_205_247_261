(() => {
    const panels = [...document.querySelectorAll('.admin-panel')];
    const links = [...document.querySelectorAll('.admin-nav a')];
    const title = document.getElementById('page-title');
    function navigate() {
        const id = location.hash.slice(1) || 'dashboard';
        const active = panels.find(panel => panel.id === id) || panels[0];
        panels.forEach(panel => { panel.hidden = panel !== active; });
        links.forEach(link => {
            const selected = link.hash === '#' + active.id;
            link.classList.toggle('active', selected);
            if (selected) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        title.textContent = active.dataset.title;
        document.title = `${active.dataset.title} | NextSkill`;
    }
    navigate();
    window.addEventListener('hashchange', () => {
        navigate();
        document.getElementById('main-content').focus({preventScroll: true});
        window.scrollTo({top: 0, behavior: 'instant'});
    });
    document.getElementById('sample-toggle').addEventListener('change', event => {
        document.getElementById('sample-courses').hidden = !event.target.checked;
        document.getElementById('sample-note').hidden = !event.target.checked;
        document.getElementById('empty-courses').hidden = event.target.checked;
    });
    const dialog = document.getElementById('course-dialog');
    document.querySelectorAll('[data-course]').forEach(button => button.addEventListener('click', () => {
        document.getElementById('course-dialog-title').textContent = button.dataset.course;
        document.getElementById('course-dialog-status').textContent = 'Example status: ' + button.dataset.status;
        dialog.showModal();
    }));
    const search = document.getElementById('member-search');
    const role = document.getElementById('member-role');
    function filterMembers() {
        const query = search.value.trim().toLocaleLowerCase();
        let count = 0;
        document.querySelectorAll('[data-member]').forEach(row => {
            row.hidden = !(row.textContent.toLocaleLowerCase().includes(query) && (role.value === 'all' || row.dataset.role === role.value));
            if (!row.hidden) count++;
        });
        document.getElementById('no-members').hidden = count > 0;
        document.getElementById('member-count').textContent = `${count} accounts shown`;
    }
    search.addEventListener('input', filterMembers);
    role.addEventListener('change', filterMembers);
    document.querySelectorAll('time[datetime]').forEach(element => {
        const date = new Date(element.dateTime);
        if (Number.isNaN(date.getTime())) return;
        element.textContent = new Intl.DateTimeFormat(undefined, element.hasAttribute('data-local-date')
            ? {day: 'numeric', month: 'short', year: 'numeric'}
            : {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(date);
        element.title = date.toLocaleString();
    });
})();
