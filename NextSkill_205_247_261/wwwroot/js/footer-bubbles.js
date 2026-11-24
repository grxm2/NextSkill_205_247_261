(() => {
    const footerSelector = '.ns-site-footer, .sj-footer, #nextskill-home footer';
    const bubbles = [
        [4, 15, 14, -4, 0, .48], [7.5, 13, 12, 5, -10, .45], [11, 19, 15, 7, -8, .42],
        [18, 14, 11, -6, -4, .52], [21.5, 16, 13, 4, -13, .43], [25, 18, 14, 5, -12, .44],
        [32, 15, 12, -8, -3, .50], [35.5, 13, 10, 6, -9, .46], [39, 21, 15, 6, -15, .40],
        [46, 14, 11, -5, -7, .52], [49.5, 17, 13, 7, -12, .42], [53, 19, 12, 8, -11, .43],
        [60, 15, 14, -7, -2, .48], [63.5, 13, 10, 5, -14, .44], [67, 21, 15, 5, -14, .40],
        [74, 14, 11, -6, -6, .50], [77.5, 18, 13, 6, -11, .41], [81, 18, 14, 7, -10, .44],
        [88, 15, 12, -5, -1, .49], [91.5, 13, 10, 5, -8, .46], [95, 19, 15, 6, -13, .41]
    ];

    function addBubbles(footer) {
        if (footer.querySelector('.ns-footer-bubbles')) return;

        footer.classList.add('ns-footer-bubble-host');
        const layer = document.createElement('div');
        layer.className = 'ns-footer-bubbles';
        layer.setAttribute('aria-hidden', 'true');

        function burstBubble(clientX, clientY) {
            const layerRect = layer.getBoundingClientRect();
            const originX = clientX - layerRect.left;
            const originY = clientY - layerRect.top;
            const fragmentCount = 10;

            for (let index = 0; index < fragmentCount; index++) {
                const angle = Math.PI + .12 + ((Math.PI - .24) * index / (fragmentCount - 1)) + (Math.random() - .5) * .12;
                const distance = 18 + Math.random() * 24;
                const fragment = document.createElement('span');
                fragment.className = 'ns-footer-bubble-fragment';
                fragment.style.left = `${originX}px`;
                fragment.style.top = `${originY}px`;
                fragment.style.setProperty('--fragment-x', `${Math.cos(angle) * distance}px`);
                fragment.style.setProperty('--fragment-y', `${Math.sin(angle) * distance}px`);
                fragment.style.setProperty('--fragment-duration', `${360 + Math.random() * 140}ms`);
                layer.appendChild(fragment);
                window.setTimeout(() => fragment.remove(), 600);
            }
        }

        for (const [left, size, duration, drift, delay, alpha] of bubbles) {
            const bubble = document.createElement('span');
            bubble.className = 'ns-footer-bubble';
            bubble.style.setProperty('--bubble-left', `${left}%`);
            bubble.style.setProperty('--bubble-size', `${size}px`);
            bubble.style.setProperty('--bubble-duration', `${duration}s`);
            bubble.style.setProperty('--bubble-drift', `${drift}px`);
            bubble.style.setProperty('--bubble-delay', `${delay}s`);
            bubble.style.setProperty('--bubble-alpha', alpha);
            bubble.addEventListener('click', event => {
                if (bubble.classList.contains('is-popping')) return;
                bubble.classList.add('is-popping');
                burstBubble(event.clientX, event.clientY);
                window.setTimeout(() => {
                    bubble.style.setProperty('--bubble-delay', '0s');
                    bubble.classList.remove('is-popping');
                }, 420);
            });
            layer.appendChild(bubble);
        }

        footer.prepend(layer);
    }

    function initialize() {
        document.querySelectorAll(footerSelector).forEach(addBubbles);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
