const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const root = path.resolve('artifacts/ux-baseline'); fs.mkdirSync(root, { recursive: true });
  const browser = await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const context = await browser.newContext({ viewport:{width:1440,height:1000} });
  const page = await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const checks=[];
  for (const [name, route] of [['home','/Home/Index'],['courses','/Home/Courses'],['details','/Home/Details/1'],['enrollment','/Courses/Enrollment'],['login','/Account/Login'],['register','/Account/Register'],['privacy','/Home/Privacy']]) {
    const response = await page.goto('http://127.0.0.1:5299'+route); await page.waitForTimeout(350);
    await page.screenshot({path:path.join(root,name+'-1440.png'),fullPage:true});
    checks.push({name,status:response.status(),title:await page.title(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  }
  for(const width of [360,390,768,1024]) {
    await page.setViewportSize({width,height:900}); await page.goto('http://127.0.0.1:5299/Home/Index'); await page.waitForTimeout(250);
    await page.screenshot({path:path.join(root,'home-'+width+'.png'),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000}); await page.goto('http://127.0.0.1:5299/Home/Index');
  const state = await page.evaluate(async()=> { const r=await fetch('/Learning/State');return {status:r.status,body:(await r.text()).slice(0,300)}; });
  fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({checks,errors,learningState:state},null,2));
  console.log(JSON.stringify({checks,errors,learningState:state}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
