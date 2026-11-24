(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    // ==========================================
    // Password Toggle (Eye icon)
    // ==========================================
    const eyeSvg = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>`;
    const eyeOffSvg = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
            <line x1="2" x2="22" y1="2" y2="22"/>
        </svg>`;

    document.querySelectorAll('.password-toggle-eye, .password-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            button.setAttribute('aria-pressed', String(isPassword));
            button.setAttribute('aria-label', isPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
            button.innerHTML = isPassword ? eyeOffSvg : eyeSvg;
            input.focus();
        });
    });

    // Password Match Live Validation
    const password = document.getElementById('Password');
    const confirm = document.getElementById('ConfirmPassword');
    if (password && confirm) {
        const validate = () => {
            if (confirm.value && password.value !== confirm.value) {
                confirm.setCustomValidity('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
            } else {
                confirm.setCustomValidity('');
            }
        };
        password.addEventListener('input', validate);
        confirm.addEventListener('input', validate);
    }

    // Auto-focus on first error if exists
    document.querySelector('.validation-summary-errors')?.focus();

    // ==========================================
    // Interactive Duolingo Mascot (Nimo) Experience
    // ==========================================
    const mascotWrap = document.getElementById('nimoInteractiveMascot');
    const mascotImg = document.getElementById('nimoMascotImg');
    const speechBubble = document.getElementById('nimoSpeechBubble');
    const speechText = document.getElementById('nimoSpeechText');

    // Mascot Poses
    const POSE_DEFAULT = '/images/nimo-pose-wave.png';
    const POSE_STUDY = '/images/nimo-learning.png';
    const POSE_PEEK = '/images/nimo-pose-crouch.png';
    const POSE_JUMP = '/images/nimo-pose-jump.png';

    // Preload poses to eliminate flicker
    if (mascotWrap) {
        [POSE_DEFAULT, POSE_STUDY, POSE_PEEK, POSE_JUMP].forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }

    let currentPose = POSE_DEFAULT;
    let restorePoseTimer = null;
    let speechTimer = null;

    function setMascotPose(src) {
        if (!mascotImg || currentPose === src) return;
        currentPose = src;
        mascotImg.src = src;
    }

    function setMascotSpeech(text, isTemporary = false, restoreDelay = 3500) {
        if (!speechText || !speechBubble) return;
        const defaultText = "ไปเรียนด้วยกันนะ!";
        speechText.textContent = text;
        speechBubble.classList.remove('speech-pop');
        void speechBubble.offsetWidth; // Trigger reflow
        speechBubble.classList.add('speech-pop');

        if (speechTimer) clearTimeout(speechTimer);
        if (isTemporary) {
            speechTimer = setTimeout(() => {
                speechText.textContent = defaultText;
                setMascotPose(POSE_DEFAULT);
            }, restoreDelay);
        }
    }

    // Duolingo Confetti Burst Generator
    const confettiColors = ['#58cc02', '#22c55e', '#0284c7', '#38bdf8', '#fde047', '#ff9600', '#ec4899', '#a855f7'];

    function spawnDuoConfetti(originX, originY, count = 18) {
        if (reducedMotion.matches) return;
        if (matchMedia('(width < 768px)').matches) count = Math.min(count, 8);
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'duo-confetti-particle';
            
            const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            const size = Math.floor(Math.random() * 8) + 6; // 6px - 14px
            const isRect = Math.random() > 0.5;
            
            // Random trajectory
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
            const distance = Math.floor(Math.random() * 90) + 45;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance - 25; // slight upward bias
            const rot = Math.floor(Math.random() * 720) - 360;

            particle.style.left = `${originX}px`;
            particle.style.top = `${originY}px`;
            particle.style.width = `${size}px`;
            particle.style.height = isRect ? `${size * 1.5}px` : `${size}px`;
            particle.style.borderRadius = isRect ? '2px' : '50%';
            particle.style.backgroundColor = color;
            particle.style.setProperty('--dx', `${dx}px`);
            particle.style.setProperty('--dy', `${dy}px`);
            particle.style.setProperty('--rot', `${rot}deg`);

            document.body.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, 900);
        }
    }

    // Cheer & inspiring learning quotes
    const cheerQuotes = [
        "“การเรียนรู้ไม่มีวันสิ้นสุด ทุกก้าวเล็กๆ วันนี้ คือความสำเร็จที่ยิ่งใหญ่ในวันหน้า”",
        "“ทักษะใหม่ไม่ได้สร้างในวันเดียว แต่เริ่มได้ตั้งแต่วินาทีที่คุณเปิดใจเรียนรู้”",
        "“ไม่มีใครเก่งมาตั้งแต่เกิด แต่ทุกคนเก่งขึ้นได้จากการลงมือฝึกฝนทุกวัน”",
        "“ความรู้คือสมบัติเดียวที่ยิ่งฝึกฝน ก็ยิ่งติดตัวเราไปตลอดชีวิต”",
        "“เก่งขึ้นแค่วันละ 1% เมื่อครบหนึ่งปี คุณจะก้าวไปไกลกว่าเดิมอย่างไม่น่าเชื่อ!”",
        "“ความผิดพลาดระหว่างฝึก คือครูที่ดีที่สุดที่พาเราไปสู่ความเชี่ยวชาญ”",
        "“ลงทุนเวลาให้กับการเรียนรู้วันนี้ คือของขวัญที่ดีที่สุดสำหรับตัวคุณในอนาคต”"
    ];
    let quoteIndex = 0;
    let shadesCycleTimer = null;
    let shadesQuoteRevealTimer = null;

    function runMascotShadesQuoteCycle() {
        if (!mascotWrap) return;
        clearTimeout(shadesCycleTimer);
        clearTimeout(shadesQuoteRevealTimer);

        // Phase 1: Wear black sunglasses & pose coolly (silent)
        mascotWrap.dataset.shades = 'on';
        mascotWrap.dataset.speechVisible = 'false';

        // Phase 2: Suddenly take off sunglasses after 2.4s, then speak a learning quote!
        shadesCycleTimer = setTimeout(() => {
            mascotWrap.dataset.shades = 'off';
            const quote = cheerQuotes[quoteIndex % cheerQuotes.length];
            quoteIndex = (quoteIndex + 1) % cheerQuotes.length;
            if (speechText) speechText.textContent = quote;

            shadesQuoteRevealTimer = setTimeout(() => {
                mascotWrap.dataset.speechVisible = 'true';
            }, 420);

            // Phase 3: Hold quote for 4.8s, then repeat cool sunglasses cycle
            shadesCycleTimer = setTimeout(runMascotShadesQuoteCycle, 5000);
        }, 2400);
    }

    if (mascotWrap) {
        runMascotShadesQuoteCycle();

        mascotWrap.addEventListener('click', () => {
            clearTimeout(shadesCycleTimer);
            clearTimeout(shadesQuoteRevealTimer);

            const triggerTakeoffAndQuote = () => {
                mascotWrap.dataset.shades = 'off';
                const quote = cheerQuotes[quoteIndex % cheerQuotes.length];
                quoteIndex = (quoteIndex + 1) % cheerQuotes.length;
                if (speechText) speechText.textContent = quote;

                shadesQuoteRevealTimer = setTimeout(() => {
                    mascotWrap.dataset.speechVisible = 'true';
                }, 380);

                const rect = mascotWrap.getBoundingClientRect();
                spawnDuoConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 18);

                shadesCycleTimer = setTimeout(runMascotShadesQuoteCycle, 5200);
            };

            if (mascotWrap.dataset.shades === 'off') {
                // Quickly put shades on to pose coolly, then flip them off with a new quote!
                mascotWrap.dataset.speechVisible = 'false';
                mascotWrap.dataset.shades = 'on';
                shadesCycleTimer = setTimeout(triggerTakeoffAndQuote, 620);
            } else {
                triggerTakeoffAndQuote();
            }
        });

        // Keyboard accessibility
        mascotWrap.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                mascotWrap.click();
            }
        });
    }

    // Remove any ambient floating cards/milestone badges per user request
    document.querySelectorAll('.ambient-float-card, .duo-interactive-badge').forEach(badge => {
        try { badge.remove(); } catch (_) { }
    });

    // ==========================================
    // Interactive Form Field Focus Reactions
    // ==========================================
    const emailInput = mascotWrap?.closest('main')?.querySelector('input[type="email"], #Email, input[name="Email"]');
    if (emailInput) {
        emailInput.addEventListener('focus', () => {
            setMascotPose(POSE_STUDY);
            setMascotSpeech("กรอกอีเมลแล้วเตรียมลุยด่านแรกกันเลย!", true, 4000);
        });
        emailInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (!document.activeElement || (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'BUTTON')) {
                    setMascotPose(POSE_DEFAULT);
                }
            }, 150);
        });
    }

    const passwordInputs = mascotWrap ? document.querySelectorAll('input[type="password"]') : [];
    passwordInputs.forEach(input => {
        input.addEventListener('focus', () => {
            setMascotPose(POSE_PEEK);
            setMascotSpeech("แอบปิดตาแป๊บนะ รหัสลับสุดยอด!", true, 4500);
        });
        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (!document.activeElement || (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'BUTTON')) {
                    setMascotPose(POSE_DEFAULT);
                }
            }, 150);
        });
    });

    // Submit button hover/focus interaction: Nimo takes off sunglasses & speaks a learning quote!
    const submitBtn = mascotWrap && document.querySelector('.btn-auth-submit');
    if (submitBtn) {
        const triggerSubmitQuote = () => {
            clearTimeout(shadesCycleTimer);
            clearTimeout(shadesQuoteRevealTimer);
            const revealQuote = () => {
                mascotWrap.dataset.shades = 'off';
                const quote = cheerQuotes[quoteIndex % cheerQuotes.length];
                quoteIndex = (quoteIndex + 1) % cheerQuotes.length;
                if (speechText) speechText.textContent = quote;
                shadesQuoteRevealTimer = setTimeout(() => {
                    mascotWrap.dataset.speechVisible = 'true';
                }, 340);
                shadesCycleTimer = setTimeout(runMascotShadesQuoteCycle, 5200);
            };
            if (mascotWrap.dataset.shades === 'off') {
                mascotWrap.dataset.speechVisible = 'false';
                mascotWrap.dataset.shades = 'on';
                shadesCycleTimer = setTimeout(revealQuote, 240);
            } else {
                revealQuote();
            }
        };
        submitBtn.addEventListener('mouseenter', triggerSubmitQuote);
        submitBtn.addEventListener('focus', triggerSubmitQuote);
    }

    // Subtle 3D Game Tilt Parallax on Auth Grid
    const storyCard = document.querySelector('.nimo-story-card');
    const authCard = document.querySelector('.nimo-auth-card');
    if (storyCard && authCard && !storyCard.querySelector('[data-login-nimo]')) {
        const tiltAllowed = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
        let tiltFrame = 0;
        const tilt = event => {
            if (tiltFrame) return;
            tiltFrame = requestAnimationFrame(() => {
                tiltFrame = 0;
                const halfWidth = innerWidth / 2;
                const halfHeight = innerHeight / 2;
                const x = (event.clientX - halfWidth) / halfWidth;
                const y = (event.clientY - halfHeight) / halfHeight;
                storyCard.style.transform = `perspective(1000px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg) translateY(-2px)`;
                authCard.style.transform = `perspective(1000px) rotateY(${x * 2}deg) rotateX(${-y * 2}deg)`;
            });
        };
        function syncTilt() {
            if (tiltAllowed.matches) {
                document.addEventListener('pointermove', tilt, { passive: true });
                return;
            }
            document.removeEventListener('pointermove', tilt);
            cancelAnimationFrame(tiltFrame);
            tiltFrame = 0;
            storyCard.style.removeProperty('transform');
            authCard.style.removeProperty('transform');
        }
        tiltAllowed.addEventListener('change', syncTilt);
        syncTilt();
    }

    const loginForm = document.querySelector('form.login-core-form');
    const loginOverlay = document.getElementById('nimoLoginLoadingOverlay');
    const loginProgress = document.getElementById('loadingProgressFill');
    let loginAnimation;
    loginForm?.addEventListener('submit', event => {
        if (event.defaultPrevented || !loginOverlay) return;
        if (loginOverlay.classList.contains('is-active')) {
            event.preventDefault();
            return;
        }
        loginOverlay.classList.add('is-active');
        loginOverlay.setAttribute('aria-hidden', 'false');
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches && document.body.dataset.motion !== 'paused') {
            loginAnimation = loginProgress?.animate?.([
                { transform: 'translateX(0)' }, { transform: 'translateX(233.33%)' }
            ], { duration: 850, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
        }
    });
    window.addEventListener('pageshow', () => {
        if (!loginOverlay?.classList.contains('is-active')) return;
        loginAnimation?.cancel();
        loginOverlay.classList.remove('is-active');
        loginOverlay.setAttribute('aria-hidden', 'true');
    });

    // ==========================================
    // Dynamic Navbar Upgrade (Matches Home Page)
    // ==========================================
    function initHomeNavbar() {
        if (document.querySelector('[data-navbar]')) return;

        // Ensure navbar CSS files are loaded
        if (!document.querySelector('link[href*="navbar.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/css/navbar.css';
            document.head.appendChild(link);
        }
        if (!document.querySelector('link[href*="journey-theme.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/css/journey-theme.css';
            document.head.appendChild(link);
        }

        // Check if legacy .site-header is still present and upgrade it
        const oldHeader = document.querySelector('.site-header');
        if (oldHeader && !document.querySelector('[data-navbar]')) {
            const newHeader = document.createElement('header');
            newHeader.className = 'ns-navbar sj-header';
            newHeader.setAttribute('data-navbar', '');
            newHeader.innerHTML = `
                <div class="ns-navbar__inner site-nav__inner">
                    <a class="ns-navbar__brand" href="/" aria-label="NextSkill กลับหน้าแรก">
                        <img src="/images/nextskill-navbar-logo.webp" alt="NextSkill" width="54" height="54" />
                        <span class="ns-navbar__wordmark" aria-hidden="true">
                            <svg class="ns-wordmark-art" viewBox="0 0 8114.20 1840.00" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
                                <g transform="translate(50 1640.00) scale(1 -1)">
                                    <g class="ns-wordmark-next">
                                        <path transform="translate(0.00 0)" d="M140.00 69.72L140.00 1370.28Q140.00 1440.00 209.72 1440.00L269.48 1440.00Q339.20 1440.00 377.79 1381.94L1020.72 414.63Q1065.00 348.00 1065.00 428.00L1065.00 1370.28Q1065.00 1440.00 1134.72 1440.00L1194.48 1440.00Q1264.20 1440.00 1264.20 1370.28L1264.20 69.72Q1264.20 0.00 1194.48 0.00L1134.72 0.00Q1065.00 0.00 1026.43 58.08L383.45 1026.36Q339.20 1093.00 339.20 1013.00L339.20 69.72Q339.20 0.00 269.48 0.00L209.72 0.00Q140.00 0.00 140.00 69.72Z" />
                                        <path transform="translate(1360.20 0)" d="M614.6 -30.0Q454.2 -30.0 333.9 40.4Q213.6 110.8 146.8 237.4Q80.0 364.0 80.0 531.8Q80.0 708.8 145.8 838.6Q211.6 968.4 329.7 1039.2Q447.8 1110.0 605.4 1110.0Q769.4 1110.0 884.8 1034.1Q1000.2 958.2 1057.8 818.0Q1115.4 677.8 1104.8 484.6H907.6V555.8Q905.2 748.2 832.3 841.6Q759.4 935.0 612.6 935.0Q452.2 935.0 370.5 833.2Q288.8 731.4 288.8 540.0Q288.8 356.8 370.5 256.3Q452.2 155.8 605.4 155.8Q707.0 155.8 781.5 202.1Q856.0 248.4 898.0 335.0L1089.4 272.4Q1026.2 128.2 898.9 49.1Q771.6 -30.0 614.6 -30.0ZM224.0 484.6V639.6H1005.8V484.6Z" />
                                        <path transform="translate(2500.40 0)" d="M67.86 64.11L379.74 481.89Q427.60 546.00 379.75 610.11L76.85 1015.89Q29.00 1080.00 109.00 1080.00L182.60 1080.00Q262.60 1080.00 309.95 1015.52L495.05 763.48Q542.40 699.00 589.42 763.72L772.18 1015.28Q819.20 1080.00 899.20 1080.00L972.80 1080.00Q1052.80 1080.00 1004.95 1015.89L702.05 610.11Q654.20 546.00 702.13 481.95L1014.87 64.05Q1062.80 0.00 982.80 0.00L908.20 0.00Q828.20 0.00 781.15 64.70L589.45 328.30Q542.40 393.00 495.13 328.46L301.87 64.54Q254.60 0.00 174.60 0.00L100.00 0.00Q20.00 0.00 67.86 64.11Z" />
                                        <path transform="translate(3519.20 0)" d="M752.0 0.0Q652.2 -19.8 556.1 -16.6Q460.0 -13.4 384.5 21.4Q309.0 56.2 270.6 130.6Q236.8 196.2 234.3 264.1Q231.8 332.0 231.8 418.2V1380.0H429.0V427.4Q429.0 361.8 430.5 314.3Q432.0 266.8 451.0 233.4Q487.0 170.4 565.5 161.0Q644.0 151.6 752.0 167.4ZM20.0 920.4V1080.0H752.0V920.4Z" />
                                    </g>
                                    <g class="ns-wordmark-skill">
                                        <path transform="translate(4431.40 0)" d="M657.6 -30.0Q503.4 -30.0 379.7 22.9Q256.0 75.8 175.9 174.0Q95.8 272.2 71.8 407.4L276.2 438.8Q309.8 305.2 417.0 230.5Q524.2 155.8 668.4 155.8Q759.2 155.8 834.4 184.5Q909.6 213.2 954.8 266.8Q1000.0 320.4 1000.0 395.0Q1000.0 437.4 985.2 469.3Q970.4 501.2 945.0 524.4Q919.6 547.6 885.0 564.3Q850.4 581.0 811.0 592.8L442.8 701.8Q386.4 718.4 330.4 744.7Q274.4 771.0 228.9 812.5Q183.4 854.0 155.6 914.4Q127.8 974.8 127.8 1059.6Q127.8 1190.4 195.4 1282.2Q263.0 1374.0 378.8 1421.6Q494.6 1469.2 639.0 1469.0Q784.6 1467.4 899.7 1417.2Q1014.8 1367.0 1090.8 1273.3Q1166.8 1179.6 1194.8 1047.4L984.8 1011.4Q969.8 1095.0 919.8 1155.6Q869.8 1216.2 796.3 1248.9Q722.8 1281.6 636.4 1282.6Q553.0 1284.2 484.7 1256.9Q416.4 1229.6 376.0 1180.8Q335.6 1132.0 335.6 1068.8Q335.6 1006.2 371.7 967.8Q407.8 929.4 460.9 907.2Q514.0 885.0 566.0 870.6L835.2 794.0Q884.0 780.4 946.7 757.1Q1009.4 733.8 1068.3 691.9Q1127.2 650.0 1165.8 581.0Q1204.4 512.0 1204.4 407.4Q1204.4 300.2 1161.3 218.4Q1118.2 136.6 1042.7 81.4Q967.2 26.2 868.1 -1.9Q769.0 -30.0 657.6 -30.0Z" />
                                        <path transform="translate(5667.60 0)" d="M139.05 70.07L139.95 1370.28Q140.00 1440.00 209.72 1440.00L269.48 1440.00Q339.20 1440.00 339.20 1370.28L339.20 640.00Q339.20 560.00 390.57 621.33L723.43 1018.67Q774.80 1080.00 854.80 1080.00L946.80 1080.00Q1026.80 1080.00 974.95 1019.08L619.05 600.92Q567.20 540.00 622.11 481.82L1021.89 58.18Q1076.80 0.00 996.80 0.00L886.80 0.00Q806.80 0.00 753.31 59.49L392.69 460.51Q339.20 520.00 339.20 440.00L339.20 70.07Q339.20 0.00 269.13 0.00L209.07 0.00Q139.00 0.00 139.05 70.07Z" />
                                        <path transform="translate(6672.40 0)" d="M160.00 1330.99L160.00 1389.61Q160.00 1458.00 228.39 1458.00L288.21 1458.00Q356.60 1458.00 356.60 1389.61L356.60 1330.99Q356.60 1262.60 288.21 1262.60L228.39 1262.60Q160.00 1262.60 160.00 1330.99ZM160.00 68.81L160.00 1011.19Q160.00 1080.00 228.81 1080.00L287.79 1080.00Q356.60 1080.00 356.60 1011.19L356.60 68.81Q356.60 0.00 287.79 0.00L228.81 0.00Q160.00 0.00 160.00 68.81Z" />
                                        <path transform="translate(7165.00 0)" d="M160.00 68.81L160.00 1401.19Q160.00 1470.00 228.81 1470.00L287.79 1470.00Q356.60 1470.00 356.60 1401.19L356.60 68.81Q356.60 0.00 287.79 0.00L228.81 0.00Q160.00 0.00 160.00 68.81Z" />
                                        <path transform="translate(7657.60 0)" d="M160.00 68.81L160.00 1401.19Q160.00 1470.00 228.81 1470.00L287.79 1470.00Q356.60 1470.00 356.60 1401.19L356.60 68.81Q356.60 0.00 287.79 0.00L228.81 0.00Q160.00 0.00 160.00 68.81Z" />
                                    </g>
                                </g>
                            </svg>
                        </span>
                    </a>
                    <button class="ns-navbar__toggle" type="button" aria-expanded="false" aria-controls="nextskill-main-menu" aria-label="เปิดเมนูหลัก" data-navbar-toggle hidden><span aria-hidden="true"></span></button>
                    <nav class="ns-navbar__menu" id="nextskill-main-menu" aria-label="เมนูหลัก">
                        <a class="ns-navbar__link" href="/"><span class="ns-navbar__icon ns-navbar__icon--home" aria-hidden="true"></span>หน้าแรก</a>
                        <a class="ns-navbar__link" href="/Home/Courses"><span class="ns-navbar__icon ns-navbar__icon--book" aria-hidden="true"></span>คอร์สเรียน</a>
                        <a class="ns-navbar__link" href="/Learning/Island"><span class="ns-navbar__icon ns-navbar__icon--boat" aria-hidden="true"></span>แผนที่บทเรียน</a>
                    </nav>
                    <div class="ns-navbar__account">
                        <button class="journey-theme-toggle" type="button" data-theme-toggle aria-label="ธีมกลางคืน" aria-pressed="false" title="เปิดธีมกลางคืน">
                            <svg class="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
                            <svg class="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.5 13.3A8.5 8.5 0 0 1 10.7 3.5a8.5 8.5 0 1 0 9.8 9.8Z"/></svg>
                        </button>
                        <a class="ns-navbar__login glass" href="/Account/Login">เข้าสู่ระบบ</a>
                    </div>
                </div>
            `;
            oldHeader.replaceWith(newHeader);
        }

        // Mobile menu toggle handling
        const navToggle = document.querySelector('[data-navbar-toggle]');
        const navMenu = document.querySelector('#nextskill-main-menu');
        const navbarEl = document.querySelector('[data-navbar]');
        if (navToggle && navMenu) {
            const narrow = matchMedia('(max-width: 959.98px)');
            let menuOpen = false;
            function setMenuOpen(val) {
                menuOpen = val && narrow.matches;
                navToggle.setAttribute('aria-expanded', String(menuOpen));
                navToggle.setAttribute('aria-label', menuOpen ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก');
                navMenu.hidden = narrow.matches && !menuOpen;
            }
            navToggle.hidden = false;
            navToggle.addEventListener('click', () => setMenuOpen(!menuOpen));
            document.addEventListener('click', (e) => {
                if (menuOpen && navbarEl && !navbarEl.contains(e.target)) setMenuOpen(false);
            });
            narrow.addEventListener('change', () => { if (!narrow.matches) navMenu.hidden = false; });
            if (narrow.matches) navMenu.hidden = true;
        }

        // Initialize Theme Toggle on account page if present
        const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
        const root = document.documentElement;
        const storageKey = 'nextskill.theme.v1';
        let currentTheme = 'light';
        try {
            currentTheme = localStorage.getItem(storageKey) || 'light';
        } catch {}
        root.dataset.theme = currentTheme;

        toggleButtons.forEach(btn => {
            btn.hidden = false;
            btn.setAttribute('aria-pressed', String(currentTheme === 'dark'));
            btn.title = currentTheme === 'dark' ? 'เปิดธีมกลางวัน' : 'เปิดธีมกลางคืน';

            btn.addEventListener('click', () => {
                const isDark = root.dataset.theme === 'dark';
                const nextTheme = isDark ? 'light' : 'dark';
                root.dataset.theme = nextTheme;
                try { localStorage.setItem(storageKey, nextTheme); } catch {}
                btn.setAttribute('aria-pressed', String(nextTheme === 'dark'));
                btn.title = nextTheme === 'dark' ? 'เปิดธีมกลางวัน' : 'เปิดธีมกลางคืน';
                document.dispatchEvent(new CustomEvent('nextskill:theme-change', { detail: { theme: nextTheme } }));
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHomeNavbar);
    } else {
        initHomeNavbar();
    }
})();
