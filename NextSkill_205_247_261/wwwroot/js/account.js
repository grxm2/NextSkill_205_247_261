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
    [POSE_DEFAULT, POSE_STUDY, POSE_PEEK, POSE_JUMP].forEach(src => {
        const img = new Image();
        img.src = src;
    });

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

    // Cheer quotes on click
    const cheerQuotes = [
        "ไปเรียนด้วยกันนะ!",
        "สู้ๆ นะ! ทุกก้าวทำให้เราเก่งขึ้น",
        "Nimo พร้อมลุยไปกับเธอแล้ว!",
        "ยินดีต้อนรับสู่โลกแห่งการเรียนรู้!",
        "วันนี้อยากฝึกทักษะอะไรดี?",
        "เริ่มต้นทีละนิด ก็เก่งขึ้นได้เยอะเลย!",
        "ความรู้คือพลังที่จะพาเราไปได้ไกล!"
    ];
    let quoteIndex = 0;

    // Clean up entrance fly-in class after animation finishes so idle float can run
    if (mascotWrap && mascotWrap.classList.contains('mascot-fly-in-entrance')) {
        setTimeout(() => {
            mascotWrap.classList.remove('mascot-fly-in-entrance');
        }, 1400);
    }

    if (mascotWrap) {
        mascotWrap.addEventListener('click', (e) => {
            quoteIndex = (quoteIndex + 1) % cheerQuotes.length;
            setMascotSpeech(cheerQuotes[quoteIndex]);
            setMascotPose(POSE_JUMP);

            if (mascotImg) {
                mascotImg.classList.remove('mascot-click-jump');
                void mascotImg.offsetWidth;
                mascotImg.classList.add('mascot-click-jump');
            }

            // Burst confetti around mascot
            const rect = mascotWrap.getBoundingClientRect();
            spawnDuoConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 22);

            clearTimeout(restorePoseTimer);
            restorePoseTimer = setTimeout(() => {
                setMascotPose(POSE_DEFAULT);
            }, 1600);
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
    const emailInput = document.querySelector('input[type="email"], #Email, input[name="Email"]');
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

    const passwordInputs = document.querySelectorAll('input[type="password"]');
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

    // Submit button hover interaction (Excited jump!)
    const submitBtn = document.querySelector('.btn-auth-submit');
    if (submitBtn) {
        submitBtn.addEventListener('mouseenter', () => {
            setMascotPose(POSE_JUMP);
            setMascotSpeech("พร้อมแล้วกดเข้าสู่ระบบได้เลย!", true, 3000);
        });
        submitBtn.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (!document.activeElement || (document.activeElement.tagName !== 'INPUT')) {
                    setMascotPose(POSE_DEFAULT);
                }
            }, 200);
        });
    }

    // Subtle 3D Game Tilt Parallax on Auth Grid
    const storyCard = document.querySelector('.nimo-story-card');
    const authCard = document.querySelector('.nimo-auth-card');
    if (storyCard && authCard) {
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

    // ==========================================
    // Gamified Cinematic Full-Screen Mascot Login Loading Screen Experience
    // ==========================================
    function ensureFullScreenOverlay() {
        let overlay = document.getElementById('nimoLoginLoadingOverlay');
        if (!overlay || !overlay.classList.contains('full-screen-mode')) {
            if (overlay) overlay.remove();
            overlay = document.createElement('div');
            overlay.id = 'nimoLoginLoadingOverlay';
            overlay.className = 'nimo-loading-overlay full-screen-mode island-theme-mode';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'กำลังเข้าสู่ระบบ');
            overlay.innerHTML = `
                <div class="fs-loading-sky fs-island-world" aria-hidden="true">
                    <svg class="ow-seabirds" viewBox="0 0 400 120" focusable="false">
                        <g transform="translate(48 55)"><g class="ow-bird-glide" fill="currentColor"><path d="M-2 0Q0-4 2 0L1 5H-1Z"/><g class="ow-bird-wing" data-ocean-wing="left"><path d="M-1 0C-8-7-17-10-29-7-19-5-10-3-2 2Z"/></g><g class="ow-bird-wing" data-ocean-wing="right"><path d="M1 0C8-7 17-10 29-7 19-5 10-3 2 2Z"/></g></g></g>
                        <g transform="translate(190 28) scale(0.7)"><g class="ow-bird-glide" fill="currentColor"><path d="M-2 0Q0-4 2 0L1 5H-1Z"/><g class="ow-bird-wing" data-ocean-wing="left"><path d="M-1 0C-8-7-17-10-29-7-19-5-10-3-2 2Z"/></g><g class="ow-bird-wing" data-ocean-wing="right"><path d="M1 0C8-7 17-10 29-7 19-5 10-3 2 2Z"/></g></g></g>
                        <g transform="translate(320 80) scale(1.05)"><g class="ow-bird-glide" fill="currentColor"><path d="M-2 0Q0-4 2 0L1 5H-1Z"/><g class="ow-bird-wing" data-ocean-wing="left"><path d="M-1 0C-8-7-17-10-29-7-19-5-10-3 2 2Z"/></g><g class="ow-bird-wing" data-ocean-wing="right"><path d="M1 0C8-7 17-10 29-7 19-5 10-3 2 2Z"/></g></g></g>
                        </svg>
                        <div class="ow-sky">
                            <div class="hero-sky-texture"></div>
                            <div class="journey-night-sky"></div>
                            <div class="journey-stars"></div>
                            <div class="hero-sun journey-sun"><span class="hero-sun-rays"></span><span class="hero-sun-disc"></span></div>
                            <div class="journey-moon"><span></span><span></span><span></span></div>
                            <div class="fs-shooting-stars">
                                <span class="fs-shooting-star fs-star-1"></span>
                                <span class="fs-shooting-star fs-star-2"></span>
                            </div>
                        </div>
                        <div class="ow-distance">
                            <img src="/images/journey/distant-coast.svg" width="1200" height="140" alt="" />
                        </div>
                        <div class="fs-left-lighthouse-cliff">
                            <svg viewBox="0 0 360 320" fill="none" xmlns="http://www.w3.org/2000/svg" width="360" height="320">
                                <path d="M0 200C40 185 88 182 142 195C192 206 238 225 278 235H0V200Z" fill="#b8d9a6" fill-opacity="0.72" />
                                <path d="M0 165C26 152 68 148 112 158C152 167 188 190 218 228C226 238 232 246 236 254H0V165Z" fill="#d9be92" />
                                <path d="M98 164L126 254H205C186 218 156 178 98 164Z" fill="#c2a376" fill-opacity="0.7" />
                                <path d="M0 144C38 130 88 128 134 142C168 152 192 178 205 198C170 192 138 188 104 190C64 192 28 186 0 182Z" fill="#84bc4e" />
                                <path d="M0 136C44 122 92 122 132 138C154 147 166 164 176 176C140 172 95 168 0 168Z" fill="#a2d262" />
                                <rect x="44" y="106" width="44" height="32" rx="3" fill="#fffaf0" stroke="#7d9088" stroke-width="1.8" />
                                <path d="M36 110L66 84L96 110H36Z" fill="#eb755b" stroke="#b94e38" stroke-width="2" stroke-linejoin="round" />
                                <rect x="60" y="118" width="12" height="20" rx="2" fill="#a97042" />
                                <rect x="49" y="115" width="8" height="9" rx="1.5" fill="#93d5eb" stroke="#648896" stroke-width="1.2" />
                                <path d="M104 144L112 66H134L142 144H104Z" fill="#ffffff" stroke="#7c8f88" stroke-width="2" />
                                <path d="M109 92H137L139 109H107L109 92Z" fill="#ef6f59" />
                                <path d="M106 121H140L142 136H104L106 121Z" fill="#ef6f59" />
                                <rect x="108" y="61" width="30" height="7" rx="3" fill="#d95843" />
                                <rect x="113" y="45" width="20" height="17" rx="2" fill="#fef08a" stroke="#7c8f88" stroke-width="1.8" />
                                <path d="M108 46L123 30L138 46H108Z" fill="#ef6f59" stroke="#b94e38" stroke-width="1.8" stroke-linejoin="round" />
                                <circle cx="123" cy="28" r="2.5" fill="#fde047" />
                                <path d="M30 142C28 118 22 98 16 82" stroke="#9a683a" stroke-width="7" stroke-linecap="round" />
                                <g class="fs-cliff-palm">
                                    <path d="M16 82C-4 72 -14 82 -18 92C-4 88 6 86 16 82Z" fill="#77b849" />
                                    <path d="M16 82C4 62 12 48 22 44C20 58 18 70 16 82Z" fill="#90cb54" />
                                    <path d="M16 82C32 68 48 74 56 84C42 82 28 82 16 82Z" fill="#77b849" />
                                    <path d="M16 82C26 92 32 106 30 116C24 104 20 92 16 82Z" fill="#64a43b" />
                                </g>
                                <g class="fs-wooden-pier">
                                    <rect x="18" y="218" width="9" height="48" rx="3" fill="#8b5a34" />
                                    <rect x="64" y="220" width="9" height="52" rx="3" fill="#8b5a34" />
                                    <rect x="110" y="222" width="9" height="48" rx="3" fill="#8b5a34" />
                                    <rect x="150" y="224" width="8" height="44" rx="3" fill="#8b5a34" />
                                    <path d="M0 228H168L162 238H0V228Z" fill="#d3965b" stroke="#855228" stroke-width="2" />
                                    <path d="M0 222H165" stroke="#ebc08c" stroke-width="2.2" stroke-linecap="round" />
                                </g>
                                <path class="fs-cliff-foam" d="M14 252C68 260 148 258 238 253" stroke="#ebfff9" stroke-width="3.5" stroke-linecap="round" stroke-opacity="0.72" />
                            </svg>
                            <div class="fs-lighthouse-beacon">
                                <span class="fs-lighthouse-beam"></span>
                                <span class="fs-lighthouse-core"></span>
                            </div>
                        </div>
                        <div class="ow-sea">
                            <div class="ow-water-detail">
                                <div class="ow-water-surface"></div>
                            </div>
                            <div class="fs-sea-foam-layer">
                                <div class="fs-sea-foam-band fs-sea-foam-band--far"><div class="fs-sea-foam-bob"><div class="fs-sea-foam-drift"></div></div></div>
                                <div class="fs-sea-foam-band fs-sea-foam-band--near"><div class="fs-sea-foam-bob"><div class="fs-sea-foam-drift"></div></div></div>
                            </div>
                            <div class="ow-sun-path"></div>
                            <div class="hero-water-glints">
                                <span></span><span></span><span></span><span></span><span></span><span></span>
                            </div>
                        </div>
                        <div class="ow-clouds">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="fs-island-camera">
                            <div class="fs-jumping-fish-group">
                                <svg class="fs-jumping-fish-svg" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" width="110" height="82">
                                    <g class="fs-fish-splash-rings" transform="translate(62 72)" stroke="#e8fcff" stroke-width="1.8" stroke-linecap="round">
                                        <ellipse class="fs-splash-ring-1" rx="22" ry="5" />
                                        <ellipse class="fs-splash-ring-2" rx="14" ry="3" />
                                        <path d="M-12 -4L-16 -12M12 -4L16 -12M0 -6V-14" />
                                    </g>
                                    <g class="fs-jumping-fish-arc" transform="translate(54 58)">
                                        <path d="M-10 -2L-20 -12L-19 6L-9 2Z" fill="#ed9d40" />
                                        <path d="M-11 -5C-2 -15 13 -12 21 -1C11 10 -3 10 -11 -5Z" fill="#ffd166" />
                                        <path d="M0 -10L6 -17L11 -9" fill="#f59e0b" />
                                        <path d="M-6 1L5 4" stroke="#fff3c4" stroke-width="1.6" stroke-linecap="round" />
                                        <circle cx="14" cy="-2" r="1.7" fill="#1e4d63" />
                                    </g>
                                </svg>
                            </div>
                            <div class="ow-vessel fs-island-vessel">
                                <div class="ow-arrival-motion">
                                    <div class="ow-boat-idle">
                                        <img class="ow-boat-art" src="/images/journey/rowing-hull-waterline.svg" width="480" height="280" alt="" />
                                        <img class="voyage-oar fs-loading-oar" src="/images/journey/rowing-oar.svg" alt="" />
                                        <div class="fs-hanging-lantern">
                                            <span class="fs-lantern-cord"></span>
                                            <span class="fs-lantern-lamp"><span class="fs-lantern-glow"></span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="fs-foreground-reef-layer">
                            <div class="fs-reef-corner fs-reef-corner-left">
                                <svg viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg" width="260" height="160">
                                    <path class="fs-kelp-blade fs-kelp-1" d="M22 158C12 118 32 82 18 44C12 28 24 14 34 6C42 26 28 54 38 86C48 118 32 140 36 158Z" fill="#2dd4bf" fill-opacity="0.72" />
                                    <path class="fs-kelp-blade fs-kelp-2" d="M62 158C54 126 70 98 62 66C57 46 68 32 76 24C80 44 68 68 75 96C82 122 68 140 72 158Z" fill="#34d399" fill-opacity="0.7" />
                                    <path d="M18 158C18 134 30 116 44 114C56 112 64 126 68 136C74 118 90 108 106 114C120 120 128 138 132 158H18Z" fill="#7c6fd6" fill-opacity="0.78" />
                                    <path d="M98 158C104 138 118 126 134 128C148 130 158 144 162 158H98Z" fill="#f472b6" fill-opacity="0.76" />
                                </svg>
                            </div>
                            <div class="fs-reef-corner fs-reef-corner-right">
                                <svg viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg" width="260" height="160">
                                    <path class="fs-kelp-blade fs-kelp-1" d="M234 158C244 116 222 82 236 42C242 26 230 14 220 6C212 26 226 54 216 86C206 118 222 140 218 158Z" fill="#34d399" fill-opacity="0.72" />
                                    <path class="fs-kelp-blade fs-kelp-2" d="M186 158C194 126 178 98 186 66C191 46 180 32 172 24C168 44 180 68 173 96C166 122 180 140 176 158Z" fill="#38bdf8" fill-opacity="0.65" />
                                    <path d="M124 158C130 136 146 120 164 122C176 124 184 134 190 144C198 122 216 110 232 118C246 124 252 140 254 158H124Z" fill="#f472b6" fill-opacity="0.74" />
                                </svg>
                            </div>
                            <div class="fs-underwater-bubbles">
                                <span></span><span></span><span></span><span></span><span></span>
                                <span></span><span></span><span></span><span></span><span></span>
                            </div>
                        </div>
                </div>
                <div class="fs-loading-content">
                    <div class="fs-top-brand-pill">
                        <span class="fs-brand-symbol" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                <path d="M4 4v16l8-10 8 10V4" />
                            </svg>
                        </span>
                        <strong>NextSkill</strong>
                        <span class="fs-brand-divider">|</span>
                        <span>ก้าวสู่โลกแห่งการเรียนรู้</span>
                    </div>
                    <div class="fs-mascot-stage">
                        <div class="fs-hero-diorama">
                            <div class="fs-portal-aura" aria-hidden="true"></div>
                            <div class="fs-duo-sunburst" aria-hidden="true"></div>
                            <figure class="ow-land ow-start-land fs-center-island" aria-hidden="true">
                                <img class="ow-island-art" src="/images/journey/home-island-terrain-v2.webp" width="760" height="520" alt="" />
                            </figure>
                            <div class="fs-island-starfish" aria-hidden="true">
                                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="54" height="54">
                                    <ellipse cx="32" cy="52" rx="18" ry="5" fill="#9a5c22" fill-opacity="0.28" />
                                    <path d="M32 9L38.4 23.2L53.8 25.1L42.2 35.6L45.3 50.8L32 43.2L18.7 50.8L21.8 35.6L10.2 25.1L25.6 23.2L32 9Z" fill="#fb923c" stroke="#c2410c" stroke-width="2.5" stroke-linejoin="round" />
                                    <path d="M32 14L36.5 24.5L47.5 26L39.5 33.4L41.6 44.2L32 38.8L22.4 44.2L24.5 33.4L16.5 26L27.5 24.5L32 14Z" fill="#fdba74" fill-opacity="0.48" />
                                    <circle cx="32" cy="30" r="2.2" fill="#ea580c" />
                                    <circle cx="28" cy="26" r="1.4" fill="#ea580c" />
                                    <circle cx="36" cy="26" r="1.4" fill="#ea580c" />
                                </svg>
                            </div>
                            <div class="fs-island-chest" aria-hidden="true">
                                <svg viewBox="0 0 92 78" fill="none" xmlns="http://www.w3.org/2000/svg" width="84" height="72">
                                    <ellipse cx="46" cy="68" rx="34" ry="6" fill="#7c4a1d" fill-opacity="0.34" />
                                    <rect x="14" y="34" width="64" height="32" rx="5" fill="#b45309" stroke="#5c2d0c" stroke-width="2.6" />
                                    <path d="M12 34C12 20 24 14 46 14C68 14 80 20 80 34H12Z" fill="#d97706" stroke="#5c2d0c" stroke-width="2.6" stroke-linejoin="round" />
                                    <path d="M22 15V66M70 15V66" stroke="#fbbf24" stroke-width="5.5" />
                                    <path d="M13 34H79" stroke="#fbbf24" stroke-width="4" />
                                    <rect x="39" y="29" width="14" height="16" rx="4" fill="#fde047" stroke="#92400e" stroke-width="2.2" />
                                    <circle cx="46" cy="36" r="2.3" fill="#78350f" />
                                    <path class="fs-chest-glint" d="M72 10L74 15L79 17L74 19L72 24L70 19L65 17L70 15L72 10Z" fill="#fef08a" />
                                </svg>
                            </div>
                            <div class="fs-island-beachball" aria-hidden="true">
                                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
                                    <ellipse cx="32" cy="56" rx="18" ry="4.5" fill="#1e3a5f" fill-opacity="0.28" />
                                    <circle cx="32" cy="30" r="22" fill="#ffffff" stroke="#0284c7" stroke-width="2.5" />
                                    <path d="M32 8C21 15 16 28 21 48C28 52 36 52 43 48C48 28 43 15 32 8Z" fill="#0ea5e9" />
                                    <path d="M32 8C42 12 52 21 54 30C47 26 39 25 32 25C25 25 17 26 10 30C12 21 22 12 32 8Z" fill="#38bdf8" fill-opacity="0.72" />
                                    <circle cx="32" cy="24" r="4.5" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.6" />
                                    <path d="M18 19C20 15 24 12 28 11" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.8" />
                                </svg>
                            </div>
                            <div class="fs-book-sparkles" aria-hidden="true">
                                <span class="fb-spark fb-1">✦</span>
                                <span class="fb-spark fb-2">★</span>
                                <span class="fb-spark fb-3">✦</span>
                                <span class="fb-spark fb-4">★</span>
                                <span class="fb-spark fb-5">✦</span>
                            </div>
                            <div class="fs-nimo-hero">
                                <span class="fs-nimo-sand-shadow" aria-hidden="true"></span>
                                <img src="/images/nimo-learning.png" alt="มาสคอตนิโมกำลังอ่านหนังสือเตรียมความพร้อมบนเกาะ" class="fs-nimo-img" id="loadingNimoImg" width="250" height="250" />
                            </div>
                        </div>
                        <div class="fs-speech-bubble" id="loadingSpeechBubble">
                            <div class="fs-speech-inner">
                                <span class="fs-quote-mark" aria-hidden="true">“</span>
                                <p class="fs-quote-text" id="loadingQuoteText">ความพยายามอยู่ที่ไหน ความสำเร็จอยู่ที่นั่น</p>
                                <span class="fs-quote-mark-end" aria-hidden="true">”</span>
                            </div>
                            <span class="fs-speech-tail" aria-hidden="true"></span>
                        </div>
                    </div>
                    <div class="fs-progress-console">
                        <div class="fs-progress-meta">
                            <div class="fs-status-box">
                                <span class="fs-status-dot" aria-hidden="true"></span>
                                <span class="fs-stage-label" id="loadingStageLabel">กำลังเชื่อมต่อระบบบัญชี NextSkill...</span>
                            </div>
                            <div class="fs-percent-box">
                                <span class="fs-percent-number" id="loadingPercentNumber">0%</span>
                            </div>
                        </div>
                        <div class="fs-progress-track" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                            <div class="fs-progress-fill" id="loadingProgressFill" style="width: 0%;">
                                <span class="fs-progress-glow-tip" aria-hidden="true"></span>
                                <span class="fs-progress-star-tip" aria-hidden="true">★</span>
                            </div>
                        </div>
                        <div class="fs-tip-capsule">
                            <span class="tip-bulb" aria-hidden="true">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>
                            </span>
                            <span id="loadingSubTip">เรียนรู้วันละนิด สะสมทักษะชีวิตทีละก้าวไปกับ NextSkill</span>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    // Inspiring quotes pool, featuring the user's favorite quote!
    const motivationalQuotes = [
        "ความพยายามอยู่ที่ไหน ความสำเร็จอยู่ที่นั่น",
        "ทุกก้าวเล็กๆ ในวันนี้ คือความสำเร็จที่ยิ่งใหญ่ในวันข้างหน้า",
        "เก่งขึ้นวันละ 1% ในหนึ่งปีเราจะก้าวหน้าขึ้นกว่าเดิมถึง 37 เท่า",
        "การเรียนรู้คือการลงทุนที่ดีที่สุดสำหรับตัวเราเอง",
        "อย่ายอมแพ้! ก้าวข้ามขีดจำกัดแล้วไปให้สุดทาง",
        "ความรู้คือเวทมนตร์ที่จะเปิดประตูสู่อนาคตที่คุณเลือกได้",
        "วันนี้เราเก่งกว่าเมื่อวาน และพรุ่งนี้เราจะเก่งกว่าวันนี้!",
        "เริ่มต้นทีละบทเรียน แล้วทุกอย่างจะกลายเป็นความเชี่ยวชาญ",
        "สะสมความรู้ทีละนิด เหมือนสะสมพลังสู่เป้าหมายที่ยิ่งใหญ่",
        "ไม่มีอะไรที่เป็นไปไม่ได้ สำหรับคนที่ลงมือทำและไม่หยุดเรียนรู้"
    ];

    const learnerTips = [
        "เรียนรู้วันละนิด สะสมทักษะชีวิตทีละก้าวไปกับ NextSkill",
        "ฝึกฝนวันละ 15 นาที พัฒนาทักษะได้เร็วกว่าที่คิด!",
        "ทำภารกิจประจำวันให้สำเร็จเพื่อรับโบนัส XP สูงสุด",
        "บทเรียนสั้น เข้าใจง่าย เรียนได้ทุกที่ ทุกเวลา",
        "ทบทวนแบบฝึกหัดอย่างสม่ำเสมอ ช่วยให้จำแม่นยำยิ่งขึ้น"
    ];

    let lastQuoteIndex = -1;
    function pickRandomQuote() {
        let index;
        if (lastQuoteIndex === -1) {
            index = Math.floor(Math.random() * motivationalQuotes.length);
        } else {
            do {
                index = Math.floor(Math.random() * motivationalQuotes.length);
            } while (index === lastQuoteIndex && motivationalQuotes.length > 1);
        }
        lastQuoteIndex = index;
        return motivationalQuotes[index];
    }

    // Unified Cinematic Full-Screen Loading Screen Function
    function triggerCinematicLoading(options = {}) {
        const { isDemo = false, form = null } = options;
        const overlay = document.getElementById('nimoLoginLoadingOverlay') || ensureFullScreenOverlay();
        const quoteEl = document.getElementById('loadingQuoteText');
        const stageEl = document.getElementById('loadingStageLabel');
        const pctEl = document.getElementById('loadingPercentNumber');
        const fillEl = document.getElementById('loadingProgressFill');
        const tipEl = document.getElementById('loadingSubTip');

        if (!overlay) return;

        // Set motivational quote & tip
        if (quoteEl) quoteEl.textContent = pickRandomQuote();
        if (tipEl) tipEl.textContent = learnerTips[Math.floor(Math.random() * learnerTips.length)];

        // Reset progress state
        let currentPct = 0;
        if (pctEl) pctEl.textContent = '0%';
        if (fillEl) fillEl.style.width = '0%';
        if (stageEl) stageEl.textContent = 'กำลังเชื่อมต่อระบบบัญชี NextSkill...';

        // Add or toggle close preview button
        let closeBtn = overlay.querySelector('.fs-preview-close-btn');
        if (isDemo) {
            if (!closeBtn) {
                closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = 'fs-preview-close-btn';
                closeBtn.innerHTML = `<span>ปิดหน้าตัวอย่าง</span> <span aria-hidden="true">&times;</span>`;
                overlay.appendChild(closeBtn);
            }
            closeBtn.style.display = 'inline-flex';
            closeBtn.onclick = () => {
                overlay.classList.remove('is-active');
                overlay.setAttribute('aria-hidden', 'true');
            };
        } else if (closeBtn) {
            closeBtn.style.display = 'none';
        }

        // Show overlay with spring entrance
        overlay.classList.add('is-active');
        overlay.setAttribute('aria-hidden', 'false');

        const islandArt = overlay.querySelector('.ow-island-art');
        if (islandArt) islandArt.dataset.islandWind = 'active';
        const wildlife = overlay.querySelector('[data-island-wildlife]');
        if (wildlife) wildlife.dataset.wildlifeMotion = 'active';

        const startTime = performance.now();
        const totalDuration = isDemo ? 2400 : 1850;
        let isDone = false;
        let animationFrameId;

        function updateProgress(now) {
            const elapsed = now - startTime;
            const fraction = Math.min(elapsed / totalDuration, 1);

            let targetPct;
            if (isDemo) {
                targetPct = Math.round((1 - Math.pow(1 - fraction, 3)) * 100);
            } else {
                targetPct = isDone ? 100 : Math.min(Math.round((1 - Math.pow(1 - fraction, 2)) * 92), 92);
            }

            if (targetPct > currentPct) {
                currentPct = targetPct;
                if (pctEl) pctEl.textContent = `${currentPct}%`;
                if (fillEl) fillEl.style.width = `${currentPct}%`;

                if (stageEl) {
                    if (currentPct < 25) {
                        stageEl.textContent = 'กำลังเชื่อมต่อระบบบัญชี NextSkill...';
                    } else if (currentPct < 55) {
                        stageEl.textContent = 'กำลังโหลดข้อมูลและทักษะ...';
                    } else if (currentPct < 85) {
                        stageEl.textContent = 'จัดเตรียมด่านการเรียนรู้ของคุณ...';
                    } else if (currentPct < 100) {
                        stageEl.textContent = 'เกือบพร้อมแล้ว! กำลังเข้าสู่ระบบ...';
                    } else {
                        stageEl.textContent = 'เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับสู่ NextSkill';
                    }
                }
            }

            if (currentPct < 100) {
                animationFrameId = requestAnimationFrame(updateProgress);
            } else if (isDemo) {
                // Multi-cannon celebratory confetti blast at 100%
                const nimoHero = overlay.querySelector('.fs-nimo-hero') || overlay;
                const rect = nimoHero.getBoundingClientRect();
                spawnDuoConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
                spawnDuoConfetti(window.innerWidth * 0.22, window.innerHeight * 0.45, 26);
                spawnDuoConfetti(window.innerWidth * 0.78, window.innerHeight * 0.45, 26);

                // Auto dismiss smoothly after 2.8s in demo mode
                setTimeout(() => {
                    if (overlay.classList.contains('is-active') && isDemo) {
                        overlay.classList.remove('is-active');
                        overlay.setAttribute('aria-hidden', 'true');
                    }
                }, 2800);
            }
        }

        animationFrameId = requestAnimationFrame(updateProgress);

        // Real form submission async logic
        if (!isDemo && form) {
            const formData = new FormData(form);
            fetch(form.action, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            }).then(async (res) => {
                const elapsed = performance.now() - startTime;
                if (elapsed < totalDuration) {
                    await new Promise(r => setTimeout(r, totalDuration - elapsed));
                }

                const curPath = window.location.pathname.toLowerCase();
                const resPath = res.url ? new URL(res.url).pathname.toLowerCase() : '';
                const isSuccess = res.redirected || (resPath && resPath !== curPath && !resPath.includes('/login'));

                if (isSuccess) {
                    isDone = true;
                    if (pctEl) pctEl.textContent = '100%';
                    if (fillEl) fillEl.style.width = '100%';
                    if (stageEl) stageEl.textContent = 'เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับสู่ NextSkill';

                    const nimoHero = overlay.querySelector('.fs-nimo-hero') || overlay;
                    const rect = nimoHero.getBoundingClientRect();
                    spawnDuoConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
                    spawnDuoConfetti(window.innerWidth * 0.22, window.innerHeight * 0.45, 26);
                    spawnDuoConfetti(window.innerWidth * 0.78, window.innerHeight * 0.45, 26);

                    setTimeout(() => {
                        window.location.href = res.url;
                    }, 500);
                } else {
                    cancelAnimationFrame(animationFrameId);
                    const html = await res.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const newErr = doc.querySelector('.validation-summary-errors, .validation-summary');
                    const targetSummary = form.querySelector('.validation-summary-errors, .validation-summary');

                    overlay.classList.remove('is-active');
                    overlay.setAttribute('aria-hidden', 'true');

                    if (targetSummary && newErr && newErr.innerHTML.trim()) {
                        targetSummary.innerHTML = newErr.innerHTML;
                    } else if (targetSummary) {
                        targetSummary.innerHTML = '<ul><li>อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง</li></ul>';
                    }

                    if (targetSummary) {
                        targetSummary.classList.remove('validation-summary-valid');
                        targetSummary.classList.add('validation-summary-errors');
                    }

                    const authCard = document.querySelector('.nimo-auth-card');
                    if (authCard) {
                        authCard.classList.remove('form-shake');
                        void authCard.offsetWidth;
                        authCard.classList.add('form-shake');
                    }

                    const pwd = form.querySelector('input[type="password"]');
                    if (pwd) {
                        pwd.value = '';
                        pwd.focus();
                    }
                }
            }).catch(err => {
                console.warn('Network error during auth fetch, falling back to native submission:', err);
                isDone = true;
                if (pctEl) pctEl.textContent = '100%';
                if (fillEl) fillEl.style.width = '100%';
                setTimeout(() => {
                    HTMLFormElement.prototype.submit.call(form);
                }, 300);
            });
        }
    }

    // Attach to Login Core Forms
    const authForms = document.querySelectorAll('form.login-core-form');
    authForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            e.preventDefault();
            triggerCinematicLoading({ isDemo: false, form: form });
        });
    });

    // Escape Key Dismiss for Demo Preview
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('nimoLoginLoadingOverlay');
            if (overlay && overlay.classList.contains('is-active')) {
                overlay.classList.remove('is-active');
                overlay.setAttribute('aria-hidden', 'true');
            }
        }
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
                        <a class="ns-navbar__link" href="/Learning/Island"><span class="ns-navbar__icon ns-navbar__icon--boat" aria-hidden="true"></span>เกาะของฉัน</a>
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
