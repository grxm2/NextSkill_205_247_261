(() => {
    'use strict';
    const key = 'nextskill.journey-arrival';
    const seenKey = 'nextskill.journey-arrival-seen';
    const cloud = document.getElementById('journey-cloud-transition');
    if (!cloud) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let marker, boot, seen = false;
    try {
        marker = JSON.parse(sessionStorage.getItem(key));
        boot = JSON.parse(document.getElementById('learning-initial-state')?.textContent || 'null');
        seen = sessionStorage.getItem(seenKey) === 'true';
    } catch {}
    const age=Date.now()-marker?.at;
    const seaArrival = marker?.source === 'catalog' || marker?.source === 'home';
    const isArriving = !!(marker && boot && marker.courseId === boot.course.courseId && age>=0 && age < (seaArrival?60000:900000) && (!marker.url||marker.url===location.pathname+location.search));
    if(isArriving&&seaArrival&&!marker.skip)document.documentElement.classList.add('journey-island-arriving');
    const label = cloud.querySelector('.jc-label');
    const skip = document.createElement('button');
    skip.type = 'button'; skip.className = 'jc-skip'; skip.textContent = 'ข้ามไปเกาะบทเรียน'; skip.hidden = true;
    cloud.append(skip);
    let generation = 0, navigating = false, covering, status = 'loading', revealing = false;
    let deadline = 0, revealTimer = 0, settled = false;
    const pending = new Map();
    const clearMarker = () => { try { sessionStorage.removeItem(key); } catch {} };
    const remember = id => { try { sessionStorage.setItem(key, JSON.stringify({ courseId: id, at: Date.now() })); } catch {} };
    function delay(ms) { return new Promise(resolve => { const timer = setTimeout(() => { pending.delete(timer); resolve(); }, ms); pending.set(timer, resolve); }); }
    function clearWork() {
        clearTimeout(deadline); clearTimeout(revealTimer);
        pending.forEach((resolve, timer) => { clearTimeout(timer); resolve(); }); pending.clear();
    }
    function close(focus = false) {
        generation++; clearWork(); covering = null; revealing = false;
        if (cloud.open) cloud.close();
        cloud.className = ''; skip.hidden = true;
        document.documentElement.classList.remove('journey-transition-active', 'journey-arrival-prepaint','journey-island-arriving');
        window.NextSkillAgent?.refresh(); window.NextSkillMotion?.refresh();
        if (focus && status === 'ready') {
            try { sessionStorage.setItem(seenKey, 'true'); } catch {}
            (document.querySelector('#lesson-route .is-current') || document.querySelector('#lesson-route .is-completed:last-child'))?.focus({ preventScroll: true });
        }
    }
    function recover() {
        status = 'error'; close(); clearMarker();
        const main = document.getElementById('journey-main');
        if (!main || main.querySelector('.jc-recovery')) return;
        const note = document.createElement('section'); note.className = 'jc-recovery'; note.setAttribute('role', 'alert');
        const text = document.createElement('p'); text.textContent = 'ยังเตรียมเส้นทางไม่ได้ ลองโหลดหน้าอีกครั้ง หรือเลือกคอร์สจากเมนู';
        const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'sj-button'; retry.textContent = 'โหลดหน้าอีกครั้ง'; retry.addEventListener('click', () => location.reload());
        note.append(text, retry); main.prepend(note);
    }
    function cover() {
        document.documentElement.classList.add('journey-transition-active');
        cloud.className = 'is-covered';
        if (label) label.textContent = 'กำลังเตรียมเกาะบทเรียนของคุณ…';
        if (!cloud.open) cloud.showModal();
        document.documentElement.classList.remove('journey-arrival-prepaint');
        // Course selection has a 15s transport deadline; let it recover first.
        clearTimeout(deadline); deadline = setTimeout(recover, 17000);
    }
    function begin() {
        if (!covering) { cover(); covering = Promise.resolve(); }
        return covering;
    }
    function focusRoute(){
        if(document.querySelector('dialog[open]'))return;
        const active=document.activeElement;
        if(active&&active!==document.body&&!cloud.contains(active)&&active.matches('button,a,input,select'))return;
        (document.querySelector('#lesson-route .is-current')||document.querySelector('#lesson-route .is-completed:last-child'))?.focus({preventScroll:true});
    }
    function finishReveal() {
        if(!revealing)return;
        const inbound=seaArrival&&!marker.skip;
        close(!inbound);
        if(inbound)Promise.resolve(window.NextSkillArchipelago?.arriveFromLeft()).then(focusRoute);
    }
    skip.addEventListener('click', () => { if (status === 'ready') close(true); });
    cloud.addEventListener('cancel', event => {
        event.preventDefault();
        if (status === 'ready') close(true);
    });
    cloud.addEventListener('transitionend', event => { if (event.target.classList.contains('jc-bank-bottom')) finishReveal(); });
    async function arrive(result) {
        if (!isArriving || settled) return;
        settled = true; status = result; clearMarker();
        if (result !== 'ready') { close(); return; }
        const run = generation;
        const map = document.getElementById('lesson-map');
        await Promise.race([document.fonts?.ready || Promise.resolve(), delay(800)]);
        if (run !== generation) return;
        if (!seaArrival && map) window.scrollTo({ top: map.getBoundingClientRect().top + scrollY - 24, behavior: 'instant' });
        await Promise.race([Promise.all([...document.querySelectorAll('#lesson-route img')].map(img => img.decode?.().catch(() => {}))), delay(800)]);
        if (run !== generation) return;
        if(seaArrival){
            const route=document.getElementById('lesson-route');
            const first=route?.querySelector('[data-lesson-id="1"] img');
            if(first){
                const shore=window.NextSkillSeaWorld.surfaceShore(first);
                const sameViewport=marker.sea?.width===innerWidth&&marker.sea?.height===innerHeight;
                const horizon=sameViewport?marker.sea.horizon:window.NextSkillSeaWorld?.referenceHorizon();
                if(Number.isFinite(horizon)){
                    const extra=Math.max(0,horizon-shore);
                    if(extra)route.style.paddingTop=`${extra}px`;
                    const documentShore=window.NextSkillSeaWorld.surfaceShore(first);
                    window.scrollTo({top:Math.max(0,documentShore-horizon),behavior:'instant'});
                    window.NextSkillSeaWorld?.setShore(documentShore);
                }
                window.NextSkillArchipelago?.prepareSurfaceArrival();
            }
        }
        clearTimeout(deadline);
        skip.hidden = false;
        if (label) label.textContent = 'เกาะบทเรียนพร้อมแล้ว';
        const policy = window.NextSkillMotion?.snapshot() || { reduced: reduced.matches, paused: false, hidden: document.hidden };
        if (policy.reduced || policy.paused || policy.hidden) { close(true); return; }
        const duration = seaArrival ? 700 : seen ? 200 : 900;
        cloud.style.setProperty('--jc-reveal-duration', `${duration}ms`);
        // Flush the covered state once, then let CSS own the finite reveal.
        void cloud.offsetWidth;
        revealing = true; cloud.classList.add('is-revealing');
        revealTimer = setTimeout(finishReveal, duration + 120);
    }
    document.addEventListener('nextskill:learning-settled', event => { arrive(event.detail?.status === 'ready' ? 'ready' : 'error'); });
    // Legacy startup completion is not proof that data loaded successfully.
    document.addEventListener('nextskill:learning-ready', () => { queueMicrotask(() => { if (!settled) arrive('error'); }); });
    window.NextSkillMotion?.subscribe(state => { if (status === 'ready' && cloud.open && (state.reduced || state.paused || state.hidden)) close(true); });
    reduced.addEventListener('change', () => { if (reduced.matches && status === 'ready' && cloud.open) close(true); });
    window.NextSkillJourneyTransition = {
        isArriving, remember, begin,
        cancel() { navigating = false; clearMarker(); close(); },
        async navigate(url, id) { if (navigating) return; navigating = true; remember(id); await begin(); location.assign(url); }
    };
    if (isArriving) cover(); else document.documentElement.classList.remove('journey-arrival-prepaint');
    window.addEventListener('pagehide', () => { generation++; clearWork(); });
    window.addEventListener('pageshow', event => { if (event.persisted) { navigating = false; close(); } });
})();
