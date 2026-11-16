(() => {
    'use strict';
    const robots = [...document.querySelectorAll('.skill-buddy')];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const out = 'cubic-bezier(0.23, 1, 0.32, 1)';
    const catalogue = {
        wave: ['ขยับทักทาย', 'happy', 400], jump: ['กระโดดเบา ๆ', 'happy', 600],
        smile: ['ส่งความสดใส', 'happy', 400], laugh: ['โยกตัวสนุก', 'laughing', 600],
        sad: ['พักเงียบ ๆ', 'sad', 400], celebrate: ['ฉลองความสำเร็จ', 'excited', 600],
        cheer: ['ส่งกำลังใจ', 'encouraging', 400], think: ['เอียงตัวคิด', 'thinking', 400],
        surprise: ['ขยับประหลาดใจ', 'surprised', 400], proud: ['ภูมิใจกับก้าวใหม่', 'proud', 800],
        sleep: ['พักนิ่ง', 'sleepy', 300], point: ['ชวนดูขั้นถัดไป', 'focused', 400],
        nod: ['ขยับตอบรับ', 'happy', 400], retry: ['ชวนลองอีกครั้ง', 'encouraging', 400],
        hug: ['ส่งกำลังใจ', 'encouraging', 400], highfive: ['ตอบรับด้วยกัน', 'happy', 400],
        lift: ['ขยับขึ้นเบา ๆ', 'surprised', 400], land: ['กลับมาพร้อมเรียน', 'happy', 200],
        curious: ['เอียงตัวสงสัย', 'curious', 400], read: ['พร้อมอ่านด้วยกัน', 'focused', 200],
        walk: ['โยกตัวช่วงพัก', 'happy', 800], dance: ['โยกตามจังหวะ', 'excited', 800], stretch: ['ขยับพักสักนิด', 'happy', 600]
    };
    const feelings = { idle: 'พร้อมเรียน', happy: 'สดใส', laughing: 'สนุก', sad: 'พักสักนิด', excited: 'ดีใจ', encouraging: 'ให้กำลังใจ', thinking: 'กำลังคิด', surprised: 'ประหลาดใจ', proud: 'ภูมิใจ', sleepy: 'พักนิ่ง', focused: 'ตั้งใจ', curious: 'สงสัย' };
    const states = new Map(robots.map(robot => [robot, { animation: null, timer: 0, priority: -1, generation: 0 }]));
    const policy = robot => window.NextSkillMotion?.snapshot({ element: robot, kind: 'reaction' }) || { reactionAllowed: !reduce.matches && !document.hidden, ambientAllowed: !reduce.matches && !document.hidden, paused: false, reduced: reduce.matches };
    const idle = robot => {
        const ambient = policy(robot).ambientAllowed && !robot.dataset.posing && !robot.closest('[data-voyage="rowing"]');
        robot.dataset.living = String(ambient);
        const wrapper = robot.querySelector('.buddy-idle-motion');
        if (wrapper) wrapper.style.animationPlayState = ambient ? 'running' : 'paused';
    };
    function activity(robot, label) {
        const status = document.getElementById('companion-activity');
        if (status) status.textContent = label || 'พร้อมเรียนไปด้วยกัน';
        document.dispatchEvent(new CustomEvent('nextskill:buddy-expression', { detail: { emotion: robot.dataset.emotion || 'idle', label: feelings[robot.dataset.emotion] || feelings.idle, pose: robot.dataset.posing || null } }));
    }
    function stop(robot) {
        const state = states.get(robot);
        if (!state) return;
        state.generation++;
        clearTimeout(state.timer); state.timer = 0;
        state.animation?.cancel(); state.animation = null; state.priority = -1;
        delete robot.dataset.posing;
        robot.dataset.emotion = 'idle';
        const wrapper = robot.querySelector('.buddy-reaction');
        if (wrapper) wrapper.style.removeProperty('transform');
        idle(robot);
    }
    function tracks(pose) {
        if (pose === 'read' || pose === 'sleep') return ['none', 'none'];
        if (pose === 'land') return ['scale(1.04,.96)', 'scale(.99,1.01)', 'none'];
        if (pose === 'wave') return ['none', 'rotate(-5deg)', 'rotate(4deg)', 'rotate(-2deg)', 'none'];
        if (pose === 'cheer') return ['none', 'translateY(-5px) rotate(3deg)', 'none'];
        if (['celebrate', 'jump', 'proud'].includes(pose)) return [
            { transform: 'none', offset: 0 },
            { transform: 'scale(1.02,.98)', offset: 1 / 6 },
            { transform: `translateY(-${pose === 'proud' ? 11 : 8}px) scale(1)`, offset: 7 / 12 },
            { transform: 'none', offset: 1 }
        ];
        if (['nod', 'retry', 'highfive'].includes(pose)) return ['none', 'translateY(3px) rotate(2deg)', 'none'];
        if (['dance', 'walk', 'laugh'].includes(pose)) return ['none', 'translateX(-3px) rotate(-3deg)', 'translateX(3px) rotate(3deg)', 'none'];
        if (pose === 'stretch') return ['none', 'translateY(-3px) rotate(-3deg)', 'none'];
        return ['none', `rotate(${['think', 'curious', 'point'].includes(pose) ? 3 : -3}deg)`, 'none'];
    }
    function play(pose, target, options = {}) {
        const entry = catalogue[pose];
        if (!entry) return false;
        const targets = target instanceof Element ? [target] : robots;
        let played = false;
        targets.forEach(robot => {
            const state = states.get(robot), wrapper = robot.querySelector('.buddy-reaction');
            if (!state || !wrapper) return;
            const priority = Number.isFinite(options.priority) ? options.priority : ['celebrate', 'proud'].includes(pose) ? 4 : ['retry', 'nod'].includes(pose) ? 3 : pose === 'read' ? 1 : 2;
            if (state.priority > priority) return;
            if (priority === 0 && (!policy(robot).ambientAllowed || document.querySelector('dialog[open]'))) return;
            const current = getComputedStyle(wrapper).transform;
            stop(robot);
            const generation = state.generation;
            state.priority = priority;
            robot.dataset.posing = pose; robot.dataset.emotion = entry[1];
            activity(robot, entry[0]); idle(robot); played = true;
            if (policy(robot).reactionAllowed && options.motion !== false) {
                const frames = tracks(pose).map(value => typeof value === 'string' ? { transform: value } : { ...value });
                frames[0].transform = current === 'none' ? 'none' : current;
                state.animation = wrapper.animate(frames, { duration: entry[2], easing: out });
            }
            state.timer = setTimeout(() => { if (state.generation === generation) { stop(robot); activity(robot); } }, Math.max(entry[2], 1600));
        });
        return played;
    }
    function express(mood, options = {}) {
        robots.forEach(robot => {
            if (!Object.hasOwn(feelings, mood)) return;
            robot.dataset.emotion = mood; activity(robot, feelings[mood]);
            if (options.pose) play(options.pose, robot, options);
        });
    }
    function refresh() {
        robots.forEach(robot => {
            if (!policy(robot).reactionAllowed) stop(robot);
            idle(robot);
        });
    }
    robots.forEach(robot => {
        window.NextSkillMotion?.subscribe(state => { if (!state.reactionAllowed) stop(robot); idle(robot); }, { element: robot, kind: 'reaction' });
    });
    document.addEventListener('ocean:fish-jump', () => {
        if (!document.querySelector('dialog[open]') && document.querySelector('.ocean-home')) play('curious', undefined, { priority: 0 });
    });
    document.addEventListener('visibilitychange', refresh);
    reduce.addEventListener('change', refresh);
    window.addEventListener('pagehide', () => robots.forEach(stop));
    window.addEventListener('pageshow', refresh);
    window.NextSkillBuddyMotion = { play, express, stop, refresh, list: () => Object.entries(catalogue).map(([pose, [label, emotion, duration]]) => ({ pose, label, emotion, duration })) };
    document.dispatchEvent(new CustomEvent('nextskill:buddy-ready'));
    refresh();
})();

