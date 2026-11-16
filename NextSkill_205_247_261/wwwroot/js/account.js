(() => {
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

    // Interactive Floating Badges (Duolingo Style Click Response)
    document.querySelectorAll('.duo-interactive-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
            const rect = badge.getBoundingClientRect();
            spawnDuoConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 16);

            // Mascot reacts with cheerful celebration!
            if (badge.classList.contains('float-card-top-right')) {
                setMascotSpeech("มุ่งสู่ใบประกาศนียบัตร NextSkill กัน!", true, 3500);
            } else if (badge.classList.contains('float-card-mid-left')) {
                setMascotSpeech("สะสม XP ให้เต็มหลอดทุกวันนะ!", true, 3500);
            } else {
                setMascotSpeech("ก้าวไปอีกขั้น ทักษะใหม่รออยู่!", true, 3500);
            }

            setMascotPose(POSE_JUMP);
            if (mascotImg) {
                mascotImg.classList.remove('mascot-click-jump');
                void mascotImg.offsetWidth;
                mascotImg.classList.add('mascot-click-jump');
            }

            clearTimeout(restorePoseTimer);
            restorePoseTimer = setTimeout(() => {
                setMascotPose(POSE_DEFAULT);
            }, 1800);
        });
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
    const authGrid = document.querySelector('.auth-grid');
    if (authGrid && window.innerWidth > 960) {
        let isThrottled = false;
        document.addEventListener('mousemove', (e) => {
            if (isThrottled) return;
            isThrottled = true;
            requestAnimationFrame(() => {
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                const dx = (e.clientX - cx) / cx; // -1 to 1
                const dy = (e.clientY - cy) / cy; // -1 to 1

                const storyCard = document.querySelector('.nimo-story-card');
                const authCard = document.querySelector('.nimo-auth-card');

                if (storyCard) {
                    storyCard.style.transform = `perspective(1000px) rotateY(${dx * 3}deg) rotateX(${-dy * 3}deg) translateY(-2px)`;
                }
                if (authCard) {
                    authCard.style.transform = `perspective(1000px) rotateY(${dx * 2}deg) rotateX(${-dy * 2}deg)`;
                }
                isThrottled = false;
            });
        });
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

    let loadingOverlay = document.getElementById('nimoLoginLoadingOverlay') || ensureFullScreenOverlay();
    let quoteTextEl = document.getElementById('loadingQuoteText');
    let stageLabelEl = document.getElementById('loadingStageLabel');
    let percentNumberEl = document.getElementById('loadingPercentNumber');
    let progressFillEl = document.getElementById('loadingProgressFill');

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
    const subTipEl = document.getElementById('loadingSubTip');

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

    const authForms = document.querySelectorAll('form.login-core-form');
    authForms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            loadingOverlay = ensureFullScreenOverlay();
            quoteTextEl = document.getElementById('loadingQuoteText');
            stageLabelEl = document.getElementById('loadingStageLabel');
            percentNumberEl = document.getElementById('loadingPercentNumber');
            progressFillEl = document.getElementById('loadingProgressFill');
            if (!loadingOverlay) return;

            // 1. Check HTML5 form validation first
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            e.preventDefault();

            // 2. Set random quote in mascot speech bubble
            const quote = pickRandomQuote();
            if (quoteTextEl) {
                quoteTextEl.textContent = quote;
            }
            if (subTipEl) {
                subTipEl.textContent = learnerTips[Math.floor(Math.random() * learnerTips.length)];
            }

            // 3. Reset progress state
            let currentPct = 0;
            if (percentNumberEl) percentNumberEl.textContent = '0%';
            if (progressFillEl) progressFillEl.style.width = '0%';
            if (stageLabelEl) stageLabelEl.textContent = 'กำลังเชื่อมต่อระบบบัญชี...';

            // 4. Activate loading overlay with smooth spring animation
            loadingOverlay.classList.add('is-active');
            loadingOverlay.setAttribute('aria-hidden', 'false');

            // 5. Concurrently submit credentials to server
            const formData = new FormData(form);
            const startTime = performance.now();
            const minDuration = 1800; // 1.8 seconds total for smooth reading & progress feel

            let serverResponse = null;
            let networkError = null;

            const authPromise = fetch(form.action, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            }).then(res => {
                serverResponse = res;
                return res;
            }).catch(err => {
                networkError = err;
                console.warn('Auth fetch error, fallback will trigger:', err);
            });

            // 6. Smooth progress counter animation (0% -> 92% -> 100%)
            let isComplete = false;
            let animationFrameId;

            function stepProgress(timestamp) {
                const elapsed = timestamp - startTime;
                const timeFraction = Math.min(elapsed / minDuration, 1);

                let target;
                if (!isComplete) {
                    // Quad ease-out towards 92%
                    target = Math.min(Math.round((1 - Math.pow(1 - timeFraction, 2)) * 92), 92);
                } else {
                    target = 100;
                }

                if (target > currentPct) {
                    currentPct = target;
                    if (percentNumberEl) percentNumberEl.textContent = `${currentPct}%`;
                    if (progressFillEl) progressFillEl.style.width = `${currentPct}%`;

                    // Dynamic status messages
                    if (stageLabelEl) {
                        if (currentPct < 28) {
                            stageLabelEl.textContent = 'กำลังเชื่อมต่อระบบบัญชี...';
                        } else if (currentPct < 58) {
                            stageLabelEl.textContent = 'กำลังโหลดข้อมูลและทักษะ...';
                        } else if (currentPct < 88) {
                            stageLabelEl.textContent = 'จัดเตรียมด่านการเรียนรู้ของคุณ...';
                        } else if (currentPct < 100) {
                            stageLabelEl.textContent = 'เกือบพร้อมแล้ว! กำลังเข้าสู่ระบบ...';
                        } else {
                            stageLabelEl.textContent = 'เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับสู่ NextSkill';
                        }
                    }
                }

                if (currentPct < 100) {
                    animationFrameId = requestAnimationFrame(stepProgress);
                }
            }

            animationFrameId = requestAnimationFrame(stepProgress);

            // Await both server response and minimum duration
            await authPromise;
            const elapsed = performance.now() - startTime;
            if (elapsed < minDuration) {
                await new Promise(res => setTimeout(res, minDuration - elapsed));
            }

            // Fallback for unexpected network error: standard native submit
            if (networkError || !serverResponse) {
                isComplete = true;
                if (percentNumberEl) percentNumberEl.textContent = '100%';
                if (progressFillEl) progressFillEl.style.width = '100%';
                setTimeout(() => {
                    HTMLFormElement.prototype.submit.call(form);
                }, 300);
                return;
            }

            // Check if authentication succeeded:
            const curPath = window.location.pathname.toLowerCase();
            const resPath = serverResponse.url ? new URL(serverResponse.url).pathname.toLowerCase() : '';
            const isSuccess = serverResponse.redirected || (resPath && resPath !== curPath && !resPath.includes('/login'));

            if (isSuccess) {
                isComplete = true;
                currentPct = 100;
                if (percentNumberEl) percentNumberEl.textContent = '100%';
                if (progressFillEl) progressFillEl.style.width = '100%';
                if (stageLabelEl) stageLabelEl.textContent = 'เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับสู่ NextSkill';

                // Full-screen celebratory multi-cannon confetti shower!
                const nimoHero = loadingOverlay.querySelector('.fs-nimo-hero') || loadingOverlay;
                const rect = nimoHero.getBoundingClientRect();
                spawnDuoConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 35);
                spawnDuoConfetti(window.innerWidth * 0.22, window.innerHeight * 0.42, 24);
                spawnDuoConfetti(window.innerWidth * 0.78, window.innerHeight * 0.42, 24);

                setTimeout(() => {
                    window.location.href = serverResponse.url;
                }, 500);
            } else {
                // Login failed: credentials incorrect or account locked
                cancelAnimationFrame(animationFrameId);

                const html = await serverResponse.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newErr = doc.querySelector('.validation-summary-errors, .validation-summary');
                const targetSummary = form.querySelector('.validation-summary-errors, .validation-summary');

                // Dismiss loading overlay smoothly
                loadingOverlay.classList.remove('is-active');
                loadingOverlay.setAttribute('aria-hidden', 'true');

                if (targetSummary && newErr && newErr.innerHTML.trim()) {
                    targetSummary.innerHTML = newErr.innerHTML;
                    targetSummary.classList.add('validation-summary-errors');
                } else if (targetSummary) {
                    targetSummary.innerHTML = '<ul><li>อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง</li></ul>';
                    targetSummary.classList.add('validation-summary-errors');
                }

                // Shake form card to signal error
                const authCard = document.querySelector('.nimo-auth-card');
                if (authCard) {
                    authCard.classList.remove('form-shake');
                    void authCard.offsetWidth;
                    authCard.classList.add('form-shake');
                }

                // Clear & refocus password input
                const pwd = form.querySelector('input[type="password"]');
                if (pwd) {
                    pwd.value = '';
                    pwd.focus();
                }
            }
        });
    });
})();