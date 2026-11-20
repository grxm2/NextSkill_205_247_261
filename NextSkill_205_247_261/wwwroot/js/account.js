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
            overlay.className = 'nimo-loading-overlay full-screen-mode';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'กำลังเข้าสู่ระบบ');
            overlay.innerHTML = `
                <div class="fs-loading-sky" aria-hidden="true">
                    <div class="fs-cloud fs-c1"></div>
                    <div class="fs-cloud fs-c2"></div>
                    <div class="fs-cloud fs-c3"></div>
                    <div class="fs-cloud fs-c4"></div>
                    <div class="fs-aurora-orb fs-orb-top"></div>
                    <div class="fs-aurora-orb fs-orb-center"></div>
                    <div class="fs-float-prop prop-cap">
                        <img src="/images/float-grad-cap.png" alt="" width="95" height="102" />
                    </div>
                    <div class="fs-float-prop prop-book">
                        <img src="/images/float-book.png" alt="" width="90" height="75" />
                    </div>
                    <div class="fs-float-prop prop-cube">
                        <img src="/images/float-play-cube.png" alt="" width="52" height="56" />
                    </div>
                    <span class="fs-xp-star xps-1">✦</span>
                    <span class="fs-xp-star xps-2">★</span>
                    <span class="fs-xp-star xps-3">✦</span>
                    <span class="fs-xp-star xps-4">★</span>
                    <span class="fs-xp-star xps-5">✦</span>
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
                        <div class="fs-portal-aura" aria-hidden="true"></div>
                        <div class="fs-book-sparkles" aria-hidden="true">
                            <span class="fb-spark fb-1">✦</span>
                            <span class="fb-spark fb-2">★</span>
                            <span class="fb-spark fb-3">✦</span>
                            <span class="fb-spark fb-4">★</span>
                        </div>
                        <div class="fs-nimo-hero">
                            <img src="/images/nimo-learning.png" alt="มาสคอตนิโมกำลังอ่านหนังสือเตรียมความพร้อม" class="fs-nimo-img" id="loadingNimoImg" width="260" height="260" />
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
                <div class="fs-waves-landscape" aria-hidden="true">
                    <svg class="fs-wave-svg wave-back" viewBox="0 0 1440 120" preserveAspectRatio="none">
                        <path d="M0,45 C320,85 480,15 760,50 C1040,85 1200,20 1440,48 L1440,120 L0,120 Z" fill="rgba(255,255,255,0.2)"></path>
                    </svg>
                    <svg class="fs-wave-svg wave-front" viewBox="0 0 1440 120" preserveAspectRatio="none">
                        <path d="M0,60 C360,20 540,90 880,55 C1180,25 1320,70 1440,58 L1440,120 L0,120 Z" fill="rgba(255,255,255,0.45)"></path>
                    </svg>
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
                        targetSummary.classList.add('validation-summary-errors');
                    } else if (targetSummary) {
                        targetSummary.innerHTML = '<ul><li>อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง</li></ul>';
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
