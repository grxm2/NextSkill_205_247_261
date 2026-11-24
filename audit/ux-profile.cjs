const { chromium } = require('../artifacts/home-hero-qa/node_modules/playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const origin = 'http://127.0.0.1:52791';
const samples = [
    ['/Home/Index', 360],
    ['/Home/Index', 768],
    ['/Home/Index', 1280],
    ['/Home/Index', 1920],
    ['/Home/Courses', 360],
    ['/Home/Details/101', 360],
    ['/Account/Login', 360],
    ['/Learning/Island?courseId=101', 1280],
    ['/Home/Index', 1280, 'reduce'],
    ['/Learning/Island?courseId=101', 1280, 'reduce'],
];

async function measure(browser, [route, width, reducedMotion = 'no-preference']) {
    const context = await browser.newContext({ serviceWorkers: 'block', reducedMotion, viewport: { width, height: 900 } });
    await context.route('**/*', request => new URL(request.request().url()).origin === origin ? request.continue() : request.abort());
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const readMetrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(item => [item.name, item.value]));
    await page.goto(origin + route, { waitUntil: 'load' });
    await new Promise(resolve => setTimeout(resolve, 1700));
    const before = await readMetrics();
    await new Promise(resolve => setTimeout(resolve, 1800));
    const after = await readMetrics();
    const metrics = ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount'];
    const delta = (start, end) => Object.fromEntries(metrics.map(key => [key, +(end[key] - start[key]).toFixed(4)]));
    const resting = delta(before, after);
    const scrollStart = await readMetrics();
    await page.evaluate(() => new Promise(resolve => {
        const started = performance.now();
        function step(now) {
            const fraction = Math.min(1, (now - started) / 1800);
            scrollTo(0, Math.round(fraction * (document.documentElement.scrollHeight - innerHeight)));
            if (fraction === 1) resolve();
            else requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }));
    const scrolling = delta(scrollStart, await readMetrics());
    const layout = await page.evaluate(() => ({
        viewport: innerWidth,
        root: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        height: document.documentElement.scrollHeight,
        styleSheets: document.styleSheets.length,
        blurElements: [...document.querySelectorAll('*')].filter(el => el.getClientRects().length && getComputedStyle(el).backdropFilter !== 'none').length
    }));
    const button = page.locator('button[data-theme-toggle]:visible').first();
    let theme;
    if (await button.count()) {
        await button.click();
        await page.waitForFunction(() => localStorage.getItem('nextskill.theme.v1') === 'dark');
        await page.reload({ waitUntil: 'load' });
        theme = await page.evaluate(() => ({ stored: localStorage.getItem('nextskill.theme.v1'), afterReload: document.documentElement.dataset.theme }));
    }
    const file = route.includes('Island') ? 'island' : route.split('/').at(-1).toLowerCase();
    if (reducedMotion === 'no-preference') await page.screenshot({ path: path.join(__dirname, 'screenshots', `styled-${file}-${width}.png`) });
    await context.close();
    return { route, width, reducedMotion, windowMilliseconds: 1800, resting, scrolling, layout, theme };
}

(async () => {
    const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    const browser = await chromium.launch({
        executablePath,
        headless: true,
        args: ['--disable-background-networking', '--disable-component-update', '--disable-sync',
            '--disable-domain-reliability', '--no-first-run', '--no-default-browser-check'],
    });
    const result = [];
    try {
        for (const sample of samples) {
            try {
                result.push(await measure(browser, sample));
            } catch (error) {
                result.push({ sample, error: String(error.message).split('\n')[0] });
            }
        }
    } finally {
        await browser.close();
        fs.writeFileSync(path.join(__dirname, 'ux-profile.json'), JSON.stringify(result, null, 2));
    }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