(() => {
    'use strict';

    // Decorative idle gestures only run when Nimo is on the landing-page shore
    // or docked, visible and not already responding to another action.
    const scene = document.querySelector('.ocean-home .ow-scene');
    const robot = document.querySelector('#nextskill-agent .skill-buddy');
    if (!scene || !robot || !window.NextSkillBuddyMotion) return;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const poses = ['curious', 'nod', 'wave', 'think', 'dance'];
    let index = 0;
    let timer = 0;
    let lastScroll = 0;
    let active = true;

    function canPlay() {
        const policy = window.NextSkillMotion?.snapshot({ element: robot, kind: 'ambient' });
        const voyage = scene.dataset.voyage;
        return active && !document.hidden && !reduce.matches && !robot.dataset.posing && !robot.dataset.textSpeaking &&
            !document.querySelector('dialog[open]') && !robot.closest('.ow-jump-anchor') &&
            (!voyage || voyage === 'shore' || voyage === 'docked') &&
            performance.now() - lastScroll > 2000 &&
            (policy ? policy.ambientAllowed : !window.NextSkillAgent?.isPaused());
    }

    function schedule(delay) {
        if (!active || timer) return;
        timer = window.setTimeout(tick, delay);
    }
    function tick() {
        timer = 0;
        if (canPlay()) {
            window.NextSkillBuddyMotion.play(poses[index++ % poses.length], robot, { priority: 0 });
        }
        // A slow cadence gives the user time to read and allows reactions to take priority.
        schedule(7000 + (index % 3) * 1600);
    }
    function refresh() {
        if (document.hidden || reduce.matches) {
            clearTimeout(timer);
            timer = 0;
        } else {
            schedule(5000);
        }
    }
    window.addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
    document.addEventListener('visibilitychange', refresh);
    reduce.addEventListener('change', refresh);
    window.addEventListener('pagehide', () => { active = false; clearTimeout(timer); timer = 0; });
    window.addEventListener('pageshow', () => { active = true; refresh(); });
    window.NextSkillMotion?.subscribe(refresh, { element: robot, kind: 'ambient' });
    refresh();
})();



