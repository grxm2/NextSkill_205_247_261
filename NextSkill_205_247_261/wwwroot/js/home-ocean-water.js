(() => {
    'use strict';
    const surface = document.querySelector('.ocean-home .ow-water-detail');
    const scene = document.querySelector('.ocean-home .ow-scene');
    if (!surface || !scene) return;

    // One GPU surface deforms local patches of water independently. The image
    // remains underneath as a static fallback; the island and boat are untouched.
    const canvas = document.createElement('canvas');
    canvas.className = 'ow-water-live';
    canvas.setAttribute('aria-hidden', 'true');
    surface.append(canvas);
    const gl = canvas.getContext('webgl', {alpha:false, antialias:false, depth:false, stencil:false, powerPreference:'low-power'});
    if (!gl) { surface.dataset.waterRenderer = 'static'; return; }
    const foam = document.createElement('canvas');
    foam.className = 'ow-water-foam'; foam.setAttribute('aria-hidden', 'true');
    surface.append(foam);
    const ink = foam.getContext('2d');
    const hull = scene.querySelector('.ow-boat-art');
    const vesselMotion = scene.querySelector('.ow-arrival-motion');
    const camera = scene.querySelector('.ow-camera');
    const island = scene.querySelector('.ow-start-land .ow-island-art');
    const sanctum = scene.querySelector('.ow-dock .sanctum-art');
    const sea = surface.closest('.ow-sea');

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia('(width < 768px), (pointer:coarse)');
    const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision ? 'highp' : 'mediump';
    const image = new Image();
    let ready = false, lost = false, suspended = false, frame = 0, viewFrame = 0, previous = 0, lastPaint = 0;
    let seconds = 0, renderedFrames = 0, width = 1, height = 1, program, texture;
    let uniforms;
    const boat = {x:-10,y:-10,beam:1,strength:0,dx:1,dy:0,speed:0};
    // Packets retain world positions, so a camera move carries old foam away
    // from the stern instead of attaching the entire wake to the boat.
    const packets = Array.from({length:48}, () => ({active:false}));
    let cursor = 0, serial = 0, lastEmission = -1, previousBoat = null;
    let velocityX = 0, velocityY = 0, cameraX = 0, sceneX = 0, sceneY = 0, waterX = 0, waterY = 0;
    let cameraLeft = 0, cameraTop = 0, cameraScaleX = 1, cameraScaleY = 1;
    let planeWidth = 1, planeHeight = 1, planeTop = 0;
    const projection = {x:0,y:0,scaleX:1,scaleY:1};
    const coasts = Array.from({length:3}, () => [-100,-100,.001,.001]);
    const vertexSource = `
        attribute vec2 position;
        varying vec2 uv;
        void main() {
            uv = vec2(position.x * .5 + .5, .5 - position.y * .5);
            gl_Position = vec4(position, 0., 1.);
        }`;
    const fragmentSource = `
        precision ${precision} float;
        uniform sampler2D water;
        uniform float time;
        uniform vec2 cropScale;
        uniform vec2 cropOffset;
        uniform vec4 boat;
        uniform vec2 heading;
        uniform vec2 waterSize;
        uniform vec2 worldOffset;
        uniform vec2 worldScale;
        uniform vec4 coast0;
        uniform vec4 coast1;
        uniform vec4 coast2;
        varying vec2 uv;
        float openWater(vec2 point, vec4 coast) {
            return smoothstep(1., 1.35, length((point - coast.xy) / coast.zw));
        }
        void main() {
            // Invert the same camera translation and scale as the land. The
            // painted material has no independent current or depth parallax.
            vec2 world = worldOffset + uv * worldScale;
            float depth = clamp(world.y, 0., 1.);
            float waveDepth = mix(.12, 1., pow(depth, .9));
            // Attached shallows and contact foam stay with the shore; local
            // travelling swells take over gradually beyond the waterline.
            float surfaceMotion = min(openWater(world, coast0),
                min(openWater(world, coast1), openWater(world, coast2)));
            float a = world.x * 29. + world.y * 33. - time * 1.15;
            float b = world.x * 47. - world.y * 24. + time * .83;
            float c = world.x * 78. + world.y * 69. - time * 1.95;
            // Gentler refraction keeps the surface supple while the original
            // wave phases and speed continue to carry visible motion.
            vec2 swell = vec2(sin(a) * .0065 + sin(b) * .0032,
                              cos(a * .83) * .012 + sin(b) * .0048);
            vec2 ripple = vec2(sin(c), cos(c * .91)) * .001;
            // A compressed water plane gives the wake its surface perspective.
            vec2 p = (uv - boat.xy) * waterSize;
            vec2 across = vec2(-heading.y, heading.x);
            float along = dot(p, heading), side = dot(p, across);
            float behind = -along, beam = max(boat.z, 1.);
            float reach = beam * 2.8;
            float tail = smoothstep(-beam * .1, beam * .2, behind)
                       * (1. - smoothstep(reach * .55, reach, behind));
            float arm = beam * .23 + max(0., behind) * .24;
            float armDistance = abs(abs(side) - arm) / max(2., beam * .065);
            float wake = exp(-armDistance * armDistance) * tail * boat.w;
            float bowDistance = (length(vec2(along - beam * .16, side * .85)) - beam * .42) / max(2., beam * .045);
            float bow = exp(-bowDistance * bowDistance)
                      * smoothstep(-beam * .03, beam * .35, along) * boat.w;
            vec2 push = (across * sign(side) * wake + heading * bow) * beam * .045 / waterSize;
            vec2 displaced = world + ((swell + ripple) * waveDepth + push) * surfaceMotion;
            vec2 painted = cropOffset + displaced * cropScale;
            // Manual mirrored addressing works with the existing non-power-of-two
            // artwork in WebGL 1, with no exposed edge on long or reverse voyages.
            painted.x = 1. - abs(mod(painted.x, 2.) - 1.);
            painted.y = clamp(painted.y, .002, .998);
            vec3 color = texture2D(water, painted).rgb;
            // Ease only the pale painted foam: keep the wave volumes crisp,
            // with a restrained (at most 20%) tint toward the surrounding water.
            float whiteCrest = smoothstep(.50, .88, min(color.r, min(color.g, color.b)));
            color = mix(color, vec3(.25, .75, .82), whiteCrest * .20);
            // A light contrast roll-off softens the sculpted painted ridges.
            color = (color - vec3(.5)) * .96 + vec3(.5);
            // Raising the harbor horizon reveals water beyond the painting.
            // Continue it with quiet fine ripples, rather than stretching or
            // mirroring a texture edge into a visible band. World anchoring is
            // unchanged throughout this atmospheric transition.
            float farWater = 1. - smoothstep(-.04, .12, world.y);
            float farRipple = sin(world.x * 41. + world.y * 187. - time * .8) * .6
                            + sin(world.x * 73. - world.y * 253. + time * .6) * .4;
            vec3 distant = vec3(.36, .80, .83) * (1. + farRipple * .025 * surfaceMotion);
            color = mix(color, distant, farWater);
            // Moving slope light makes crests catch and release the reflection.
            float slope = cos(a) * .55 + cos(b) * .3 + cos(c) * .15;
            float gleam = pow(max(0., sin(a * .67 + b * .31)), 8.);
            float lightDepth = waveDepth * (1. - farWater * .8);
            color *= 1. + slope * .050 * lightDepth * surfaceMotion;
            color += vec3(.65, .9, .94) * gleam * .024 * lightDepth * surfaceMotion;
            float foamLight = bow * .22 + wake * (.08 + .035 * sin(behind * .17 - time * 4.));
            color = mix(color, vec3(.88, .99, .96), foamLight);
            gl_FragColor = vec4(color, 1.);
        }`;

    function shader(type, source) {
        const result = gl.createShader(type);
        gl.shaderSource(result, source);
        gl.compileShader(result);
        if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
            gl.deleteShader(result);
            throw new Error('Water shader unavailable');
        }
        return result;
    }
    function stop() {
        cancelAnimationFrame(frame);
        cancelAnimationFrame(viewFrame); viewFrame = 0;
        frame = 0; previous = 0; lastPaint = 0;
        previousBoat = null; velocityX = 0; velocityY = 0;
    }
    function fallback() {
        stop(); ready = false;
        surface.dataset.waterRenderer = 'static';
    }
    function crop() {
        let scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0;
        if (compact.matches) {
            const fit = (planeWidth / planeHeight) / (image.naturalWidth / image.naturalHeight);
            if (fit < 1) { scaleX = fit; offsetX = (1 - fit) * .66; }
            else { scaleY = 1 / fit; offsetY = (1 - scaleY) * .5; }
        }
        gl.uniform2f(uniforms.cropScale, scaleX, scaleY);
        gl.uniform2f(uniforms.cropOffset, offsetX, offsetY);
    }
    function clearWake() {
        packets.forEach(packet => { packet.active = false; });
        previousBoat = null; velocityX = 0; velocityY = 0;
        boat.strength = 0; boat.speed = 0; lastEmission = -1;
        ink?.clearRect(0, 0, foam.width, foam.height);
    }
    function coast(index, element, x, y, radiusX, radiusY) {
        if (!element) return;
        const box = element.getBoundingClientRect();
        coasts[index] = [((box.left + box.width * x - cameraLeft) / cameraScaleX) / planeWidth,
            ((box.top + box.height * y - cameraTop) / cameraScaleY - planeTop) / planeHeight,
            Math.max(.001, box.width * radiusX / cameraScaleX / planeWidth),
            Math.max(.001, box.height * radiusY / cameraScaleY / planeHeight)];
    }
    function measureView() {
        const s = scene.getBoundingClientRect(), c = camera?.getBoundingClientRect(), w = surface.getBoundingClientRect();
        sceneX = s.left; sceneY = s.top; cameraX = c ? c.left - s.left : 0; waterX = w.left; waterY = w.top;
        cameraLeft = c?.left ?? s.left; cameraTop = c?.top ?? s.top;
        cameraScaleX = c && camera.offsetWidth ? c.width / camera.offsetWidth : 1;
        cameraScaleY = c && camera.offsetHeight ? c.height / camera.offsetHeight : 1;
        planeWidth = Math.max(1, scene.clientWidth);
        planeTop = Number(sea.dataset.worldTop ?? sea.offsetTop);
        planeHeight = Math.max(1, scene.clientHeight - planeTop);
        projection.x = (w.left - cameraLeft) / cameraScaleX / planeWidth;
        projection.y = ((w.top - cameraTop) / cameraScaleY - planeTop) / planeHeight;
        projection.scaleX = width / cameraScaleX / planeWidth;
        projection.scaleY = height / cameraScaleY / planeHeight;
        coast(0, island, .49, .79, .43, .115);
        coast(1, sanctum, .05, .86, .43, .10);
        coast(2, sanctum, .91, .86, .35, .10);
        return w;
    }
    function measureBoat(dt) {
        const w = measureView();
        if (!hull || !vesselMotion || !camera) return;
        // Read all moving geometry before writing either canvas.
        const h = hull.getBoundingClientRect(), m = vesselMotion.getBoundingClientRect();
        const x = h.left + h.width * 239 / 480, y = h.top + h.height * 230 / 280;
        const worldX = (x - cameraLeft) / cameraScaleX, worldY = (y - cameraTop) / cameraScaleY;
        // Derive speed from the travel wrapper, excluding the hull's idle roll.
        // The foam attachment still follows the actual immersed hull below.
        const travelY = (m.top + m.height * 230 / 280 - cameraTop) / cameraScaleY;
        const travelX = (m.left + m.width * 239 / 480 - cameraLeft) / cameraScaleX;
        boat.x = (x - w.left) / width; boat.y = (y - w.top) / height;
        boat.beam = Math.max(24, h.width * .38);
        const visible = h.right > 0 && h.left < innerWidth && y > w.top - 10 && y < w.bottom + 20
            && scene.dataset.cvPhase !== 'entering' && scene.dataset.cvPhase !== 'covered';
        if (previousBoat && dt > 0) {
            const dx = travelX - previousBoat.x, dy = travelY - previousBoat.y;
            if (Math.hypot(dx, dy) > Math.max(boat.beam * 3, innerWidth * .35)) clearWake();
            else {
                const follow = 1 - Math.exp(-dt * 7);
                velocityX += (dx / dt - velocityX) * follow;
                velocityY += (dy / dt - velocityY) * follow;
            }
        }
        previousBoat = {x:travelX,y:travelY};
        boat.speed = Math.hypot(velocityX, velocityY * 3);
        const target = visible ? Math.min(1, Math.max(0, (boat.speed - 9) / (boat.beam * 1.7))) : 0;
        boat.strength += (target - boat.strength) * (1 - Math.exp(-dt * 7));
        if (boat.speed > 10) { boat.dx = velocityX / boat.speed; boat.dy = velocityY * 3 / boat.speed; }
        if (dt > 0 && visible && boat.strength > .045 && boat.speed > 12 && seconds - lastEmission >= .075) {
            const packet = packets[cursor]; cursor = (cursor + 1) % packets.length;
            Object.assign(packet, {active:true, x:worldX - boat.dx * boat.beam * .28 / cameraScaleX,
                y:worldY - boat.dy * boat.beam * .28 / 3 / cameraScaleY, born:seconds,
                beam:boat.beam / cameraScaleX, dx:boat.dx, dy:boat.dy, strength:boat.strength,
                spreadRate:Math.min(boat.speed, boat.beam * 10) * .26, seed:serial++});
            lastEmission = seconds;
        }
    }
    function drawFoam() {
        if (!ink) return;
        ink.setTransform(1, 0, 0, 1, 0, 0); ink.clearRect(0, 0, foam.width, foam.height);
        ink.setTransform(foam.width / width, 0, 0, foam.height / height, 0, 0);
        ink.lineCap = 'round'; ink.lineJoin = 'round';
        for (const packet of packets) {
            if (!packet.active) continue;
            const age = seconds - packet.born, lifetime = 3.2;
            if (age >= lifetime) { packet.active = false; continue; }
            const fade = Math.pow(1 - age / lifetime, 1.6) * packet.strength;
            const b = packet.beam * cameraScaleX, spread = b * .19 + age * packet.spreadRate * cameraScaleX, length = b * (.2 + age * .11);
            const y = packet.y * cameraScaleY + cameraTop - waterY;
            const x = packet.x * cameraScaleX + cameraLeft - waterX;
            if (x < -b * 3 || x > width + b * 3 || y < -b || y > height + b) continue;
            ink.save(); ink.translate(x, y);
            ink.transform(packet.dx, packet.dy / 3, -packet.dy, packet.dx / 3, 0, 0);
            // Broken curved edges, rather than a solid white triangle or smoke.
            for (const sign of [-1,1]) {
                ink.beginPath(); ink.moveTo(length * .3, sign * spread * .65);
                ink.bezierCurveTo(0, sign * spread * .86, -length * .55, sign * spread, -length, sign * spread * 1.03);
                ink.strokeStyle = `rgba(48,167,188,${fade * .17})`; ink.lineWidth = 5; ink.stroke();
                ink.strokeStyle = `rgba(225,255,247,${fade * .6})`; ink.lineWidth = 1.8; ink.stroke();
            }
            for (let i = 0; i < 5; i++) {
                const seed = packet.seed * 1.71 + i * 2.39;
                const px = -length * (.15 + (Math.sin(seed) * .5 + .5) * .8);
                const py = Math.cos(seed * 1.37) * spread * .8;
                ink.beginPath(); ink.ellipse(px, py, b * (.006 + .003 * Math.sin(seed)), b * .009, 0, 0, Math.PI * 2);
                ink.fillStyle = `rgba(234,255,248,${fade * .45})`; ink.fill();
            }
            ink.restore();
        }
        if (boat.strength > .025) {
            const b = boat.beam;
            ink.save(); ink.translate(boat.x * width, boat.y * height);
            ink.transform(boat.dx, boat.dy / 3, -boat.dy, boat.dx / 3, 0, 0);
            ink.beginPath(); ink.moveTo(b * .14, -b * .45);
            ink.bezierCurveTo(b * .64, -b * .28, b * .64, b * .28, b * .14, b * .45);
            ink.strokeStyle = `rgba(229,255,246,${boat.strength * .66})`; ink.lineWidth = 2.2; ink.stroke();
            ink.restore();
        }
    }
    function draw(at = seconds) {
        if (!ready || lost) return;
        gl.useProgram(program);
        gl.uniform1f(uniforms.time, at);
        gl.uniform4f(uniforms.boat, boat.x, boat.y, boat.beam, boat.strength);
        gl.uniform2f(uniforms.heading, boat.dx, boat.dy);
        gl.uniform2f(uniforms.waterSize, width, height * 3);
        gl.uniform2f(uniforms.worldOffset, projection.x, projection.y);
        gl.uniform2f(uniforms.worldScale, projection.scaleX, projection.scaleY);
        coasts.forEach((coast,index) => gl.uniform4fv(uniforms.coasts[index], coast));
        crop();
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        drawFoam();
        renderedFrames++;
    }
    function resize() {
        const box = surface.getBoundingClientRect();
        const nextCssWidth = Math.max(1, box.width);
        if (Math.abs(width - nextCssWidth) > 1) clearWake();
        width = nextCssWidth; height = Math.max(1, box.height);
        // The water occupies only the lower scene. Limit its pixel budget on
        // high-DPI devices rather than rendering a full-screen effect at 3x.
        const ratio = Math.min(devicePixelRatio || 1, compact.matches ? 1.2 : 1.5, 2048 / width);
        const nextWidth = Math.max(1, Math.round(width * ratio));
        const nextHeight = Math.max(1, Math.round(height * ratio));
        if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
            canvas.width = nextWidth; canvas.height = nextHeight;
            foam.width = nextWidth; foam.height = nextHeight;
            gl.viewport(0, 0, nextWidth, nextHeight);
        }
        measureBoat(0); draw();
    }
    function syncView() {
        // Pausing ambient waves freezes time, but a user can still scroll the
        // camera. Reproject the same frozen material once per rendered view.
        if (frame || viewFrame || !ready || lost || suspended || document.hidden || reduced.matches) return;
        viewFrame = requestAnimationFrame(() => { viewFrame = 0; measureBoat(0); draw(); });
    }
    function permitted() {
        if (!ready || lost || suspended || reduced.matches || document.hidden) return false;
        const policy = window.NextSkillMotion?.snapshot({element:scene, kind:'ambient'});
        return policy ? policy.ambientAllowed : !document.querySelector('dialog[open]');
    }
    function tick(now) {
        frame = 0;
        if (!permitted()) { previous = 0; return; }
        const dt = previous ? Math.min((now - previous) / 1000, .05) : 0;
        if (previous) seconds += dt;
        previous = now;
        const interval = 1000 / 60;
        if (!lastPaint || now - lastPaint >= interval) {
            measureBoat(previousBoat ? Math.max(dt, (now - lastPaint) / 1000) : 0);
            draw();
            lastPaint = now - ((now - lastPaint) % interval);
        }
        frame = requestAnimationFrame(tick);
    }
    function sync() {
        surface.dataset.waterRenderer = ready && !lost && !reduced.matches ? 'webgl' : 'static';
        if (!permitted()) { stop(); if (reduced.matches) clearWake(); return; }
        if (!frame) { previousBoat = null; frame = requestAnimationFrame(tick); }
    }
    function initialize() {
        if (!image.naturalWidth || lost) return;
        try {
            const vertex = shader(gl.VERTEX_SHADER, vertexSource);
            const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
            program = gl.createProgram();
            gl.attachShader(program, vertex); gl.attachShader(program, fragment);
            gl.linkProgram(program);
            gl.deleteShader(vertex); gl.deleteShader(fragment);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Water renderer unavailable');
            gl.useProgram(program);
            const vertices = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
            const position = gl.getAttribLocation(program, 'position');
            gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
            uniforms = {
                time:gl.getUniformLocation(program, 'time'), cropScale:gl.getUniformLocation(program, 'cropScale'),
                cropOffset:gl.getUniformLocation(program, 'cropOffset')
            };
            uniforms.boat = gl.getUniformLocation(program, 'boat');
            uniforms.heading = gl.getUniformLocation(program, 'heading');
            uniforms.waterSize = gl.getUniformLocation(program, 'waterSize');
            uniforms.worldOffset = gl.getUniformLocation(program, 'worldOffset');
            uniforms.worldScale = gl.getUniformLocation(program, 'worldScale');
            uniforms.coasts = [0,1,2].map(index => gl.getUniformLocation(program, `coast${index}`));
            texture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
            gl.uniform1i(gl.getUniformLocation(program, 'water'), 0);
            ready = true;
            resize(); sync();
        } catch { fallback(); }
    }
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; fallback(); });
    canvas.addEventListener('webglcontextrestored', () => { lost = false; initialize(); });
    image.addEventListener('load', initialize, {once:true});
    image.addEventListener('error', fallback, {once:true});
    image.src = '/images/journey/home-ocean-painted-v2.webp';
    new ResizeObserver(resize).observe(surface);
    compact.addEventListener('change', resize);
    reduced.addEventListener('change', sync);
    window.NextSkillMotion?.subscribe(sync, {element:scene, kind:'ambient'});
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('nextskill:ocean-view', syncView);
    window.addEventListener('pagehide', () => { suspended = true; stop(); });
    window.addEventListener('pageshow', () => { suspended = false; resize(); sync(); });

    if (scene.querySelector('[data-ocean-life]')?.dataset.development === 'true') {
        window.NextSkillHomeWaterTest = Object.freeze({
            snapshot:() => ({renderer:surface.dataset.waterRenderer, running:!!frame, seconds, renderedFrames, width:canvas.width, height:canvas.height,
                view:{cameraX,travel:-cameraX / width,projection:{...projection},coasts:coasts.map(coast => [...coast])},
                wake:{speed:boat.speed,strength:boat.strength,dx:boat.dx,dy:boat.dy,active:packets.filter(packet=>packet.active).length,emitted:serial,capacity:packets.length}}),
            // Read a small GPU sample only when explicitly requested by scenery QA.
            pixels:() => {
                if (!ready || lost) return [];
                draw();
                const colors = [];
                for (const y of [.15,.4,.65,.85]) for (const x of [.1,.3,.5,.7,.9]) {
                    const pixel = new Uint8Array(4);
                    gl.readPixels(Math.floor(canvas.width*x), Math.floor(canvas.height*y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
                    colors.push(...pixel);
                }
                return colors;
            },
            // Freeze the clock through NextSkillMotion before sampling view changes.
            surfacePixels:(points) => {
                if (!ready || lost) return [];
                draw();
                return points.map(([x,y]) => {
                    const pixel = new Uint8Array(4);
                    gl.readPixels(Math.min(canvas.width-1, Math.max(0, Math.floor(canvas.width*x))),
                        Math.min(canvas.height-1, Math.max(0, Math.floor(canvas.height*(1-y)))), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
                    return [...pixel];
                });
            }
        });
    }
})();
