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
    const registering = Boolean(form.elements.ConfirmPassword);
    const privateFields = [...form.querySelectorAll('input[name="Password"], input[name="ConfirmPassword"], input[name="InvitationCode"]')];
    const remember = form.querySelector('#RememberMe');
    const passwordToggles = [...form.querySelectorAll('.password-toggle-eye')];
    const submit = form.querySelector('.btn-auth-submit');
    const summary = form.querySelector('.validation-summary');
    const overlay = document.getElementById('nimoLoginLoadingOverlay');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const controlSelector = 'input:not([type="hidden"]), .password-toggle-eye, .btn-auth-submit, .login-account-types a, .btn-skip-outline, .switch-form a, .login-course-link, [data-theme-toggle]';

    const learningQuotes = [
        '“ทักษะใหม่ไม่ได้สร้างในวันเดียว แต่เริ่มได้ตั้งแต่วินาทีที่คุณเปิดใจเรียนรู้”',
        '“การเรียนรู้ไม่มีวันสิ้นสุด ทุกก้าวเล็กๆ วันนี้ คือความสำเร็จในวันหน้า”',
        '“ไม่มีใครเก่งมาตั้งแต่เกิด แต่ทุกคนเก่งขึ้นได้จากการฝึกฝนทุกวัน”',
        '“ความรู้คือสมบัติเดียวที่ยิ่งฝึกฝน ก็ยิ่งติดตัวเราไปตลอดชีวิต”',
        '“เก่งขึ้นแค่วันละ 1% เมื่อครบปี คุณจะก้าวไปไกลกว่าเดิมอย่างไม่น่าเชื่อ!”',
        '“ความผิดพลาดระหว่างฝึก คือครูที่ดีที่สุดที่พาเราไปสู่ความเชี่ยวชาญ”',
        '“ลงทุนเวลาให้การเรียนรู้วันนี้ คือของขวัญที่ดีที่สุดในอนาคต”',
        '“ก้าวแรกของการเรียนรู้อาจท้าทาย แต่มันคุ้มค่าเสมอเมื่อถึงจุดหมาย”'
    ];
    let quoteCursor = 0;
    function nextLearningQuote() {
        const q = learningQuotes[quoteCursor % learningQuotes.length];
        quoteCursor = (quoteCursor + 1) % learningQuotes.length;
        return q;
    }

    const sayings = {
        idle: learningQuotes[0],
        email: 'กรอกอีเมลได้เลย การเรียนรู้บทใหม่กำลังรออยู่!',
        typing: 'ตั้งใจสุดๆ พิมพ์ต่อได้เลยนะ!',
        password: 'นิโมใส่แว่นดำบังให้แล้ว รหัสลับปลอดภัยแน่นอน!',
        reveal: 'แอบเช็ครหัสผ่านให้ชัวร์ก่อนออกเดินทางนะ!',
        conceal: 'นิโมใส่แว่นดำซ่อนรหัสผ่านให้เรียบร้อย!',
        remember: 'ให้เว็บจดจำการเข้าสู่ระบบไว้เรียนต่อครั้งหน้าได้เลย',
        remembered: 'บันทึกไว้ให้แล้ว ครั้งหน้ามาเรียนต่อได้ทันที!',
        forgotten: 'ไว้แวะมาฝึกทักษะใหม่ด้วยกันอีกนะ!',
        ready: learningQuotes[0],
        invalid: 'ลองตรวจสอบข้อมูลในช่องที่แจ้งเตือนอีกนิดนะ',
        failed: 'ไม่เป็นไรนะ ความพยายามคือจุดเริ่มต้นของการเรียนรู้ ลองอีกครั้ง!',
        submitting: learningQuotes[1],
        learner: 'ทุกทักษะฝึกได้ มาเริ่มเรียนฟรีบนเกาะด้วยกันนะ!',
        admin: 'เข้าสู่โหมดผู้ดูแลระบบจัดการคอร์สเรียนกัน!',
        courses: 'สำรวจคอร์สเรียนฟรีทั้งหมด ความรู้ดีๆ รออยู่เพียบ!',
        guest: 'ไปเดินสำรวจหน้าแรกก่อนได้เลย ความรู้เปิดกว้างเสมอ!',
        register: 'ก้าวแรกของการพัฒนาตัวเอง เริ่มต้นที่การสมัครสมาชิกเลย!',
        login: 'มีบัญชีแล้ว ไปเรียนต่อกันได้เลย!',
        light: 'แสงเช้าสดใส เหมาะกับการเริ่มต้นเรียนรู้สิ่งใหม่ที่สุด!',
        dark: 'บรรยากาศเงียบสงบ โฟกัสกับการเรียนรู้ได้เต็มที่เลย~',
        sip: learningQuotes[1]
    };
    const styles = getComputedStyle(nimo);
    const softOut = styles.getPropertyValue('--ns-ease-out').trim();
    const glide = styles.getPropertyValue('--ns-ease-in-out').trim();
    const step = (offset, x = 0, y = 0, turn = 0, width = 1, height = 1, easing = glide) =>
        ({ offset, x, y, turn, width, height, easing });
    const routines = [
        {
            name: 'cool-pose-1', duration: 2800, shades: 'on', speech: false,
            caption: '',
            steps: [
                step(0), step(.35, -2, -2, -2.5, 1.01, .99),
                step(.70, 2, 1, 2, .995, 1.01), step(1)
            ]
        },
        {
            name: 'takeoff-quote-1', duration: 4800, shades: 'off', speech: true,
            getCaption: () => nextLearningQuote(),
            steps: [
                step(0), step(.12, 0, -6, 3, 1.03, .97, softOut),
                step(.26, -2, 1, -1.5, .99, 1.01), step(.55, 2, -2, 1.5),
                step(.82, -1, 0, -1), step(1)
            ]
        }
    ];

    let routineIndex = 0;
    let direction = 1;
    let dance = null;
    let settling = null;
    let speechDelayTimer = null;

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

        clearTimeout(speechDelayTimer);
        const { duration } = routine;
        const activeCaption = typeof routine.getCaption === 'function' ? routine.getCaption() : routine.caption;
        const movement = stage.animate(routine.steps.map(({ offset, x, y, turn, width, height, easing }) => ({
            offset, easing,
            transform: `translate(${x * sign}%, ${y}%) rotate(${turn * sign}deg) scale(${width}, ${height})`
        })), { duration });
        const sprite = poses.get(routine.pose);
        const image = sprite?.querySelector('img');
        const pose = image?.complete && image.naturalWidth ? sprite : null;
        const animations = pose ? [movement, ...blendPoses(pose, routine.blend, duration)] : [movement];
        dance = {
            pose,
            animations,
            caption: activeCaption,
            shades: routine.shades || 'off',
            speech: routine.speech !== false
        };
        nimo.dataset.dancing = routine.name;
        nimo.dataset.shades = dance.shades;

        if (!dance.speech) {
            nimo.dataset.speechVisible = 'false';
        } else {
            // Keep bubble hidden while sunglasses are lifting off, then pop open with the learning quote!
            nimo.dataset.speechVisible = 'false';
            if (activeCaption) caption.textContent = activeCaption;
            speechDelayTimer = setTimeout(() => {
                if (dance && dance.speech) {
                    nimo.dataset.speechVisible = 'true';
                }
            }, 420);
        }

        movement.onfinish = () => {
            if (dance?.animations !== animations) return;
            endDance(false);
            render();
        };
    }

    function endDance(smooth) {
        clearTimeout(speechDelayTimer);
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
        if (privateFields.includes(control) || passwordToggles.includes(control)) return 'password';
        if (control === remember) return 'remember';
        if (control === submit) return 'ready';
        if (control.matches('.login-account-types a')) {
            return /\/Admin(?:Login|Register)$/i.test(control.pathname) ? 'admin' : 'learner';
        }
        if (control.matches('.login-course-link')) return 'courses';
        if (control.matches('.btn-skip-outline')) return 'guest';
        if (control.matches('.switch-form a')) return registering ? 'login' : 'register';
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

        if (mood !== 'idle') {
            clearTimeout(speechDelayTimer);
            const message = sayings[mood] || sayings.idle;
            if (caption.textContent !== message) caption.textContent = message;

            // Keep sunglasses ON while filling out email/password/remember so Nimo takes them off right when about to click Login ('ready')!
            const keepShadesOn = privacy || ['email', 'typing', 'remember', 'remembered', 'forgotten'].includes(mood);
            if (keepShadesOn) {
                nimo.dataset.shades = 'on';
                nimo.dataset.speechVisible = privacy ? 'true' : 'false';
            } else {
                const wasOn = nimo.dataset.shades === 'on';
                nimo.dataset.shades = 'off';
                if (wasOn) {
                    nimo.dataset.speechVisible = 'false';
                    speechDelayTimer = setTimeout(() => {
                        nimo.dataset.speechVisible = 'true';
                    }, 340);
                } else {
                    nimo.dataset.speechVisible = 'true';
                }
            }
        } else if (!dance) {
            // Fallback if ambient motion is disabled
            nimo.dataset.shades = 'off';
            nimo.dataset.speechVisible = 'true';
            if (!caption.textContent) caption.textContent = sayings.idle;
        } else if (dance.caption && caption.textContent !== dance.caption) {
            caption.textContent = dance.caption;
        }

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
    privateFields.forEach(field => field.addEventListener('input', () => {
        resetReaction();
        render();
    }));
    passwordToggles.forEach(toggle => toggle.addEventListener('click', () => {
        react(toggle.getAttribute('aria-pressed') === 'true' ? 'reveal' : 'conceal');
    }));
    remember?.addEventListener('change', () => react(remember.checked ? 'remembered' : 'forgotten'));
    form.addEventListener('invalid', () => {
        if (reactionMood !== 'invalid') react('invalid', 3000);
    }, true);

    // When the user is about to click "เข้าสู่ระบบ" (hover / focus / pointerenter on submit button),
    // Nimo takes off his sunglasses by himself and speaks an inspiring learning quote!
    if (submit) {
        const triggerLoginReadyQuote = () => {
            const quote = nextLearningQuote();
            sayings.ready = quote;
            sayings.submitting = quote;
            if (nimo.dataset.shades === 'off') {
                nimo.dataset.speechVisible = 'false';
                nimo.dataset.shades = 'on';
                setTimeout(() => {
                    hovered = submit;
                    react('ready', 4800);
                }, 220);
            } else {
                hovered = submit;
                react('ready', 4800);
            }
        };
        submit.addEventListener('pointerenter', triggerLoginReadyQuote);
        submit.addEventListener('focus', triggerLoginReadyQuote);
    }

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

    pause?.addEventListener('click', event => {
        event.stopPropagation();
        paused = !paused;
        pause.textContent = paused ? 'เต้นต่อ' : 'พักท่าเต้น';
        render();
    });

    nimo.addEventListener('click', event => {
        if (event.target.closest('[data-nimo-pause]')) return;
        sayings.sip = learningQuotes[quoteCursor % learningQuotes.length];
        quoteCursor = (quoteCursor + 1) % learningQuotes.length;
        // Put shades on briefly if they were off so user sees the cool takeoff transition!
        nimo.dataset.shades = 'on';
        nimo.dataset.speechVisible = 'false';
        setTimeout(() => {
            react('sip', 4600);
        }, 280);
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
        if (pause) pause.hidden = motion.reduced || motion.paused || !canAnimate;
        render();
    }, { element: nimo });
    if (summary?.classList.contains('validation-summary-errors')) react('failed', 3500);
    else render();
})();
