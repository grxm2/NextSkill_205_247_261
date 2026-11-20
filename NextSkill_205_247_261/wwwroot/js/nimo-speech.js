(() => {
    'use strict';
    const root = document.getElementById('nextskill-agent');
    const bubble = document.getElementById('nimo-speech');
    const robot = root?.querySelector('.skill-buddy');
    if (!root || !bubble || !robot) return;
    const text = document.getElementById('nimo-speech-text');
    const measure = document.getElementById('nimo-speech-measure');
    const announcement = document.getElementById('nimo-speech-announcement');
    const close = document.getElementById('nimo-speech-close');
    const missionButton = document.getElementById('nimo-missions-open');
    const dashboard = document.querySelector('[data-home-dashboard]');
    const islandCourseMenu = document.getElementById('island-course-menu');
    const menu = document.getElementById('buddy-agent-menu');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const compactViewport = matchMedia('(max-width: 767px), (max-height: 520px)');
    const scene = document.getElementById('ocean-journey');
    const lessonMessage = document.getElementById('lesson-nimo-message');
    const result = document.getElementById('lesson-result');
    const recovery = document.getElementById('submission-recovery');
    const lessonError = document.getElementById('lesson-error');
    const lessonCoach = document.querySelector('.practice-coach');
    const layer = document.getElementById('buddy-layer');
    const seen = new Set();
    const tipIndices = new Map();
    let current = null, context = '', renderedKey = '', displayed = '', lastAutoKey = '';
    let timer = 0, frame = 0, exitTimer = 0, generation = 0, lessonEvent = 0, active = true;
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const clean = value => String(value || '').replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 240);
    const policy = () => window.NextSkillMotion?.snapshot({ element: robot, kind: 'reaction' });
    const still = () => reduce.matches || window.NextSkillAgent?.isPaused() || policy()?.reactionAllowed === false;
    const content = selector => clean(document.querySelector(selector)?.textContent);

    function speaking(value) {
        bubble.dataset.speaking = String(value);
        if (value) robot.dataset.textSpeaking = 'true';
        else delete robot.dataset.textSpeaking;
    }
    function finishText() {
        generation++;
        cancelAnimationFrame(frame); frame = 0;
        text.textContent = displayed;
        speaking(false);
    }
    function removeSurface() {
        if (typeof bubble.hidePopover === 'function' && bubble.matches(':popover-open')) bubble.hidePopover();
        bubble.hidden = true;
        document.body.classList.remove('nimo-speech-visible');
    }
    function hide(animate = false) {
        finishText();
        clearTimeout(exitTimer);
        const wasOpen = bubble.dataset.open === 'true';
        delete bubble.dataset.open;
        if (animate && wasOpen && !still()) exitTimer = setTimeout(removeSurface, 170);
        else removeSurface();
    }
    function eligible() {
        if (!active || document.hidden || root.hidden || (!menu.hidden && !lessonCoach) || robot.dataset.voyagePose) return false;
        if (islandCourseMenu && !islandCourseMenu.hidden) return false;
        if (root.dataset.context === 'in-flight' || root.closest('[data-voyage="rowing"],[data-voyage="boarding"],[data-voyage="diving"],[data-boarding="true"]')) return false;
        if (scene?.dataset.arrival || scene?.dataset.cvPhase) return false;
        if (document.documentElement.matches('.cv-arrival-pending,.cv-arrival-running,.cv-departure-active,.journey-arrival-prepaint,.course-departing')) return false;
        const voyage = document.getElementById('catalog-voyage');
        if (voyage && !voyage.hidden) return false;
        const modal = [...document.querySelectorAll('dialog[open]')].at(-1);
        if (modal && (modal.id !== 'lesson-dialog' || !modal.contains(root))) return false;
        const coach = document.getElementById('buddy-coach');
        if (coach && !coach.hidden) return false;
        const box = root.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (lessonCoach || box.top > 0 && box.top < innerHeight - 24 && box.right > 12 && box.left < innerWidth - 12) && getComputedStyle(root).visibility !== 'hidden';
    }
    function contextKey() {
        if (root.dataset.context?.startsWith('lesson')) return `lesson:${content('#lesson-title')}`;
        if (document.querySelector('[data-course-page]')) return 'catalog';
        if (document.querySelector('.practice-page')) return `lesson:${content('#lesson-title')}`;
        if (document.body.dataset.journeyMode === 'learn') return `island:${content('#current-course-title')}`;
        return `home:${root.dataset.context}`;
    }
    function tips() {
        if (context.startsWith('lesson:')) return [
            ['ลองอธิบายตัวอย่างด้วยคำของตัวเองก่อนตอบ ถ้าเล่าได้ แปลว่าเริ่มเข้าใจแล้วนะ', 'ลองเล่าตัวอย่างด้วยคำของตัวเองนะ', 'think'],
            ['ยังไม่มั่นใจ? กลับไปดูตัวอย่างได้ และเปลี่ยนคำตอบได้ก่อนกดตรวจคำตอบนะ', 'กลับไปดูตัวอย่าง แล้วค่อยตอบได้เลย', 'point'],
            ['ข้อที่พลาดเป็นเข็มทิศ ลองอ่านคำอธิบายแล้วหาว่าตัวเลือกต่างกันตรงไหนนะ', 'ข้อที่พลาดช่วยบอกจุดที่เราฝึกต่อได้นะ', 'cheer']
        ];
        if (context === 'catalog') {
            const empty = document.querySelectorAll('.ns-course-card').length === 0;
            return [
                [empty ? 'ยังไม่เจอเกาะที่ใช่? ลองใช้คำค้นสั้นลง เช่น “ภาษา” หรือ “ออกแบบ” หรือเลือกหมวด “ทั้งหมด” ดูนะ' : 'ค้นจากทักษะที่อยากใช้จริง เช่น “ภาษา” หรือ “ออกแบบ” แล้วลองอ่านรายละเอียดคอร์สที่ถูกใจนะ', empty ? 'ลองใช้คำค้นสั้นลง หรือเลือก “ทั้งหมด” นะ' : 'ลองค้นจากทักษะที่อยากใช้จริงดูนะ', 'think'],
                ['ไม่ต้องเลือกทุกเส้นทางวันนี้ เริ่มจากคอร์สที่ช่วยแก้ปัญหาเล็ก ๆ ในชีวิตคุณก่อนก็ได้', 'เริ่มจากทักษะที่อยากใช้ในชีวิตจริงนะ', 'point'],
                ['ลองเปลี่ยนหมวดคอร์สเพื่อเปิดมุมใหม่ แล้วดูคอร์สที่พร้อมออกเดินทางได้เลย', 'เปลี่ยนหมวดเพื่อค้นพบเส้นทางใหม่ได้นะ', 'nod']
            ];
        }
        if (context.startsWith('island:')) return [
            ['แตะด่านปัจจุบันเพื่อดูรายละเอียด แล้วกด “เริ่มเรียน” เพื่อออกเดินทางนะ', 'แตะด่านปัจจุบันเพื่อเริ่มนะ', 'point'],
            ['วันละเกาะก็ไปได้ไกล ลองตั้งเป้าอ่านให้เข้าใจหนึ่งตัวอย่างก่อนทำแบบฝึกนะ', 'วันนี้เข้าใจเพิ่มอีกนิด ก็เป็นก้าวที่ดีแล้ว', 'cheer'],
            ['อยากฝึกเรื่องใหม่? ใช้ “เปลี่ยนคอร์ส” ได้ ความคืบหน้าของแต่ละคอร์สแยกกันนะ', 'ใช้ “เปลี่ยนคอร์ส” เพื่อสำรวจทักษะอื่นได้', 'nod']
        ];
        return [
            ['เกาะใหม่ไม่จำเป็นต้องเริ่มด้วยก้าวใหญ่ เลือกคอร์สที่อยากลอง แล้วผมจะพาออกเดินทางนะ', 'เลือกคอร์สที่อยากลอง แล้วไปด้วยกันนะ', 'nod'],
            ['ยังเลือกไม่ถูก? นึกถึงสิ่งที่อยากทำให้คล่องขึ้นหนึ่งอย่าง แล้วใช้สิ่งนั้นเป็นจุดเริ่มต้นได้เลย', 'เริ่มจากเรื่องที่อยากทำให้คล่องขึ้นนะ', 'think'],
            ['เรียนทีละนิดก็มีความหมาย วันนี้แค่ได้ลองสิ่งใหม่หนึ่งอย่าง ก็คุ้มกับการออกเรือแล้ว', 'วันนี้ลองสิ่งใหม่ด้วยกันสักอย่างนะ', 'cheer']
        ];
    }
    function homeMission() {
        const message = dashboard?.dataset.missionText;
        if (!missionButton || !message || root.dataset.context !== 'shore') return null;
        return { key: `${context}:mission:${message}`, text: message, priority: 2, pose: 'nod', mission: true };
    }
    function automatic() {
        if (context.startsWith('lesson:')) {
            if (recovery && !recovery.hidden) return { key: `${context}:recovery`, text: 'คำตอบยังอยู่ตรงนี้นะ กด “ตรวจสถานะการบันทึก” ก่อน เพื่อดูผลที่ยืนยันจากระบบได้เลย', compact: 'กด “ตรวจสถานะการบันทึก” เพื่อเช็กผลนะ', priority: 5 };
            const error = !lessonError?.hidden && clean(lessonError?.textContent);
            if (error) return { key: `${context}:error:${error}`, text: clean(`ยังทำขั้นตอนนี้ไม่สำเร็จนะ ${error}`), compact: error, priority: 5 };
            const message = clean(lessonMessage?.textContent);
            if (message) return { key: `${context}:${result && !result.hidden ? `result:${result.dataset.passed}` : 'hint'}:${message}`, text: message, compact: message, priority: result && !result.hidden ? 4 : 2 };
        }
        const mission = homeMission();
        if (mission) return mission;
        const [message, compact, pose] = tips()[0];
        return { key: `${context}:welcome`, text: message, compact, pose, priority: 1 };
    }

    const protectedSelectors = [
        '.ns-navbar', '.ow-intro h1', '.ow-intro > p', '.ow-intro-actions a', '[data-home-dashboard]',
        '[data-nimo-speech-obstacle]', '.catalog-hero-copy', '.ns-catalog-status', '.ns-course-section-heading', '.ns-course-grid',
        '#lesson-reading', '#lesson-questions', '.lesson-step-actions', '.island-dashboard', '.practice-overview-heading',
        '#lesson-route .island-stop-picture', '#lesson-route :is(h3,.sj-island-status)',
        '.practice-facts', '.practice-coach > p', '.practice-coach > ul'
    ].join(',');
    function placement(message) {
        const anchor = root.getBoundingClientRect();
        const viewport = window.visualViewport;
        const viewportX = viewport?.offsetLeft || 0;
        const viewportY = viewport?.offsetTop || 0;
        const edge = 16;
        const gap = 12;
        const left = viewportX + edge;
        const right = Math.min(document.documentElement.clientWidth, viewportX + (viewport?.width || innerWidth)) - edge;
        const top = viewportY + edge;
        const bottom = viewportY + (viewport?.height || innerHeight) - edge;
        const center = (anchor.left + anchor.right) / 2;
        const centerY = (anchor.top + anchor.bottom) / 2;
        const obstacles = [...document.querySelectorAll(protectedSelectors)]
            .map(node => node.getBoundingClientRect())
            .filter(box => box.width > 0 && box.height > 0 && box.bottom > top && box.top < bottom);
        const fits = (x, y, width, height) => x >= left && x + width <= right && y >= top && y + height <= bottom &&
            !obstacles.some(box => x < box.right + 6 && x + width > box.left - 6 && y < box.bottom + 6 && y + height > box.top - 6);
        const maxWidth = Math.min(compactViewport.matches ? 224 : 280, right - left);
        const minWidth = 132;
        if (maxWidth < minWidth) return '';

        function show(side, x, y, width, height, copy) {
            bubble.dataset.placement = side;
            bubble.style.transform = `translate3d(${x}px,${y}px,0)`;
            bubble.style.setProperty('--nimo-tail', `${clamp(center - x, 17, width - 17)}px`);
            bubble.style.setProperty('--nimo-tail-y', `${clamp(centerY - y, 15, height - 15)}px`);
            return copy;
        }
        function reserve(width, compact) {
            const copy = compact ? message.compact || message.text : message.text;
            bubble.dataset.compact = String(compact);
            bubble.style.width = `${width}px`;
            measure.textContent = copy;
            return { copy, height: bubble.offsetHeight };
        }

        const candidates = [];
        function slot(from, to, compact) {
            const width = Math.min(maxWidth, to - from);
            if (width < minWidth) return;
            const x = clamp(center - width / 2, from, to - width);
            if (center < x - 48 || center > x + width + 48) return;
            if (!candidates.some(candidate => candidate.x === x && candidate.width === width && candidate.compact === compact)) {
                candidates.push({ x, width, compact });
            }
        }
        if (!compactViewport.matches) slot(left, right, false);
        slot(left, right, true);
        for (const box of obstacles) {
            slot(Math.max(left, box.right + gap), right, true);
            slot(left, Math.min(right, box.left - gap), true);
        }
        for (const { x, width, compact } of candidates) {
            const { copy, height } = reserve(width, compact);
            const above = Math.min(anchor.top - gap, bottom) - height;
            const below = anchor.bottom + gap;
            if (fits(x, above, width, height)) return show('above', x, above, width, height, copy);
            if (fits(x, below, width, height)) return show('below', x, below, width, height, copy);
        }

        for (const side of ['left', 'right']) {
            const onLeft = side === 'left';
            const anchorEdge = onLeft ? anchor.left - gap : anchor.right + gap;
            const edges = new Set([anchorEdge]);
            for (const box of obstacles) {
                const edge = onLeft ? box.left - gap : box.right + gap;
                const distance = onLeft ? anchorEdge - edge : edge - anchorEdge;
                if (distance > 0 && distance <= 48) edges.add(edge);
            }
            for (const edge of edges) {
                const width = Math.min(224, onLeft ? edge - left : right - edge);
                if (width < minWidth) continue;
                const x = onLeft ? edge - width : edge;
                const { copy, height } = reserve(width, true);
                const y = clamp(centerY - height / 2, top, bottom - height);
                if (fits(x, y, width, height)) return show(side, x, y, width, height, copy);
            }
        }
        return '';
    }
    function reveal(message, animate) {
        finishText();
        displayed = message;
        announcement.textContent = message;
        if (!animate || still()) { text.textContent = message; return; }
        const segments = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(message)].map(part => part.segment) : Array.from(message);
        const duration = clamp(segments.length * 26, 900, 2400);
        const started = performance.now(), token = generation;
        text.textContent = '';
        speaking(true);
        function tick(now) {
            if (token !== generation) return;
            const count = Math.min(segments.length, Math.ceil((now - started) / duration * segments.length));
            text.textContent = segments.slice(0, count).join('');
            if (count < segments.length) frame = requestAnimationFrame(tick);
            else { frame = 0; speaking(false); }
        }
        frame = requestAnimationFrame(tick);
    }
    function present() {
        clearTimeout(exitTimer);
        const inline = lessonCoach && root.dataset.context === 'lesson-page';
        if (inline) {
            if (typeof bubble.hidePopover === 'function' && bubble.matches(':popover-open')) bubble.hidePopover();
            bubble.removeAttribute('popover');
            if (bubble.parentElement !== lessonCoach) lessonCoach.querySelector('h3').after(bubble);
        } else {
            if (bubble.parentElement !== layer) layer.append(bubble);
            bubble.setAttribute('popover', 'manual');
        }
        bubble.dataset.inline = String(Boolean(inline));
        bubble.toggleAttribute('data-mission', current.mission === true);
        bubble.hidden = false;
        if (missionButton) missionButton.hidden = !current.mission;
        // A manual popover escapes the scene's clipping without trapping focus.
        if (!inline && typeof bubble.showPopover === 'function' && !bubble.matches(':popover-open')) bubble.showPopover();
        const copy = inline ? current.text : placement(current);
        if (inline) {
            measure.textContent = copy;
            bubble.dataset.compact = 'false';
            bubble.dataset.placement = 'above';
            bubble.style.removeProperty('width');
            bubble.style.removeProperty('transform');
            const box = bubble.getBoundingClientRect(), anchor = root.getBoundingClientRect();
            bubble.style.setProperty('--nimo-tail', `${clamp((anchor.left + anchor.right) / 2 - box.left, 20, box.width - 20)}px`);
        }
        if (!copy) { hide(); return false; }
        const fresh = renderedKey !== current.key;
        bubble.dataset.still = String(still() || current.motion === false);
        bubble.dataset.open = 'true';
        document.body.classList.add('nimo-speech-visible');
        if (fresh || displayed !== copy) {
            const animate = fresh && !seen.has(current.key) && current.motion !== false;
            reveal(copy, animate);
            if (animate && !still() && current.pose) window.NextSkillBuddyMotion?.play(current.pose, robot, { priority: 1 });
        }
        renderedKey = current.key;
        seen.add(current.key);
        if (current.focus) { current.focus = false; close.focus({ preventScroll: true }); }
        return true;
    }
    function evaluate() {
        timer = 0;
        if (!eligible() || dashboard?.dataset.status === 'loading' && !current?.manual) { hide(); return; }
        const nextContext = contextKey();
        if (context !== nextContext) { context = nextContext; current = null; renderedKey = ''; lastAutoKey = ''; }
        const next = automatic();
        if (next.key !== lastAutoKey) {
            lastAutoKey = next.key;
            if (!current?.manual || next.priority >= current.priority) {
                // The same hint can be useful again on a later attempt. Repeated
                // observer callbacks in the same state still share lastAutoKey.
                current = context.startsWith('lesson:') ? { ...next, key: `${next.key}:event:${++lessonEvent}` } : seen.has(next.key) ? null : next;
            }
        }
        if (current) present();
        else if (bubble.dataset.open === 'true') hide();
    }
    function schedule(delay = 80) { clearTimeout(timer); if (active) timer = setTimeout(evaluate, delay); }
    function dismiss() {
        const restore = bubble.contains(document.activeElement);
        if (current) seen.add(current.key);
        current = null; renderedKey = '';
        hide(true);
        if (restore && !root.hidden) document.getElementById('buddy-agent-handle')?.focus({ preventScroll: true });
    }
    function say(value, options = {}) {
        if (!eligible()) return false;
        const message = clean(value);
        if (!message) return false;
        const nextContext = contextKey();
        if (context !== nextContext) { context = nextContext; renderedKey = ''; }
        lastAutoKey = automatic().key;
        seen.add(lastAutoKey);
        current = { key: `${context}:manual:${++generation}`, text: message, compact: clean(options.compact) || message, priority: 2, pose: options.pose || 'nod', motion: options.motion, focus: options.focus === true, manual: true, mission: options.mission === true };
        return present();
    }
    function help(options = {}) {
        context = contextKey();
        const mission = homeMission();
        if (mission) return say(mission.text, { ...options, mission: true });
        const index = tipIndices.get(context) || 0;
        const [message, compact, pose] = tips()[index % tips().length];
        tipIndices.set(context, index + 1);
        return say(message, { ...options, compact, pose });
    }
    close.addEventListener('click', dismiss);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !bubble.hidden && !document.querySelector('dialog[open]') && menu.hidden) {
            event.preventDefault(); dismiss();
        }
    });
    const observer = new MutationObserver(() => {
        // Stop speaking immediately at a journey/modal boundary, before paint.
        if (!eligible()) hide();
        schedule();
    });
    function observe() {
        observer.observe(root, { attributes: true, attributeFilter: ['data-context', 'hidden'] });
        observer.observe(robot, { attributes: true, attributeFilter: ['data-voyage-pose'] });
        observer.observe(menu, { attributes: true, attributeFilter: ['hidden'] });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        if (islandCourseMenu) observer.observe(islandCourseMenu, { attributes: true, attributeFilter: ['hidden'] });
        if (dashboard) observer.observe(dashboard, { attributes: true, attributeFilter: ['data-mode', 'data-status', 'data-mission-text'] });
        document.querySelectorAll('dialog,#catalog-voyage,#buddy-coach,[data-voyage],#ocean-journey').forEach(node => observer.observe(node, { attributes: true, attributeFilter: ['open', 'hidden', 'data-voyage', 'data-arrival', 'data-cv-phase', 'data-boarding'] }));
        if (lessonMessage) observer.observe(lessonMessage, { childList: true, characterData: true, subtree: true });
        [result, recovery].filter(Boolean).forEach(node => observer.observe(node, { attributes: true, attributeFilter: ['hidden', 'data-passed'] }));
        if (lessonError) observer.observe(lessonError, { attributes: true, attributeFilter: ['hidden'], childList: true, characterData: true, subtree: true });
    }
    window.addEventListener('resize', () => schedule(40));
    document.addEventListener('scroll', () => { if (!eligible()) hide(); schedule(40); }, { passive: true, capture: true });
    window.visualViewport?.addEventListener('resize', () => schedule(40));
    window.visualViewport?.addEventListener('scroll', () => schedule(40));
    document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); else schedule(); });
    document.addEventListener('nextskill:learning-ready', () => schedule(200));
    document.addEventListener('nextskill:learning-settled', () => schedule(200));
    reduce.addEventListener('change', () => { finishText(); schedule(); });
    window.NextSkillMotion?.subscribe(() => {
        if (still()) { finishText(); bubble.dataset.still = 'true'; }
        schedule();
    }, { element: robot, kind: 'reaction' });
    window.addEventListener('pagehide', () => { active = false; clearTimeout(timer); observer.disconnect(); hide(); });
    window.addEventListener('pageshow', () => { active = true; observe(); schedule(200); });
    window.NextSkillSpeech = Object.freeze({ say, help, dismiss });
    observe(); schedule(600);
    document.fonts?.ready.then(() => schedule(200));
})();
