(() => {
    'use strict';
    const robots = [...document.querySelectorAll('.skill-buddy')];
    const guide = document.querySelector('.map-guide');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const out = 'cubic-bezier(0.23, 1, 0.32, 1)';
    const states = new Map(robots.map(robot => [robot, { animations: [], timer: null, expressionTimer: null }]));
    const catalogue = {
        wave: ['ทักทาย', 'happy', 1000], jump: ['กระโดด', 'happy', 1000],
        smile: ['ยิ้ม', 'happy', 1200], laugh: ['หัวเราะ', 'laughing', 1400],
        sad: ['เศร้า', 'sad', 1600], celebrate: ['ดีใจ', 'excited', 1000],
        cheer: ['ให้กำลังใจ', 'encouraging', 1400], think: ['คิด', 'thinking', 1600],
        surprise: ['ตกใจ', 'surprised', 1000], proud: ['ภูมิใจ', 'proud', 1400],
        sleep: ['ง่วง', 'sleepy', 1600], point: ['ชี้แนะนำ', 'focused', 1200],
        nod: ['พยักหน้า', 'happy', 900], retry: ['ลองอีกครั้ง', 'encouraging', 1400],
        hug: ['ส่งกำลังใจ', 'encouraging', 1400], highfive: ['ไฮไฟว์', 'happy', 1000],
        lift: ['ถูกอุ้ม', 'surprised', 1200], land: ['ลงพื้น', 'happy', 250],
        curious: ['สงสัย', 'curious', 1000], read: ['อ่านหนังสือ', 'focused', 5200],
        walk: ['เดิน', 'happy', 4200], dance: ['เต้น', 'excited', 4000], stretch: ['ยืดตัว', 'happy', 1400]
    };
    const feelings = { idle: 'พร้อมเรียน', happy: 'ยิ้ม', laughing: 'หัวเราะ', sad: 'เศร้า', excited: 'ดีใจ', encouraging: 'ให้กำลังใจ', thinking: 'กำลังคิด', surprised: 'ตกใจ', proud: 'ภูมิใจ', sleepy: 'ง่วง', focused: 'ตั้งใจ', curious: 'สงสัย' };
    let idleTimer;
    let idleTurn = 0;

    function express(robot, mood, options = {}) {
        if (!states.has(robot)) return;
        const state = states.get(robot);
        clearTimeout(state.expressionTimer);
        robot.dataset.emotion = Object.hasOwn(feelings, mood) ? mood : 'idle';
        document.dispatchEvent(new CustomEvent('nextskill:buddy-expression', { detail: { emotion: robot.dataset.emotion, label: feelings[robot.dataset.emotion], pose: options.pose || null } }));
        if (robot.dataset.emotion !== 'idle') state.expressionTimer = setTimeout(() => express(robot, 'idle'), options.duration || 2800);
    }

    function emotionalPose(robot, pose, duration) {
        const recipes = {
            smile: { '.buddy-upper': ['none', 'rotate(-5deg) scale(1.03)', 'rotate(3deg) scale(1.02)', 'none'], '.arm-left': ['rotate(29deg)', 'rotate(63deg)', 'rotate(48deg)', 'rotate(29deg)'], '.arm-right': ['rotate(33deg)', 'rotate(-7deg)', 'rotate(13deg)', 'rotate(33deg)'] },
            laugh: { '.buddy-upper': ['none', 'translateY(3px) rotate(-4deg) scale(1.04,.96)', 'translateY(-2px) rotate(4deg)', 'translateY(3px) rotate(-4deg) scale(1.04,.96)', 'translateY(-2px) rotate(4deg)', 'none'], '.arm-left': ['rotate(29deg)', 'rotate(65deg)', 'rotate(55deg)', 'rotate(65deg)', 'rotate(29deg)'], '.arm-right': ['rotate(33deg)', 'translate(-5px,35px) rotate(-35deg)', 'translate(-5px,38px) rotate(-30deg)', 'translate(-5px,35px) rotate(-35deg)', 'rotate(33deg)'] },
            sad: { '.buddy-upper': ['none', 'translateY(9px) rotate(5deg) scale(.98,.97)', 'translateY(9px) rotate(3deg)', 'translateY(5px) rotate(2deg)', 'none'], '.arm-left': ['rotate(29deg)', 'rotate(5deg)', 'rotate(5deg)', 'rotate(29deg)'], '.arm-right': ['rotate(33deg)', 'translate(-3px,60px) rotate(-10deg)', 'translate(-3px,60px) rotate(-10deg)', 'rotate(33deg)'], '.buddy-antenna': ['rotate(10deg)', 'rotate(46deg)', 'rotate(35deg)', 'rotate(10deg)'], '.buddy-tear': ['rotate(45deg) translateY(0)', 'rotate(45deg) translateY(4px)', 'rotate(45deg) translateY(0)'] },
            cheer: { '.buddy-upper': ['none', 'translateY(-4px) rotate(-5deg)', 'translateY(1px) rotate(4deg)', 'translateY(-4px) rotate(-5deg)', 'none'], '.arm-left': ['rotate(29deg)', 'rotate(120deg)', 'rotate(90deg)', 'rotate(120deg)', 'rotate(29deg)'], '.arm-right': ['rotate(33deg)', 'rotate(-45deg)', 'rotate(-20deg)', 'rotate(-45deg)', 'rotate(33deg)'] },
            think: { '.buddy-upper': ['none', 'rotate(8deg) translateY(2px)', 'rotate(8deg)', 'rotate(-3deg)', 'none'], '.arm-right': ['rotate(33deg)', 'translate(-24px,35px) rotate(-65deg)', 'translate(-24px,35px) rotate(-65deg)', 'rotate(33deg)'] },
            surprise: { '.buddy-rig': ['none', 'translateY(5px) scale(1.05,.94)', 'translateY(-9px) scale(.96,1.05)', 'translateY(2px) rotate(3deg)', 'none'], '.arm-left': ['rotate(29deg)', 'rotate(105deg)', 'rotate(90deg)', 'rotate(29deg)'], '.arm-right': ['rotate(33deg)', 'rotate(-40deg)', 'rotate(-25deg)', 'rotate(33deg)'] },
            proud: { '.buddy-upper': ['none', 'translateY(-4px) scale(1.04) rotate(-4deg)', 'translateY(-3px) scale(1.04) rotate(3deg)', 'none'], '.arm-left': ['rotate(29deg)', 'rotate(75deg)', 'rotate(70deg)', 'rotate(29deg)'], '.arm-right': ['rotate(33deg)', 'translate(-10px,48px) rotate(-65deg)', 'translate(-10px,48px) rotate(-65deg)', 'rotate(33deg)'] },
            sleep: { '.buddy-upper': ['none', 'translateY(7px) rotate(6deg)', 'translateY(9px) rotate(8deg)', 'translateY(7px) rotate(5deg)', 'none'], '.arm-left': ['rotate(29deg)', 'rotate(8deg)', 'rotate(8deg)', 'rotate(29deg)'], '.buddy-antenna': ['rotate(10deg)', 'rotate(40deg)', 'rotate(45deg)', 'rotate(10deg)'] },
            point: { '.buddy-upper': ['none', 'translateX(-4px) rotate(-6deg)', 'translateX(-4px) rotate(-6deg)', 'none'], '.arm-right': ['rotate(33deg)', 'translate(-15px,18px) rotate(-76deg)', 'translate(-15px,18px) rotate(-70deg)', 'rotate(33deg)'] },
            nod: { '.buddy-upper': ['none', 'translateY(5px) rotate(3deg)', 'translateY(-2px) rotate(-2deg)', 'translateY(4px) rotate(2deg)', 'none'] },
            retry: { '.buddy-upper': ['none', 'rotate(-5deg)', 'rotate(5deg)', 'translateY(-3px) rotate(-3deg)', 'none'], '.arm-right': ['rotate(33deg)', 'rotate(5deg)', 'rotate(-20deg)', 'rotate(15deg)', 'rotate(33deg)'] },
            hug: { '.buddy-upper': ['none', 'scale(1.04) rotate(-4deg)', 'scale(1.04) rotate(4deg)', 'none'], '.arm-left': ['rotate(29deg)', 'rotate(85deg)', 'rotate(85deg)', 'rotate(29deg)'], '.arm-right': ['rotate(33deg)', 'translate(-20px,58px) rotate(-75deg)', 'translate(-20px,58px) rotate(-75deg)', 'rotate(33deg)'] },
            lift: { '.buddy-upper': ['none', 'rotate(-6deg) scale(.97,1.04)', 'rotate(5deg) scale(.97,1.04)', 'none'], '.arm-left': ['rotate(29deg)', 'rotate(112deg)', 'rotate(100deg)', 'rotate(29deg)'], '.arm-right': ['rotate(33deg)', 'rotate(-42deg)', 'rotate(-30deg)', 'rotate(33deg)'], '.foot-left': ['rotate(-8deg)', 'translateY(-6px) rotate(-26deg)', 'rotate(-8deg)'], '.foot-right': ['rotate(8deg)', 'translateY(-6px) rotate(26deg)', 'rotate(8deg)'] },
            land: { '.buddy-rig': ['scale(1.07,.91)', 'scale(.98,1.03)', 'none'], '.buddy-shadow': ['scale(1.12,.8)', 'scale(.96)', 'scale(1)'] }
        };
        const tracks = recipes[pose];
        if (!tracks) return false;
        Object.entries(tracks).forEach(([selector, frames]) => part(robot, selector, frames, duration));
        return true;
    }

    function visible(robot) {
        const modal = document.querySelector('dialog[open]');
        if (modal && !modal.contains(robot)) return false;
        const box = robot.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
    }
    function enabled() { return !reduce.matches && !document.hidden && (guide ? guide.dataset.motion === 'active' : window.NextSkillAgent?.motionAllowed()); }
    function stop(robot) {
        const state = states.get(robot);
        clearTimeout(state.timer);
        state.animations.forEach(animation => animation.cancel());
        state.animations = [];
        delete robot.dataset.posing;
    }
    function part(robot, selector, values, duration = 1000) {
        const element = robot.querySelector(selector);
        if (!element) return;
        const current = getComputedStyle(element).transform;
        element.getAnimations().forEach(animation => animation.cancel());
        const frames = values.map((transform, i) => ({ transform: i === 0 && current !== 'none' ? current : transform }));
        const animation = element.animate(frames, { duration, easing: 'linear' });
        states.get(robot).animations.push(animation);
    }
    // Sample a damped spring (mass 1, stiffness 100, damping 10) for a soft landing.
    function springReturn(robot, selector, amount, format, duration = 1000) {
        const frames = Array.from({ length: 41 }, (_, index) => {
            const time = index / 40;
            const value = amount * Math.exp(-5 * time) * (Math.cos(Math.sqrt(75) * time) + 5 / Math.sqrt(75) * Math.sin(Math.sqrt(75) * time));
            return format(index === 40 ? 0 : value);
        });
        part(robot, selector, frames, duration);
    }
    function sequence(robot, pose, duration) {
        // One shared clock keeps planted feet, opposing arms and the travelling shadow together.
        const tracks = new Map();
        function frame(selector, transform) {
            if (!tracks.has(selector)) tracks.set(selector, []);
            tracks.get(selector).push(transform);
        }
        for (let index = 0; index <= 120; index++) {
            const t = index / 120;
            const fade = Math.sin(Math.min(1, t / .09, (1 - t) / .09) * Math.PI / 2);
            if (pose === 'walk') {
                const phase = t * Math.PI * 12;
                const stride = Math.sin(phase) * fade;
                const bob = Math.abs(stride);
                const travel = 32 * Math.sin(t * Math.PI * 2);
                const facing = 19 * Math.tanh(Math.cos(t * Math.PI * 2) * 5) * fade;
                frame('.buddy-travel', `translateX(${travel}px) rotateY(${facing}deg)`);
                frame('.buddy-rig', `translateY(${-4 * bob}px) rotate(${2 * stride}deg)`);
                frame('.buddy-upper', `translateY(${-2 * bob}px) rotate(${-3 * stride}deg)`);
                frame('.arm-left', `rotate(${29 - 32 * stride}deg)`);
                frame('.arm-right', `rotate(${33 + 32 * stride}deg)`);
                frame('.leg-left', `rotate(${-19 * stride}deg)`);
                frame('.leg-right', `rotate(${19 * stride}deg)`);
                frame('.foot-left', `translate(${11 * stride}px,${-13 * Math.max(0, stride)}px) rotate(${-8 + 18 * stride}deg)`);
                frame('.foot-right', `translate(${-11 * stride}px,${-13 * Math.max(0, -stride)}px) rotate(${8 - 18 * stride}deg)`);
                frame('.buddy-antenna', `rotate(${10 + 11 * Math.sin(phase - .6) * fade}deg)`);
                frame('.buddy-shadow', `scale(${1 - .07 * bob},${1 - .1 * bob})`);
            } else {
                const beat = Math.sin(t * Math.PI * 8) * fade;
                const bounce = Math.abs(beat);
                const swing = Math.sin(t * Math.PI * 4) * fade;
                frame('.buddy-travel', `translateX(${14 * swing}px) rotate(${4 * swing}deg)`);
                frame('.buddy-rig', `translateY(${-12 * bounce}px) rotate(${7 * beat}deg) scale(${1 + .035 * bounce},${1 - .025 * bounce})`);
                frame('.buddy-upper', `translateX(${4 * beat}px) rotate(${-9 * swing}deg)`);
                frame('.arm-left', `rotate(${29 + (65 + 40 * Math.sin(t * Math.PI * 8 - .5)) * fade}deg)`);
                frame('.arm-right', `rotate(${33 - (55 + 40 * Math.sin(t * Math.PI * 8 + .5)) * fade}deg)`);
                frame('.leg-left', `rotate(${-12 * beat}deg)`);
                frame('.leg-right', `rotate(${-12 * beat}deg)`);
                frame('.foot-left', `translate(${-5 * beat}px,${-12 * Math.max(0, beat)}px) rotate(${-8 - 23 * beat}deg)`);
                frame('.foot-right', `translate(${-5 * beat}px,${-12 * Math.max(0, -beat)}px) rotate(${8 - 23 * beat}deg)`);
                frame('.buddy-antenna', `rotate(${10 + 24 * Math.sin(t * Math.PI * 8 - .7) * fade}deg)`);
                frame('.buddy-shadow', `scale(${1 - .18 * bounce},${1 - .14 * bounce})`);
            }
        }
        tracks.forEach((frames, selector) => part(robot, selector, frames, duration));
    }
    function activity() {
        const robot = document.querySelector('#nextskill-agent .skill-buddy');
        const label = document.getElementById('companion-activity');
        if (!robot || !label) return;
        const captions = { read: 'อ่านด้วยกัน ทีละหน้า', walk: 'ขยับร่างกายช่วงพัก', dance: 'ฉลองช่วงพักเรียน', wave: 'ทำได้แน่ เพื่อนร่วมทีม', celebrate: 'กระโดดฉลองหน่อย', stretch: 'ยืดตัวก่อนบทเรียนถัดไป', curious: 'คิดถึงก้าวถัดไป', smile: 'ส่งยิ้มให้ก้าวถัดไป', laugh: 'หัวเราะสักนิดระหว่างบทเรียน', cheer: 'ค่อย ๆ ไปทีละก้าวได้', think: 'มาคิดด้วยกัน', nod: 'ใช่เลย ไปต่อกัน', retry: 'ลองใหม่ได้เสมอ', proud: 'ทำได้อีกก้าวแล้ว', sad: 'ขออยู่เงียบ ๆ สักนิด', sleep: 'พักสักหน่อยก็ช่วยได้', hug: 'ส่งกำลังใจให้คุณ', surprise: 'มีอะไรใหม่ให้ลองด้วย', point: 'ก้าวถัดไปอยู่ตรงนี้' };
        label.textContent = !enabled() ? 'ช่วงเรียนเงียบ ๆ' : captions[robot.dataset.posing] || 'เตรียมหนังสือแล้ว มาเรียนกัน';
    }
    function act(robot, pose) {
        if (!enabled() || !visible(robot)) return;
        // Retarget from the actual on-screen pose before cancelling a previous action.
        const duration = catalogue[pose]?.[2] || 1000;
        const transforms = new Map([...robot.querySelectorAll('.buddy-travel,.buddy-rig,.buddy-upper,.buddy-arm,.buddy-leg,.buddy-foot,.buddy-antenna,.buddy-shadow')].map(element => [element, getComputedStyle(element).transform]));
        stop(robot);
        robot.dataset.posing = pose;
        transforms.forEach((transform, element) => { element.style.transform = transform; });
        const rest = { '.buddy-travel': 'none', '.buddy-rig': 'none', '.buddy-upper': 'none', '.arm-left': 'rotate(29deg)', '.arm-right': 'rotate(33deg)', '.leg-left': 'none', '.leg-right': 'none', '.foot-left': 'rotate(-8deg)', '.foot-right': 'rotate(8deg)', '.buddy-shadow': 'scale(1)' };
        Object.entries(rest).forEach(([selector, transform]) => part(robot, selector, [transform, transform], duration));
        if (emotionalPose(robot, pose, duration)) {
            // Expressions coordinate shoulders, arms and secondary motion on the same clock.
        } else if (pose === 'read') {
            part(robot, '.buddy-upper', ['none', 'translateY(3px) rotate(3deg)', 'translateY(1px) rotate(-2deg)', 'translateY(3px) rotate(2deg)', 'none'], duration);
            part(robot, '.arm-left', ['rotate(68deg)', 'rotate(72deg)', 'rotate(68deg)', 'rotate(72deg)', 'rotate(68deg)'], duration);
            part(robot, '.arm-right', ['translate(-8px,65px) rotate(-50deg)', 'translate(-8px,63px) rotate(-54deg)', 'translate(-8px,65px) rotate(-50deg)'], duration);
        } else if (pose === 'walk' || pose === 'dance') {
            sequence(robot, pose, duration);
        } else if (pose === 'celebrate' || pose === 'jump') {
            part(robot, '.buddy-rig', ['none', 'translateY(7px) scale(1.08,.90)', 'translateY(-28px) rotate(-5deg) scale(.96,1.04)', 'translateY(-16px) rotate(4deg)', 'translateY(3px) scale(1.06,.94)', 'translateY(-2px)', 'none']);
            part(robot, '.arm-left', ['rotate(29deg)', 'rotate(38deg)', 'rotate(115deg)', 'rotate(100deg)', 'rotate(38deg)', 'rotate(25deg)', 'rotate(29deg)']);
            part(robot, '.arm-right', ['rotate(33deg)', 'rotate(20deg)', 'rotate(-35deg)', 'rotate(-25deg)', 'rotate(40deg)', 'rotate(30deg)', 'rotate(33deg)']);
            part(robot, '.foot-left', ['rotate(-8deg)', 'rotate(-8deg)', 'rotate(-25deg)', 'rotate(-18deg)', 'rotate(-8deg)', 'rotate(-8deg)', 'rotate(-8deg)']);
            part(robot, '.foot-right', ['rotate(8deg)', 'rotate(8deg)', 'rotate(25deg)', 'rotate(18deg)', 'rotate(8deg)', 'rotate(8deg)', 'rotate(8deg)']);
            part(robot, '.buddy-shadow', ['scale(1)', 'scale(1.12,.8)', 'scale(.65,.7)', 'scale(.8,.8)', 'scale(1.1,.9)', 'scale(.98)', 'scale(1)']);
        } else if (pose === 'stretch') {
            part(robot, '.buddy-upper', ['none', 'translateY(3px) scale(1.03,.97)', 'translateY(-7px) scale(.97,1.06)', 'translateY(-7px) rotate(5deg)', 'translateY(-7px) rotate(-5deg)', 'translateY(2px) scale(1.02,.98)', 'none'], 1400);
            part(robot, '.arm-left', ['rotate(29deg)', 'rotate(50deg)', 'rotate(150deg)', 'rotate(145deg)', 'rotate(150deg)', 'rotate(50deg)', 'rotate(29deg)'], 1400);
            part(robot, '.arm-right', ['rotate(33deg)', 'rotate(0deg)', 'rotate(-45deg)', 'rotate(-40deg)', 'rotate(-45deg)', 'rotate(10deg)', 'rotate(33deg)'], 1400);
        } else if (pose === 'curious') {
            part(robot, '.buddy-upper', ['none', 'translateX(4px) rotate(8deg)', 'translateX(4px) rotate(8deg)', 'translateX(-2px) rotate(-3deg)', 'none']);
            part(robot, '.arm-left', ['rotate(29deg)', 'rotate(65deg)', 'rotate(65deg)', 'rotate(22deg)', 'rotate(29deg)']);
        } else {
            part(robot, '.buddy-upper', ['none', 'translateX(-4px) rotate(-6deg)', 'translateX(-4px) rotate(-6deg)', 'translateX(2px) rotate(2deg)', 'none']);
            part(robot, '.arm-right', ['rotate(33deg)', 'rotate(-30deg)', 'rotate(25deg)', 'rotate(-25deg)', 'rotate(22deg)', 'rotate(33deg)']);
            part(robot, '.arm-left', ['rotate(29deg)', 'rotate(18deg)', 'rotate(15deg)', 'rotate(24deg)', 'rotate(29deg)']);
            part(robot, '.foot-right', ['rotate(8deg)', 'translateY(-4px) rotate(18deg)', 'translateY(-4px) rotate(18deg)', 'rotate(8deg)', 'rotate(8deg)']);
        }
        if (!['walk', 'dance', 'sad', 'sleep'].includes(pose)) springReturn(robot, '.buddy-antenna', -22, value => `rotate(${10 + value}deg)`, duration);
        part(robot, '.buddy-mood-mark', ['rotate(12deg)', 'translateY(-7px) rotate(-6deg)', 'rotate(12deg)'], duration);
        if (!['laugh', 'celebrate', 'dance', 'sleep', 'surprise'].includes(pose)) robot.querySelectorAll('.buddy-eye').forEach(eye => {
            const animation = eye.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.12)' }, { transform: 'scaleY(1)' }], { duration: 160, easing: out });
            states.get(robot).animations.push(animation);
        });
        transforms.forEach((_, element) => { element.style.removeProperty('transform'); });
        states.get(robot).timer = setTimeout(() => { stop(robot); refresh(); }, duration);
        activity();
    }
    function refresh() {
        robots.forEach(robot => {
            const active = enabled() && visible(robot);
            robot.dataset.living = String(active);
            robot.dataset.reading = String(['arrival', 'studio', 'lesson', 'practice'].includes(robot.dataset.context));
            if (!active) stop(robot);
        });
        activity();
    }
    function idle() {
        clearTimeout(idleTimer);
        if (enabled()) {
            idleTurn++;
            robots.filter(robot => visible(robot) && !robot.dataset.posing).forEach(robot => {
                // Reading is the default study behaviour. Break-time poses remain user initiated.
                if (['arrival', 'studio', 'lesson', 'practice'].includes(robot.dataset.context) && idleTurn % 2 === 0) window.NextSkillBuddyMotion.play('read', robot);
                else if (idleTurn % 3 === 0) window.NextSkillBuddyMotion.play('curious', robot);
                else robot.querySelectorAll('.buddy-eye').forEach(eye => {
                    const animation = eye.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.12)' }, { transform: 'scaleY(1)' }], { duration: 160, easing: out });
                    states.get(robot).animations.push(animation);
                    animation.finished.then(() => {
                        const list = states.get(robot).animations;
                        const index = list.indexOf(animation);
                        if (index >= 0) list.splice(index, 1);
                    }, () => {});
                });
            });
        }
        idleTimer = setTimeout(idle, 5200);
    }
    const observer = new IntersectionObserver(refresh, { threshold: [0, .2] });
    robots.forEach(robot => observer.observe(robot));
    const mutation = new MutationObserver(refresh);
    if (guide) mutation.observe(guide, { attributes: true, attributeFilter: ['data-motion'] });
    document.querySelectorAll('dialog').forEach(dialog => {
        mutation.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    });
    document.addEventListener('visibilitychange', refresh);
    reduce.addEventListener('change', refresh);
    window.addEventListener('pagehide', () => { clearTimeout(idleTimer); robots.forEach(robot => { stop(robot); clearTimeout(states.get(robot).expressionTimer); }); observer.disconnect(); mutation.disconnect(); });
    window.addEventListener('pageshow', () => { robots.forEach(robot => observer.observe(robot)); if (guide) mutation.observe(guide, { attributes: true, attributeFilter: ['data-motion'] }); document.querySelectorAll('dialog').forEach(dialog => mutation.observe(dialog, { attributes: true, attributeFilter: ['open'] })); refresh(); clearTimeout(idleTimer); idleTimer = setTimeout(idle, 2200); });
    window.NextSkillBuddyMotion = {
        play: (pose, target, options = {}) => {
            const entry = catalogue[pose];
            if (!entry) return;
            (target ? [target] : robots).forEach(robot => {
                express(robot, entry[1], { pose, duration: Math.max(2600, entry[2] + 400) });
                if (options.motion !== false) act(robot, pose); else stop(robot);
            });
        },
        express: (mood, options = {}) => robots.forEach(robot => express(robot, mood, options)),
        list: () => Object.entries(catalogue).map(([pose, [label, emotion, duration]]) => ({ pose, label, emotion, duration })),
        stop: target => { if (states.has(target)) stop(target); },
        refresh
    };
    document.dispatchEvent(new CustomEvent('nextskill:buddy-ready'));
    refresh();
    idleTimer = setTimeout(idle, 2200);
})();
