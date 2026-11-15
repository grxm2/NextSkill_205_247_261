// Read-only checks for the remodeled landmark, canal geometry, and responsive scene.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('playwright-core')); }
const base = process.env.NEXTSKILL_TEST_URL || 'http://127.0.0.1:5205';
const output = path.resolve('artifacts/sanctum-qa');
fs.mkdirSync(output, { recursive: true });
(async () => {
    const browser = await chromium.launch({headless:true, executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
    const page = await browser.newPage();
    const errors = [], checks = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
        for (const [width, height] of [[320,800], [390,844], [768,1024], [1024,768], [1440,900]]) {
            await page.setViewportSize({width,height});
            await page.goto(base + '/Home/Index', {waitUntil:'networkidle'});
            assert.equal(await page.locator('.ow-dock .sanctum-art').count(), 1);
            assert.ok((await page.locator('.ow-harbor').boundingBox()).x >= width * 2.2, 'The destination remains beyond the original sea journey');
            // Inspect the asset before sailing so decoding this QA-only canvas
            // cannot race the real MVC navigation at the end of portal entry.
            const scene = await page.evaluate(async () => {
                const model = document.querySelector('.ow-dock .knowledge-sanctum');
                const gate = model.getBoundingClientRect(), boat = document.querySelector('.ow-vessel').getBoundingClientRect();
                const svg = model.querySelector('svg.sanctum-art').cloneNode(true);
                // Inline external resources only in the QA copy, so the canvas
                // samples the same composed illustration without SVG image restrictions.
                for (const resource of svg.querySelectorAll('image')) {
                    const response = await fetch(resource.getAttribute('href'));
                    const data = await response.blob();
                    resource.setAttribute('href', await new Promise(resolve => {
                        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(data);
                    }));
                }
                const blob = new Blob([new XMLSerializer().serializeToString(svg)], {type:'image/svg+xml'});
                const url = URL.createObjectURL(blob), image = new Image(); image.src = url;
                await image.decode();
                const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 700;
                const context = canvas.getContext('2d'); context.drawImage(image,0,0,800,700);
                URL.revokeObjectURL(url);
                return {
                    canal: gate.left + gate.width * Number(model.dataset.portalX), boat: boat.left + boat.width * .5,
                    gate: {left:gate.left,right:gate.right,top:gate.top,bottom:gate.bottom},
                    cornerAlpha: context.getImageData(0,0,1,1).data[3],
                    portalAlpha: [370,460,490].flatMap(y => [420,450,480].map(x => context.getImageData(x,y,1,1).data[3])),
                    approachAlpha: [620,650,680].map(y => context.getImageData(450,y,1,1).data[3]),
                    baseAlpha: context.getImageData(250,585,1,1).data[3],
                    overflow: document.documentElement.scrollWidth > innerWidth + 1
                };
            });
            await page.locator('[data-catalog-voyage]').click();
            await page.locator('#catalog-voyage').waitFor({state:'visible'});
            Object.assign(scene, await page.evaluate(() => {
                const model = document.querySelector('.ow-dock .knowledge-sanctum');
                const gate = model.getBoundingClientRect(), boat = document.querySelector('.ow-vessel').getBoundingClientRect();
                return {canal:gate.left + gate.width * Number(model.dataset.portalX),boat:boat.left + boat.width * .5,
                    gate:{left:gate.left,right:gate.right,top:gate.top,bottom:gate.bottom}};
            }));
            assert.equal(scene.overflow, false);
            assert.equal(scene.cornerAlpha, 0, 'The image is truly transparent');
            assert.deepEqual(scene.portalAlpha,Array(9).fill(255), 'The dimensional portal conceals the sea and horizon behind the entire opening');
            assert.deepEqual(scene.approachAlpha,[0,0,0], 'No painted pool remains: the central approach shows the actual ocean');
            assert.ok(scene.baseAlpha > 0, 'The side foundation reaches the waterline');
            assert.ok(scene.canal > width * .4 && scene.canal < width * .65, 'The asymmetric island keeps its entrance in the central viewing area');
            assert.ok(Math.abs(scene.canal - scene.boat) < 3, 'The boat follows the open canal');
            assert.ok(scene.gate.left >= -1 && scene.gate.right <= width + 1, 'The building fits the viewport');
            assert.ok(scene.gate.top >= 0 && scene.gate.bottom <= height + 1, 'The building is not clipped vertically');
            await page.screenshot({path:path.join(output,`sanctuary-${width}.png`)});
            await page.waitForTimeout(800);
            await page.screenshot({path:path.join(output,`canal-entry-${width}.png`)});
            await page.waitForURL('**/Home/Courses');
            await page.waitForFunction(() => document.querySelector('#catalog-voyage').hidden);
            assert.equal(await page.locator('.catalog-harbor .sanctum-art').count(),1);
            assert.equal(await page.locator('.catalog-boat-nimo #nextskill-agent').count(),1);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            await page.screenshot({path:path.join(output,`catalog-${width}.png`)});
            checks.push({width,height,passed:true,canalX:scene.canal,boatX:scene.boat});
            console.log(`PASS ${width}×${height}: original travel, opaque portal, live foreground, aligned boat and catalog arrival`);
        }
        assert.deepEqual(errors,[]);
        fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({checks,errors},null,2));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
