(() => {
    'use strict';
    const dialog = document.getElementById('companion-dialog');
    const guide = document.querySelector('.map-guide');
    if (!dialog || !guide) return;

    const storageKey = 'nextskill.companion.v1';
    const colours = ['sprout', 'sky', 'sunshine', 'berry'];
    const accessoryRequirements = { none: 0, star: 1, scarf: 3 };
    const signals = [
        { id: 'book', label: 'หนังสือ', icon: 'icon-book' },
        { id: 'bolt', label: 'สายฟ้า', icon: 'icon-lightning' },
        { id: 'star', label: 'ดาว', icon: 'icon-star' }
    ];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const status = document.getElementById('companion-status');
    const speech = document.getElementById('companion-speech');
    const motionControl = document.getElementById('companion-motion');
    const robots = [...document.querySelectorAll('.skill-buddy')];
    let storageAvailable = true;
    let game = { phase: 'idle', sequence: [], entered: [], awarded: false };
    let pointerFrame = 0;
    let pointer = { x: 0, y: 0 };

    const cleanName = value => typeof value === 'string'
        ? value.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 18) : '';

    function normalise(value) {
        const data = value && typeof value === 'object' && value.version === 1 ? value : {};
        const stars = Number.isInteger(data.stars) && data.stars >= 0 ? Math.min(data.stars, 9999) : 0;
        const accessory = Object.hasOwn(accessoryRequirements, data.accessory) && stars >= accessoryRequirements[data.accessory]
            ? data.accessory : 'none';
        const theme = document.body.dataset.companionTheme || 'ocean';
        let colour = data.colourRevision === 2 && colours.includes(data.colour) ? data.colour : 'sky';
        if (theme === 'learning-club' && data.theme !== theme && colour === 'sky') colour = 'sunshine';
        return { version: 1, colourRevision: 2, theme, name: cleanName(data.name) || 'Niko', colour, accessory, stars };
    }

    function load() {
        try { return normalise(JSON.parse(localStorage.getItem(storageKey))); }
        catch { return normalise(null); }
    }
    let buddy = load();

    function save() {
        try { localStorage.setItem(storageKey, JSON.stringify(buddy)); }
        catch { storageAvailable = false; }
        document.getElementById('companion-storage-note').textContent = storageAvailable
            ? 'ข้อมูลคู่หูเก็บในเบราว์เซอร์นี้ แยกจากผลการเรียน'
            : 'เบราว์เซอร์นี้บันทึกข้อมูลคู่หูไม่ได้ การตั้งค่าจะอยู่ชั่วคราว';
    }

    function say(text) {
        speech.textContent = text;
        status.textContent = text;
    }

    function emotion(kind, caption) {
        if (window.NextSkillBuddyMotion) window.NextSkillBuddyMotion.express(kind);
        else robots.forEach(robot => { robot.dataset.emotion = kind; });
        document.getElementById('companion-emotion').textContent = caption;
    }

    function pose(kind, event) {
        document.dispatchEvent(new CustomEvent('nextskill:buddy-pose', {
            detail: { pose: kind, motion: event?.detail > 0 }
        }));
    }

    function render() {
        const level = buddy.stars < 3 ? 1 : buddy.stars < 6 ? 2 : 3;
        const title = ['เพื่อนใหม่', 'คู่หู', 'ทีมผจญภัย'][level - 1];
        robots.forEach(robot => {
            robot.dataset.colour = buddy.colour;
            robot.dataset.accessory = buddy.accessory;
            robot.dataset.level = String(level);
        });
        document.querySelectorAll('[data-buddy-name]').forEach(node => { node.textContent = buddy.name; });
        document.querySelectorAll('[data-companion-level]').forEach(node => { node.textContent = `ระดับ ${level} · ${title}`; });
        document.querySelectorAll('[data-companion-level-short]').forEach(node => { node.textContent = `ระดับ ${level}`; });
        document.querySelectorAll('[data-companion-star-count]').forEach(node => { node.textContent = `${buddy.stars} ดาว`; });
        document.getElementById('companion-stars').textContent = `${buddy.stars} ดาว`;
        const progress = document.getElementById('companion-bond');
        progress.value = level === 3 ? 3 : buddy.stars % 3;
        progress.textContent = `${progress.value} / 3`;
        document.getElementById('companion-next-level').textContent = level === 3
            ? 'ปลดล็อกทีมผจญภัยแล้ว'
            : `อีก ${3 - buddy.stars % 3} ดาวเพื่อขึ้นระดับ ${level + 1}`;
        document.getElementById('companion-next-unlock').textContent = buddy.stars < 1
            ? 'ของแต่งชิ้นแรก: เข็มกลัดดาว' : buddy.stars < 3 ? 'ของแต่งถัดไป: ผ้าพันคอ' : 'ปลดล็อกของแต่งครบแล้ว';
        document.getElementById('companion-unlock-hint').textContent = buddy.stars < 1
            ? 'เล่นเกมเพื่อสะสม 1 ดาว' : buddy.stars < 3 ? `อีก ${3 - buddy.stars} ดาวคู่หู` : 'เลือกชุดที่ชอบได้ในหน้าแต่งตัว';
        const nameInput = document.getElementById('companion-name');
        if (document.activeElement !== nameInput) nameInput.value = buddy.name;
        document.querySelectorAll('[data-companion-colour]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.companionColour === buddy.colour));
        });
        document.querySelectorAll('[data-companion-accessory]').forEach(button => {
            const item = button.dataset.companionAccessory;
            const unlocked = buddy.stars >= accessoryRequirements[item];
            button.disabled = !unlocked;
            button.setAttribute('aria-pressed', String(item === buddy.accessory));
            button.title = unlocked ? 'เลือกของแต่งชิ้นนี้' : `สะสม ${accessoryRequirements[item]} ดาวเพื่อปลดล็อก`;
            button.querySelector('small').textContent = item === 'none' ? 'เลือกได้เสมอ' : unlocked ? 'ปลดล็อกแล้ว เลือกใส่ได้' : `${accessoryRequirements[item]} ดาวคู่หู`;
        });
    }

    function selectTab(name, focus = false) {
        if (!['buddy', 'style', 'play'].includes(name)) return;
        dialog.querySelectorAll('[role=tab]').forEach(tab => {
            const selected = tab.id === `companion-tab-${name}`;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
            if (selected && focus) tab.focus();
        });
        dialog.querySelectorAll('[role=tabpanel]').forEach(panel => { panel.hidden = panel.id !== `companion-panel-${name}`; });
    }

    const tabs = [...dialog.querySelectorAll('[role=tab]')];
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => selectTab(tab.id.replace('companion-tab-', '')));
        tab.addEventListener('keydown', event => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = tabs.length - 1;
            if (next === undefined) return;
            event.preventDefault();
            selectTab(tabs[next].id.replace('companion-tab-', ''), true);
        });
    });
    dialog.querySelectorAll('[data-companion-tab]').forEach(button => {
        button.addEventListener('click', () => selectTab(button.dataset.companionTab, true));
    });
    document.getElementById('companion-name-form').addEventListener('submit', event => {
        event.preventDefault();
        const input = document.getElementById('companion-name');
        const name = cleanName(input.value);
        input.setCustomValidity(name ? '' : 'กรุณาตั้งชื่อคู่หู');
        if (!input.reportValidity()) return;
        buddy.name = name;
        input.value = name;
        save(); render();
        emotion('happy', 'ชื่อนี้เหมาะเลย');
        say(`สวัสดี ฉัน ${buddy.name} ดีใจที่ได้อยู่ทีมเดียวกัน`);
    });
    document.getElementById('companion-name').addEventListener('input', event => event.target.setCustomValidity(''));
    document.querySelector('#companion-name-form button').addEventListener('click', event => pose('smile', event));
    dialog.querySelectorAll('[data-companion-colour]').forEach(button => {
        button.addEventListener('click', event => {
            buddy.colour = button.dataset.companionColour;
            save(); render();
            emotion('happy', 'ลุคใหม่ พร้อมไปเรียนด้วยกัน');
            say(`${buddy.name} เปลี่ยนสีใหม่แล้ว`);
            pose('smile', event);
        });
    });
    dialog.querySelectorAll('[data-companion-accessory]').forEach(button => {
        button.addEventListener('click', event => {
            const item = button.dataset.companionAccessory;
            if (!Object.hasOwn(accessoryRequirements, item) || buddy.stars < accessoryRequirements[item]) return;
            buddy.accessory = item;
            save(); render();
            emotion('happy', 'แต่งตัวพร้อมแล้ว');
            say(item === 'none' ? 'กลับมาเป็นตัวเองแล้ว' : `ใส่${item === 'star' ? 'เข็มกลัดดาว' : 'ผ้าพันคอ'}แล้ว`);
            pose('proud', event);
        });
    });
    document.getElementById('companion-high-five').addEventListener('click', event => {
        document.dispatchEvent(new CustomEvent('nextskill:buddy-action', { detail: { kind: 'hello', motion: event.detail > 0 } }));
        emotion('happy', 'ไฮไฟว์ เพื่อนร่วมทีม');
        say('ไฮไฟว์! ไปต่อด้วยกันนะ');
        pose('highfive', event);
    });

    document.querySelectorAll('[data-buddy-pose]').forEach(button => {
        button.addEventListener('click', event => {
            pose(button.dataset.buddyPose, event);
            const messages = {
                read: ['focused', 'ฝึกหนึ่งประโยควันนี้ เพื่อความมั่นใจในวันพรุ่งนี้', 'ลองพูด “Could we try a different approach?” เพื่อเสนอทางเลือกอย่างสุภาพ'],
                walk: ['happy', 'ออกไปเดินเล่นสักหน่อย', 'ซ้าย ขวา ซ้าย ทุกก้าวมีความหมาย'],
                dance: ['excited', 'เจอจังหวะสนุกแล้ว', 'ตัวเล็ก แต่เต้นเต็มที่'],
                stretch: ['happy', 'ยืดตัวแล้ว พร้อมอีกครั้ง', 'ยืดเส้นสักนิด แล้วไปต่อกัน'],
                celebrate: ['excited', 'ก้าวเล็ก ๆ ก็น่าดีใจ', 'เราเป็นทีมที่ดีนะ']
            };
            const message = messages[button.dataset.buddyPose] || messages.celebrate;
            emotion(message[0], message[1]);
            say(message[2]);
        });
    });

    const currentLesson = document.querySelector('.journey-step.current [data-lesson-title], .resume-button[data-lesson-title]');
    if (currentLesson) document.getElementById('buddy-study-title').textContent = currentLesson.dataset.lessonTitle;
    document.getElementById('buddy-continue-study').addEventListener('click', () => {
        if (!currentLesson) return;
        dialog.close();
        currentLesson.click();
    });
    let encouragement = 0;
    document.getElementById('buddy-encourage').addEventListener('click', event => {
        const lines = [
            'วันนี้แค่ลองพูดหนึ่งประโยคก็พอ ไม่ต้องพูดให้สมบูรณ์แบบ ลองเริ่มด้วย “Could we try…?”',
            'ถ้ายังไม่มั่นใจ ลองอ่านออกเสียงช้า ๆ หนึ่งรอบ แล้วค่อยเปิดดูตัวอย่างในบทเรียนได้เลย',
            'พักได้เสมอ เมื่อพร้อมค่อยกลับมาลองอีกหนึ่งประโยค ความก้าวหน้าเล็ก ๆ ก็นับนะ'
        ];
        say(lines[encouragement++ % lines.length]);
        emotion('happy', 'วันนี้เริ่มทีละก้าวก็พอ');
        pose('cheer', event);
    });

    function syncMotion() {
        const state = guide.dataset.motion;
        motionControl.disabled = state === 'reduced';
        motionControl.textContent = state === 'reduced' ? 'ลดการเคลื่อนไหวแล้ว' : state === 'paused' ? 'ขยับต่อ' : 'พักการเคลื่อนไหว';
        if (state !== 'active') resetGaze();
    }
    motionControl.addEventListener('click', () => document.getElementById('buddy-motion').click());
    new MutationObserver(syncMotion).observe(guide, { attributes: true, attributeFilter: ['data-motion'] });

    function resetGaze() {
        cancelAnimationFrame(pointerFrame);
        pointerFrame = 0;
        robots.forEach(robot => robot.querySelectorAll('.buddy-pupil').forEach(pupil => { pupil.style.transform = 'translate(0px, 0px)'; }));
    }
    function updateGaze() {
        pointerFrame = 0;
        if (reduced.matches || !finePointer.matches || guide.dataset.motion !== 'active' || document.hidden) return;
        robots.forEach(robot => {
            const face = robot.querySelector('.buddy-face');
            const rect = face.getBoundingClientRect();
            if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > innerHeight) return;
            const reading = robot.dataset.posing === 'read' || (robot.dataset.reading === 'true' && !robot.dataset.posing);
            const x = reading ? 0 : Math.max(-1, Math.min(1, (pointer.x - rect.left - rect.width / 2) / 170)) * 2.5;
            const y = reading ? 2 : Math.max(-1, Math.min(1, (pointer.y - rect.top - rect.height / 2) / 170)) * 1.7;
            robot.querySelectorAll('.buddy-pupil').forEach(pupil => { pupil.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`; });
        });
    }
    window.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || reduced.matches || !finePointer.matches || guide.dataset.motion !== 'active') return;
        pointer = { x: event.clientX, y: event.clientY };
        if (!pointerFrame) pointerFrame = requestAnimationFrame(updateGaze);
    }, { passive: true });
    document.addEventListener('pointerleave', resetGaze);
    document.addEventListener('visibilitychange', () => { if (document.hidden) resetGaze(); });
    reduced.addEventListener('change', syncMotion);
    finePointer.addEventListener('change', resetGaze);

    document.addEventListener('nextskill:buddy-reacted', event => {
        const moods = {
            hello: ['happy', 'ดีใจที่ได้เจอกันอีกนะ'],
            lesson: ['excited', 'สกิลใหม่รออยู่ ไปเรียนด้วยกันเลย'],
            review: ['thinking', 'ทบทวนอีกนิด ให้ใช้ได้มั่นใจขึ้น'],
            reward: ['curious', 'มีเซอร์ไพรส์รออยู่ข้างหน้า'],
            protected: ['happy', 'มีตัวช่วยแล้ว ไปต่อได้สบายใจ']
        };
        const mood = moods[event.detail?.kind];
        if (mood) emotion(...mood);
    });

    function renderGame() {
        const container = document.getElementById('signal-game');
        const sequence = document.getElementById('signal-sequence');
        const instruction = document.getElementById('signal-instruction');
        const action = document.getElementById('signal-action');
        container.dataset.phase = game.phase;
        sequence.replaceChildren();
        for (let i = 0; i < 3; i++) {
            const card = document.createElement('span');
            card.className = 'signal-card';
            const visible = game.phase === 'preview' || game.phase === 'complete' || i < game.entered.length;
            const signal = visible ? signals.find(item => item.id === game.sequence[i]) : null;
            if (signal) {
                card.dataset.signal = signal.id;
                const icon = document.createElement('span');
                icon.className = `icon ${signal.icon}`;
                icon.setAttribute('aria-hidden', 'true');
                const label = document.createElement('span');
                label.textContent = signal.label;
                card.append(icon, label);
            } else {
                card.textContent = '?';
                card.setAttribute('aria-label', `Signal ${i + 1} hidden`);
            }
            sequence.append(card);
        }
        instruction.textContent = game.phase === 'preview' ? 'มองให้ดี แล้วจำตามลำดับ'
            : game.phase === 'input' ? `ตอบถูก ${game.entered.length} จาก 3 ตัว`
            : game.phase === 'complete' ? 'เรียงถูกแล้ว เก่งมาก' : 'พร้อมเมื่อไรก็เริ่มได้';
        dialog.querySelectorAll('[data-signal-choice]').forEach(button => { button.disabled = game.phase !== 'input'; });
        action.textContent = game.phase === 'preview' ? 'ซ่อนแล้วเริ่มตอบ' : game.phase === 'input' ? 'ดูสัญลักษณ์อีกครั้ง' : game.phase === 'complete' ? 'เล่นอีกครั้ง' : 'เริ่มรอบใหม่';
    }
    document.getElementById('signal-action').addEventListener('click', event => {
        document.getElementById('signal-result').textContent = '';
        if (game.phase === 'idle' || game.phase === 'complete') {
            const values = new Uint32Array(3);
            crypto.getRandomValues(values);
            game = { phase: 'preview', sequence: [...values].map(value => signals[value % signals.length].id), entered: [], awarded: false };
            emotion('curious', 'มาจำสัญลักษณ์ด้วยกัน');
        } else if (game.phase === 'preview') {
            game.phase = 'input'; game.entered = [];
            emotion('thinking', 'หนังสือ สายฟ้า หรือดาว? ลองดูได้เลย');
        } else {
            game.phase = 'preview'; game.entered = [];
            emotion('curious', 'ดูอีกครั้งได้เสมอ');
        }
        pose(game.phase === 'input' ? 'think' : 'curious', event);
        renderGame();
    });
    dialog.querySelectorAll('[data-signal-choice]').forEach(button => {
        button.addEventListener('click', event => {
            if (game.phase !== 'input' || game.awarded) return;
            const choice = button.dataset.signalChoice;
            if (choice !== game.sequence[game.entered.length]) {
                game.phase = 'preview'; game.entered = [];
                renderGame();
                emotion('happy', 'ไม่ต้องรีบ ลองด้วยกันใหม่ได้');
                pose('retry', event);
                document.getElementById('signal-result').textContent = 'เกือบแล้ว ลองดูอีกครั้งได้ ดาวยังอยู่ครบ';
                return;
            }
            game.entered.push(choice);
            if (game.entered.length < 3) pose('nod', event);
            if (game.entered.length === 3) {
                game.phase = 'complete'; game.awarded = true;
                buddy.stars = Math.min(9999, buddy.stars + 1);
                save(); render();
                pose('celebrate', event);
                emotion('excited', 'เราเป็นทีมที่ดีนะ');
                const gift = buddy.stars === 1 ? ' ปลดล็อกเข็มกลัดดาวแล้ว' : buddy.stars === 3 ? ' ปลดล็อกผ้าพันคอแล้ว' : '';
                document.getElementById('signal-result').textContent = `ทำได้ดีมาก +1 ดาวคู่หู${gift}`;
                say(`เราเรียงสัญลักษณ์สำเร็จแล้ว${gift || ' ชนะไปด้วยกันอีกครั้ง'}`);
            }
            renderGame();
        });
    });
    dialog.addEventListener('close', () => { emotion('idle', 'พร้อมเรียนไปด้วยกัน'); resetGaze(); });
    window.addEventListener('storage', event => {
        if (event.key !== storageKey) return;
        buddy = load(); render();
    });
    render(); renderGame(); syncMotion();
})();
