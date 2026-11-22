(() => {
    const nimo = document.querySelector('[data-login-nimo]');
    const form = document.querySelector('.login-core-form');
    if (!nimo || !form) return;

    const pause = nimo.querySelector('[data-nimo-pause]');
    const caption = nimo.querySelector('[data-nimo-caption]');
    const pupils = [...nimo.querySelectorAll('[data-nimo-pupil]')].map(element => ({
        element, scale: Number(element.dataset.gazeSize || 1280) / 1280
    }));
    const stage = nimo.querySelector('[data-nimo-stage]');
    const canAnimate = typeof stage.animate === 'function';
    const poses = new Map([...stage.querySelectorAll('[data-nimo-pose]')].map(pose => [pose.dataset.nimoPose, pose]));
    const front = poses.get('wave');
    const email = form.elements.Email;
    const password = form.elements.Password;
    const remember = form.querySelector('#RememberMe');
    const passwordToggle = form.querySelector('.password-toggle-eye');
    const submit = form.querySelector('.btn-auth-submit');
    const summary = form.querySelector('.validation-summary');
    const overlay = document.getElementById('nimoLoginLoadingOverlay');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const controlSelector = 'input:not([type="hidden"]), .password-toggle-eye, .btn-auth-submit, .login-account-types a, .btn-skip-outline, .switch-form a, .login-course-link, [data-theme-toggle]';

    const sayings = {
        idle: 'ไปเรียนด้วยกันนะ!',
        email: 'เริ่มที่อีเมลเลย!',
        typing: 'ตามทันนะ พิมพ์ต่อได้เลย!',
        password: 'นิโมปิดตาแล้ว รหัสลับของเธอ!',
        reveal: 'นิโมยังหันไปอีกทางอยู่นะ!',
        conceal: 'ซ่อนรหัสผ่านให้แล้ว!',
        remember: 'ให้เว็บจดจำการเข้าสู่ระบบได้ตรงนี้',
        remembered: 'ติ๊กไว้ให้เว็บจดจำแล้ว!',
        forgotten: 'ไว้เข้าสู่ระบบใหม่ครั้งหน้าก็ได้!',
        ready: 'พร้อมแล้ว ไปกันเลย!',
        invalid: 'ลองดูช่องที่เว็บแจ้งไว้อีกทีนะ',
        failed: 'ลองอีกครั้งนะ นิโมรออยู่!',
        submitting: 'กำลังพาเข้า NextSkill!',
        learner: 'ไปเรียนด้วยกันนะ!',
        admin: 'ไปหน้าผู้ดูแลกัน!',
        courses: 'ไปดูคอร์สกับนิโมไหม?',
        guest: 'ไปสำรวจหน้าแรกก่อนได้เลย!',
        register: 'มาสร้างบัญชีแล้วออกเรือกัน!',
        light: 'ฟ้าใส ได้เวลาออกเรือ!',
        dark: 'คืนนี้นิโมยังไม่ง่วงนะ!'
    };
    const styles = getComputedStyle(nimo);
    const softOut = styles.getPropertyValue('--ns-ease-out').trim();
    const glide = styles.getPropertyValue('--ns-ease-in-out').trim();
    const step = (offset, x = 0, y = 0, turn = 0, width = 1, height = 1, easing = glide) =>
        ({ offset, x, y, turn, width, height, easing });
    const routines = [
        {
            name: 'sidestep', duration: 4300, caption: 'ไปเรียนด้วยกันนะ!',
            steps: [
                step(0), step(.14), step(.25, -6, 1, -7, 1.03, .96, 'linear'),
                step(.36, -3, -2, -4, .99, 1.01), step(.50, 6, 1, 8, 1.03, .97, 'linear'),
                step(.60, 4, -2, 4), step(.70, -2, 1, -3), step(.84), step(1)
            ]
        },
        {
            name: 'curtsy', duration: 3900, caption: 'นิโมขอโค้งต้อนรับหน่อย!',
            pose: 'bow', blend: [.25, .29, .56, .60],
            steps: [
                step(0), step(.16), step(.27, 3, 2, 5, 1.03, .95, 'linear'),
                step(.40, 4, 7, 12, 1.04, .91), step(.54, 3, 5, 8, 1.03, .93, softOut),
                step(.66, -1, -2, -3, .99, 1.02), step(.80), step(1)
            ]
        },
        {
            name: 'two-hops', duration: 4100, caption: 'หนึ่ง สอง… ฮึบ!',
            pose: 'hop', blend: [.47, .51, .62, .66],
            steps: [
                step(0), step(.18, -2, 2, -3, 1.03, .96, softOut),
                step(.25, -3, -5, -4, .99, 1.02, 'linear'),
                step(.35, -2, 2, -2, 1.03, .95), step(.46, 1, 4, 2, 1.05, .92, softOut),
                step(.55, 4, -11, 7, .98, 1.04, 'linear'),
                step(.64, 5, -3, 5, 1, 1, 'linear'),
                step(.70, 4, 2, 2, 1.06, .93, softOut),
                step(.83), step(1)
            ]
        },
        {
            name: 'book-shuffle', duration: 4800, caption: 'เปิดหนังสือ… ยังเต้นต่อได้!',
            pose: 'book', blend: [.20, .24, .70, .74],
            steps: [
                step(0), step(.12), step(.25, -3, 0, -5),
                step(.38, -4, 2, -8, 1.02, .97), step(.47, 0, -1, -1),
                step(.59, 4, 1, 7, 1.02, .97), step(.70, 3, -1, 4), step(.87), step(1)
            ]
        }
    ];

    let routineIndex = 0;
    let direction = 1;
    let dance = null;
    let settling = null;

    function blendPoses(pose, stops, duration) {
        const [fadeIn, visible, fadeOut, hidden] = stops;
        const offsets = [0, fadeIn, visible, fadeOut, hidden, 1];
        return [front, pose].map((element, index) => {
            const resting = index === 0 ? 1 : 0;
            const opacities = [resting, resting, 1 - resting, 1 - resting, resting, resting];
            return element.animate(offsets.map((offset, frame) => ({
                offset, opacity: opacities[frame],
                easing: frame === 1 || frame === 3 ? softOut : 'linear'
            })), { duration });
        });
    }

    function beginDance() {
        const routine = routines[routineIndex];
        const sign = direction;
        routineIndex = (routineIndex + 1) % routines.length;
        if (routineIndex === 0) direction *= -1;

        const { duration } = routine;
        const movement = stage.animate(routine.steps.map(({ offset, x, y, turn, width, height, easing }) => ({
            offset, easing,
            transform: `translate(${x * sign}%, ${y}%) rotate(${turn * sign}deg) scale(${width}, ${height})`
        })), { duration });
        const sprite = poses.get(routine.pose);
        const image = sprite?.querySelector('img');
        const pose = image?.complete && image.naturalWidth ? sprite : null;
        const animations = pose ? [movement, ...blendPoses(pose, routine.blend, duration)] : [movement];
        dance = { pose, animations, caption: routine.caption };
        nimo.dataset.dancing = routine.name;
        movement.onfinish = () => {
            if (dance?.animations !== animations) return;
            endDance(false);
            render();
        };
    }

    function endDance(smooth) {
        const previous = dance;
        const transform = smooth ? getComputedStyle(stage).transform : 'none';
        const blends = smooth && previous.pose ? [front, previous.pose].map(element => ({
            element, opacity: getComputedStyle(element).opacity
        })) : [];

        dance = null;
        delete nimo.dataset.dancing;
        previous.animations.forEach(animation => animation.cancel());
        if (!smooth) return;

        const transition = { duration: 200, easing: softOut };
        const returnToRest = stage.animate([{ transform }, { transform: 'none' }], transition);
        const animations = [returnToRest, ...blends.map(({ element, opacity }) =>
            element.animate([{ opacity }, { opacity: element === front ? 1 : 0 }], transition)
        )];
        settling = animations;
        returnToRest.onfinish = () => {
            if (settling !== animations) return;
            settling = null;
            render();
        };
    }

    function syncDance(eligible, smooth) {
        if (!eligible) {
            if (!smooth && settling) {
                settling.forEach(animation => animation.cancel());
                settling = null;
            }
            if (dance) endDance(smooth);
        } else if (!dance && !settling) {
            beginDance();
        }
    }

    let ambient = false;
    let canSettle = false;
    let paused = false;
    let hovered = null;
    let reactionMood = null;
    let reactionTimer;
    let gazeStep = 0;
    let cursor = null;
    let cursorFrame = 0;
    let cursorAllowed = false;

    const submitActive = () => overlay?.classList.contains('is-active');

    function moodFor(control) {
        if (!control) return 'idle';
        if (control === email) return 'email';
        if (control === password || control === passwordToggle) return 'password';
        if (control === remember) return 'remember';
        if (control === submit) return 'ready';
        if (control.matches('.login-account-types a')) {
            return control.pathname.endsWith('/AdminLogin') ? 'admin' : 'learner';
        }
        if (control.matches('.login-course-link')) return 'courses';
        if (control.matches('.btn-skip-outline')) return 'guest';
        if (control.matches('.switch-form a')) return 'register';
        return 'idle';
    }

    function movePupils(x, y) {
        for (const { element, scale } of pupils) {
            const target = `translate(${(x * scale).toFixed(1)}px, ${(y * scale).toFixed(1)}px)`;
            if (element.style.transform !== target) element.style.transform = target;
        }
    }

    function followCursor() {
        cursorFrame = 0;
        if (!cursorAllowed || !cursor) return;
        const face = nimo.getBoundingClientRect();
        if (!face.width || !face.height) return;
        const x = (cursor.x - face.left - face.width * .55) / (face.width * 1.2);
        const y = (cursor.y - face.top - face.height * .41) / face.height;
        const distance = Math.max(1, Math.hypot(x, y));
        movePupils(30 * x / distance, 24 * y / distance);
        if (nimo.dataset.eyes !== 'open') nimo.dataset.eyes = 'open';
    }

    function queueCursorGaze() {
        if (cursorAllowed && cursor && !cursorFrame) cursorFrame = requestAnimationFrame(followCursor);
    }

    function clearCursor() {
        cursor = null;
        cancelAnimationFrame(cursorFrame);
        cursorFrame = 0;
        if (cursorAllowed) delete nimo.dataset.eyes;
    }

    function render() {
        const focus = document.activeElement;
        const focusedMood = moodFor(focus);
        const submitting = submitActive();
        const mood = submitting ? 'submitting' : reactionMood ?? (
            focusedMood === 'idle' ? moodFor(hovered) : focusedMood
        );
        const privacy = focusedMood === 'password' || ['password', 'reveal', 'conceal'].includes(mood);
        const following = !privacy && ['email', 'typing', 'ready', 'invalid', 'remember', 'remembered', 'forgotten'].includes(mood);
        cursorAllowed = canSettle && !submitting && !privacy && !following;
        nimo.dataset.mood = mood;
        syncDance(ambient && !paused && mood === 'idle', canSettle && !submitting);
        const message = mood === 'idle' ? dance?.caption ?? sayings.idle : sayings[mood];
        if (caption.textContent !== message) caption.textContent = message;
        if (privacy || following) {
            nimo.dataset.eyes = privacy ? 'closed' : 'open';
            nimo.dataset.look = privacy ? 'away' : 'form';
        } else {
            delete nimo.dataset.look;
            if (cursorAllowed && cursor) queueCursorGaze();
            else delete nimo.dataset.eyes;
        }
        if (following) {
            const subject = focusedMood === 'idle' ? hovered || email : focus;
            const targetBox = subject.getBoundingClientRect();
            const faceBox = nimo.getBoundingClientRect();
            const dx = targetBox.left + targetBox.width / 2 >= faceBox.left + faceBox.width / 2 ? 1 : -1;
            const dy = Math.max(-18, Math.min(25, (targetBox.top - faceBox.top) * .19));
            const sweep = mood === 'typing' ? 14 + gazeStep * 5 : 26;
            movePupils(dx * sweep, dy);
        }
    }

    function resetReaction() {
        clearTimeout(reactionTimer);
        reactionMood = null;
    }

    function react(mood, duration = 2400) {
        resetReaction();
        reactionMood = mood;
        reactionTimer = setTimeout(() => {
            resetReaction();
            render();
        }, duration);
        render();
    }

    // Gaze follows the control and the rhythm of typing. Form values stay with the form.
    email.addEventListener('input', () => {
        gazeStep = (gazeStep + 1) % 5;
        react('typing', 720);
    });
    password.addEventListener('input', () => {
        resetReaction();
        render();
    });
    passwordToggle.addEventListener('click', () => {
        react(passwordToggle.getAttribute('aria-pressed') === 'true' ? 'reveal' : 'conceal');
    });
    remember.addEventListener('change', () => react(remember.checked ? 'remembered' : 'forgotten'));
    form.addEventListener('invalid', () => {
        if (reactionMood !== 'invalid') react('invalid', 3000);
    }, true);

    document.addEventListener('focusin', event => {
        if (form.contains(event.target) && reactionMood === 'typing') resetReaction();
        render();
    });
    document.addEventListener('focusout', () => queueMicrotask(render));
    document.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse') return;
        cursor = { x: event.clientX, y: event.clientY };
        queueCursorGaze();
    }, { passive: true });
    document.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'mouse') clearCursor();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', clearCursor);
    window.addEventListener('blur', clearCursor);
    window.addEventListener('scroll', queueCursorGaze, { passive: true });
    window.addEventListener('resize', queueCursorGaze);
    document.addEventListener('pointerover', event => {
        const control = finePointer.matches ? event.target.closest(controlSelector) : null;
        if (!control || control === hovered) return;
        hovered = control;
        render();
    });
    document.addEventListener('pointerout', event => {
        if (!hovered?.contains(event.target) || hovered.contains(event.relatedTarget)) return;
        hovered = null;
        render();
    });
    document.addEventListener('nextskill:theme-change', event => {
        react(event.detail?.theme === 'dark' ? 'dark' : 'light');
    });

    pause.addEventListener('click', () => {
        paused = !paused;
        pause.textContent = paused ? 'เต้นต่อ' : 'พักท่าเต้น';
        render();
    });

    if (overlay) new MutationObserver(() => {
        if (submitActive()) {
            resetReaction();
            render();
        } else if (summary?.classList.contains('validation-summary-errors')) {
            react('failed', 3500);
        } else {
            render();
        }
    }).observe(overlay, { attributes: true, attributeFilter: ['aria-hidden'] });

    window.NextSkillMotion?.subscribe(motion => {
        ambient = motion.ambientAllowed && canAnimate;
        canSettle = motion.reactionAllowed;
        if (motion.hidden) clearCursor();
        pause.hidden = motion.reduced || motion.paused || !canAnimate;
        render();
    }, { element: nimo });
    if (summary?.classList.contains('validation-summary-errors')) react('failed', 3500);
    else render();
})();
