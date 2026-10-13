// Screenshot-Helfer für die visuelle Verifikation (nutzt das lokale Chrome, GPU-beschleunigt).
// Aufruf: node scripts/shot.mjs <out.png> [--w 1440 --h 900 --url http://localhost:5199 --eval "<js>" --wait 4000 --panel 0]
import { chromium } from 'playwright-core';

const a = process.argv.slice(2);
const out = a[0] ?? 'shot.png';
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const w = +opt('w', 1440), h = +opt('h', 900), url = opt('url', 'http://localhost:5199');
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: +opt('dpr', 1) });
page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) || m.text().includes('[perf]')) console.log('[console]', m.type(), m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url);
await page.waitForSelector('.loader.done', { timeout: 120000, state: 'attached' });
await page.waitForTimeout(+opt('wait', 3000));
const ev = opt('eval', '');
if (ev) { await page.evaluate(ev); await page.waitForTimeout(+opt('wait2', 2500)); }
if (opt('panel', '1') === '0') { await page.evaluate(() => { document.querySelector('.panel-handle')?.click(); }); await page.waitForTimeout(1200); }
await page.screenshot({ path: out });
await browser.close();
console.log('ok', out);
