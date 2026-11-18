(() => {
    'use strict';
    const section = document.getElementById('lesson-video');
    if (!section) return;

    const slot = document.getElementById('lesson-video-player');
    const placeholder = document.getElementById('lesson-video-placeholder');
    const play = document.getElementById('lesson-video-play');
    const retry = document.getElementById('lesson-video-retry');
    const status = document.getElementById('lesson-video-status');
    const source = document.getElementById('lesson-video-source');
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
                reject(new Error('YouTube API unavailable'));
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
        clearInterval(view.endPoll);
        clearTimeout(view.readyTimeout);
        view.player?.destroy();
        view.player = null;
        slot.replaceChildren();
    }

    function reset() {
        const view = current;
        current = null;
        if (view) stopPlayer(view);
        section.hidden = true;
        retry.hidden = true;
        retry.disabled = false;
    }

    async function saveEnd(view) {
        if (view !== current || view.unlocked || view.saving) return;
        clearInterval(view.endPoll);
        view.saving = true;
        retry.hidden = true;
        retry.disabled = true;
        status.textContent = 'กำลังบันทึกการดูวิดีโอ…';
        try {
            await view.onEnd();
            if (view !== current) return;
            view.unlocked = true;
            status.textContent = 'ดูวิดีโอครบแล้ว เริ่มแบบทดสอบได้';
        } catch (error) {
            if (view !== current) return;
            status.textContent = error.message || 'บันทึกการดูไม่สำเร็จ กรุณาลองใหม่';
            retry.hidden = false;
        } finally {
            if (view === current) {
                view.saving = false;
                retry.disabled = false;
            }
        }
    }

    function loadError(view) {
        if (view !== current) return;
        stopPlayer(view);
        placeholder.hidden = false;
        play.disabled = false;
        play.textContent = 'ลองโหลดวิดีโออีกครั้ง';
        status.textContent = 'เปิดวิดีโอไม่ได้ กรุณาเช็กการเชื่อมต่อแล้วลองอีกครั้ง';
    }

    async function loadVideo(view) {
        play.disabled = true;
        play.textContent = 'กำลังโหลดวิดีโอ…';
        try {
            const YT = await loadApi();
            if (view !== current) return;
            const iframe = document.createElement('iframe');
            const url = new URL(`https://www.youtube.com/embed/${view.video.youTubeId}`);
            url.search = new URLSearchParams({ enablejsapi: '1', origin: location.origin, playsinline: '1', rel: '0', autoplay: '1' });
            iframe.src = url.href;
            iframe.title = `CodeWithHarry · ${view.title}`;
            iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
            iframe.allowFullscreen = true;
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            slot.replaceChildren(iframe);
            view.readyTimeout = setTimeout(() => loadError(view), 15000);
            view.player = new YT.Player(iframe, {
                events: {
                    onReady({ target }) {
                        if (view !== current) return;
                        clearTimeout(view.readyTimeout);
                        placeholder.hidden = true;
                        status.textContent = view.unlocked ? 'ดูวิดีโอครบแล้ว เริ่มแบบทดสอบได้' : view.instruction;
                        if (section.hidden) target.pauseVideo();
                        if (!view.unlocked) view.endPoll = setInterval(() => {
                            const duration = target.getDuration();
                            // Scrubbing to the last frame can leave YouTube paused.
                            if (duration > 0 && target.getCurrentTime() >= duration - .35) saveEnd(view);
                        }, 400);
                    },
                    onStateChange({ data }) {
                        if (data === YT.PlayerState.ENDED) saveEnd(view);
                    },
                    onError() { loadError(view); }
                }
            });
        } catch { loadError(view); }
    }

    play.addEventListener('click', () => { if (current) loadVideo(current); });
    retry.addEventListener('click', () => { if (current) saveEnd(current); });
    window.NextSkillLessonVideo = {
        mount(lesson, onEnd) {
            reset();
            const seconds = lesson.video.durationSeconds;
            const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
            current = {
                video: lesson.video, title: lesson.title, unlocked: lesson.videoUnlocked, onEnd,
                instruction: 'เล่นหรือเลื่อนไปจนจบคลิปเพื่อเปิดแบบทดสอบ'
            };
            source.textContent = `CodeWithHarry · ${duration}`;
            placeholder.hidden = false;
            play.disabled = false;
            play.textContent = 'เล่นวิดีโอจาก YouTube';
            status.textContent = current.unlocked ? 'ดูวิดีโอครบแล้ว เริ่มแบบทดสอบได้' : current.instruction;
            section.hidden = false;
        },
        setVisible(visible) {
            section.hidden = !visible || !current;
            if (!visible) current?.player?.pauseVideo?.();
        },
        reset
    };
})();
