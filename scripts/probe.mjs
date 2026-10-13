import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
const page = await browser.newPage();
await page.goto('http://localhost:5199/?intro=0');
await page.waitForSelector('.loader.done', { state: 'attached', timeout: 120000 });
console.log(await page.evaluate(process.argv[2]));
await browser.close();
