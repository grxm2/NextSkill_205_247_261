(() => {
    'use strict';
    const target = document.getElementById('hero-highlight');
    const scene = document.getElementById('ocean-journey');
    const brand = document.querySelector('.ns-navbar__brand');
    const firstLink = document.querySelector('.ns-navbar__menu .ns-navbar__link');
    const nav = document.querySelector('.ns-navbar');
    const intro = target?.closest('.ow-intro');
    if (!target || !scene || !brand || !firstLink || !nav || !intro) return;

    const small = matchMedia('(max-width: 959.98px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const star = document.createElement('span');
    star.className = 'shooting-star';
    star.setAttribute('aria-hidden', 'true');
    document.body.appendChild(star);
    const behindStar = star.cloneNode();
    behindStar.classList.add('shooting-star--behind');
    intro.prepend(behindStar);
    let timer = 0, frame = 0, flashTimer = 0, animation = null, behindAnimation = null, allowed = true;

    function stop() {
        clearTimeout(timer); clearTimeout(flashTimer); cancelAnimationFrame(frame);
        timer = frame = flashTimer = 0;
        animation?.cancel(); animation = null;
        behindAnimation?.cancel(); behindAnimation = null;
        target.classList.remove('is-star-lit');
    }
    function canPlay() {
        const box = target.getBoundingClientRect();
        return allowed && !small.matches && !reduced.matches && !document.hidden &&
            box.width > 0 && box.left >= 0 && box.right <= innerWidth && box.top > 0 && box.bottom < innerHeight &&
            getComputedStyle(intro).opacity > .95;
    }
    function schedule(delay = 8000 + Math.random() * 4000) {
        clearTimeout(timer);
        if (allowed && !small.matches && !reduced.matches && !document.hidden) timer = setTimeout(play, delay);
    }
    function play() {
        if (!canPlay()) { schedule(); return; }
        const word = target.getBoundingClientRect();
        const bar = nav.getBoundingClientRect();
        const left = brand.getBoundingClientRect().right + 8;
        const right = firstLink.getBoundingClientRect().left - 8;
        const gapY = bar.top + bar.height / 2;
        const targetY = word.top + word.height / 2;
        if (right <= left || targetY <= gapY + 20) { schedule(); return; }

        // Aim at a point in the word that makes a 45-degree path through the gap.
        // If the available geometry cannot reach 45 degrees, use the nearest
        // point inside both the gap and the word instead of crossing a control.
        const travelY = targetY - gapY;
        const wordX = Math.max(word.left + 5, Math.min(word.right - 5, (left + right) / 2 - travelY));
        const gapX = Math.max(left, Math.min(right, wordX + (targetY - gapY)));
        const slope = (gapX - wordX) / (targetY - gapY);
        if (slope <= 0) { schedule(); return; }
        const startY = -12;
        const startX = gapX + (gapY - startY) * slope;
        // Keep the whole tail travelling until it has left the viewport.
        const endY = Math.min(innerHeight + 180, startY + (startX + 180) / slope);
        const endX = startX - (endY - startY) * slope;
        const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
        const duration = Math.max(4300, Math.hypot(endX - startX, endY - startY) / .20);
        const hitAt = (targetY - startY) / (endY - startY);
        const introBox = intro.getBoundingClientRect();
        const switchAt = Math.max(.09, Math.min(hitAt - .02, (introBox.top - 12 - startY) / (endY - startY)));
        const position = (t, xOffset = 0, yOffset = 0) =>
            `translate3d(${startX + (endX-startX)*t - xOffset}px,${startY + (endY-startY)*t - yOffset}px,0) rotate(${angle}deg)`;
        const globalFrames = [
                {transform:position(0),opacity:0,offset:0},
                {transform:position(.05),opacity:1,offset:.05},
                {transform:position(switchAt),opacity:1,offset:switchAt},
                {transform:position(switchAt+.001),opacity:0,offset:switchAt+.001},
                {transform:position(1),opacity:0,offset:1}
        ];
        const behindFrames = [
                {transform:position(0,introBox.left,introBox.top),opacity:0,offset:0},
                {transform:position(switchAt,introBox.left,introBox.top),opacity:0,offset:switchAt},
                {transform:position(switchAt+.001,introBox.left,introBox.top),opacity:1,offset:switchAt+.001},
                {transform:position(.96,introBox.left,introBox.top),opacity:1,offset:.96},
                {transform:position(1,introBox.left,introBox.top),opacity:0,offset:1}
        ];
        animation = star.animate(globalFrames, {duration,easing:'linear',fill:'none'});
        behindAnimation = behindStar.animate(behindFrames, {duration,easing:'linear',fill:'none'});
        let flashed = false;
        function watch() {
            if (!animation) return;
            if (!canPlay()) { stop(); schedule(); return; }
            if (!flashed && Number(animation.currentTime) >= duration * hitAt) {
                flashed = true;
                target.classList.add('is-star-lit');
                flashTimer = setTimeout(() => target.classList.remove('is-star-lit'), 350);
            }
            if (animation.playState !== 'finished') frame = requestAnimationFrame(watch);
        }
        animation.onfinish = () => { stop(); schedule(); };
        frame = requestAnimationFrame(watch);
    }
    function reset() { stop(); schedule(2500); }
    small.addEventListener('change', reset);
    reduced.addEventListener('change', reset);
    window.addEventListener('resize', reset, {passive:true});
    window.addEventListener('scroll', () => { if (animation) { stop(); schedule(); } }, {passive:true});
    document.addEventListener('visibilitychange', reset);
    window.addEventListener('pagehide', stop);
    if (window.NextSkillMotion) {
        window.NextSkillMotion.subscribe(state => { allowed = state.ambientAllowed; stop(); if (allowed) schedule(2500); }, {element:scene});
    } else schedule(2500);
})();
