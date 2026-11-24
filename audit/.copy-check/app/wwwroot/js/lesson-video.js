(() => {
    'use strict';
    const section = document.getElementById('lesson-video');
    if (!section) return;

    const slot = document.getElementById('lesson-video-player');
    const placeholder = document.getElementById('lesson-video-placeholder');
    const play = document.getElementById('lesson-video-play');
    const retry = document.getElementById('lesson-video-retry');
    const skip = document.getElementById('lesson-video-skip');
    const progress = document.getElementById('lesson-video-progress');
    const status = document.getElementById('lesson-video-status');
    const source = document.getElementById('lesson-video-source');
    const instruction = 'ดูหรือเลื่อนไปช่วงท้ายคลิป หรือกดข้ามเพื่อเริ่มแบบทดสอบ';
    const unlockedMessage = 'พร้อมทำแบบทดสอบแล้ว';
    let apiLoading;
    let current;

    function loadApi() {
        if (window.YT?.Player) return Promise.resolve(window.YT);
        apiLoading ??= new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;
            const timeout = setTimeout(fail, 12000);
            function fail() {
                clearTimeout(timeout);
                script.remove();
                reject(new Error('เปิดตัวเล่น YouTube ไม่ได้'));
            }
            window.onYouTubeIframeAPIReady = () => {
                clearTimeout(timeout);
                resolve(window.YT);
            };
            script.addEventListener('error', fail, { once: true });
            document.head.append(script);
        }).catch(error => {
            apiLoading = null;
            throw error;
        });
        return apiLoading;
    }

    function stopPlayer(view) {
        clearInterval(view.poll);
        clearTimeout(view.readyTimeout);
        view.ready = false;
        const player = view.player;
        view.player = null;
        player?.destroy();
        slot.replaceChildren();
    }

    function reset() {
        const view = current;
        current = null;
        if (view) stopPlayer(view);
        section.hidden = true;
        retry.hidden = true;
        retry.disabled = false;
        skip.hidden = true;
        skip.disabled = false;
    }

    function updatePosition(view, ended = false) {
        if (view !== current || !view.ready || section.hidden) return;
        const { durationSeconds, requiredPositionSeconds } = view.video;
        // The source can be edited on YouTube. Use its live timeline to locate the final 10%.
        if (ended) view.positionSeconds = durationSeconds;
        else {
            const actualDuration = view.player.getDuration();
            const seconds = view.player.getCurrentTime();
            if (!Number.isFinite(actualDuration) || actualDuration <= 0 || !Number.isFinite(seconds)) return;
            const fraction = Math.max(0, Math.min(1, seconds / actualDuration));
            view.positionSeconds = Math.floor(fraction * durationSeconds);
        }
        progress.value = view.positionSeconds;
        if (!view.unlocked && view.positionSeconds >= requiredPositionSeconds && retry.hidden)
            saveQuiz(view, { positionSeconds: view.positionSeconds, skipVideo: false });
    }

    function trackPosition(view) {
        clearInterval(view.poll);
        if (view.ready && !section.hidden) view.poll = setInterval(() => updatePosition(view), 300);
    }

    async function saveQuiz(view, attempt) {
        if (view !== current || !view.started || view.unlocked || view.saving) return;
        view.saving = true;
        view.attempt = attempt;
        retry.hidden = true;
        retry.disabled = true;
        skip.disabled = true;
        status.textContent = 'กำลังเปิดแบบทดสอบ…';
        try {
            await view.onEnd(attempt);
            if (view !== current) return;
            view.unlocked = true;
            skip.hidden = true;
            status.textContent = unlockedMessage;
        } catch (error) {
            if (view !== current) return;
            status.textContent = error.message || 'ยังเปิดแบบทดสอบไม่ได้ กรุณาลองอีกครั้ง';
            skip.hidden = true;
            retry.hidden = false;
        } finally {
            if (view === current) {
                view.saving = false;
                retry.disabled = false;
                skip.disabled = false;
            }
        }
    }

    function loadError(view, message) {
        if (view !== current) return;
        stopPlayer(view);
        placeholder.hidden = false;
        skip.hidden = view.unlocked || !view.started || !retry.hidden;
        play.disabled = false;
        play.textContent = 'ลองโหลดวิดีโออีกครั้ง';
        if (view.unlocked) status.textContent = unlockedMessage;
        else if (view.started) status.textContent = 'เปิดวิดีโอไม่ได้ ลองโหลดใหม่หรือข้ามไปทำแบบทดสอบได้เลย';
        else status.textContent = message || 'เปิดวิดีโอไม่ได้ กรุณาเช็กการเชื่อมต่อแล้วลองอีกครั้ง';
    }

    async function loadVideo(view) {
        play.disabled = true;
        play.textContent = 'กำลังโหลดวิดีโอ…';
        try {
            if (!view.unlocked && !view.started) {
                await view.onStart();
                if (view !== current) return;
                view.started = true;
                skip.hidden = false;
                status.textContent = instruction;
            }
            const YT = await loadApi();
            if (view !== current) return;
            if (section.hidden) {
                play.disabled = false;
                play.textContent = 'เล่นวิดีโอจาก YouTube';
                return;
            }
            const iframe = document.createElement('iframe');
            const url = new URL(`https://www.youtube.com/embed/${view.video.youTubeId}`);
            url.search = new URLSearchParams({ enablejsapi: '1', origin: location.origin, playsinline: '1', rel: '0', autoplay: '1' });
            iframe.src = url.href;
            iframe.title = view.video.title || view.title;
            iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
            iframe.allowFullscreen = true;
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            slot.replaceChildren(iframe);
            view.readyTimeout = setTimeout(() => loadError(view), 15000);
            view.player = new YT.Player(iframe, {
                events: {
                    onReady({ target }) {
                        if (view !== current || target !== view.player) return;
                        clearTimeout(view.readyTimeout);
                        view.ready = true;
                        placeholder.hidden = true;
                        if (!view.saving && retry.hidden) status.textContent = view.unlocked ? unlockedMessage : instruction;
                        if (section.hidden) target.pauseVideo();
                        trackPosition(view);
                        updatePosition(view);
                    },
                    onStateChange({ target, data }) {
                        if (target === view.player) updatePosition(view, data === YT.PlayerState.ENDED);
                    },
                    onError({ target }) { if (target === view.player) loadError(view); }
                }
            });
        } catch (error) { loadError(view, error.message); }
    }

    play.addEventListener('click', () => { if (current) loadVideo(current); });
    retry.addEventListener('click', () => { if (current?.attempt) saveQuiz(current, current.attempt); });
    skip.addEventListener('click', () => {
        if (current) saveQuiz(current, { positionSeconds: current.positionSeconds, skipVideo: true });
    });
    window.NextSkillLessonVideo = {
        mount(lesson, onStart, onEnd) {
            reset();
            const { video, title, videoUnlocked: unlocked } = lesson;
            const seconds = video.durationSeconds;
            const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
            current = { video, title, unlocked, onStart, onEnd, started: false, positionSeconds: 0 };
            source.textContent = `${video.creator} · ${duration}`;
            source.href = `https://www.youtube.com/watch?v=${video.youTubeId}`;
            progress.max = video.durationSeconds;
            progress.value = 0;
            placeholder.hidden = false;
            play.disabled = false;
            play.textContent = 'เล่นวิดีโอจาก YouTube';
            status.textContent = unlocked ? unlockedMessage : 'เปิดวิดีโอก่อน จากนั้นจะดูต่อหรือข้ามไปทำแบบทดสอบก็ได้';
            section.hidden = false;
        },
        setVisible(visible) {
            section.hidden = !visible || !current;
            if (current) trackPosition(current);
            if (!visible) current?.player?.pauseVideo?.();
        },
        reset
    };
})();
